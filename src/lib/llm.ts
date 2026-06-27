import { z } from "zod";
import { generateObject, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { CATEGORY_KEYS } from "./categories";
import { categoriseByRules } from "./categoriser/rules";
import { CATEGORISER_SYSTEM, CATEGORISER_FEWSHOT } from "./categoriser/prompt";
import { registerLiveCategoriser, type CacheStats, type LiveCategoriseOutput } from "./cadence/categorise";
import { cacheKey, getCatCache } from "./categoriser/cache";
import { buildRationale } from "./rationale";
import type { DecisionPackage } from "./engine";
import type { EvalCase, EvalResult } from "./eval";
import type { CategorisedTransaction, Transaction } from "./types";

/**
 * LLM provider abstraction. Gemini 2.5 Flash via the Vercel AI SDK in the demo;
 * swappable for a local model in dev. The model does two jobs only —
 * transaction categorisation and a grounded rationale — and every call has a
 * deterministic fallback so the product degrades gracefully and always says
 * which path ran. The credit decision itself is never made by the model.
 */

const MODEL_ID = "gemini-2.5-flash";
const apiKey = process.env.GEMINI_API_KEY;

/**
 * Cap concurrent Gemini requests. The free tier is only a handful of requests
 * per minute, so firing one request per 40-transaction batch all at once
 * (e.g. ~24 at once for the full eval set) trips a 429 quota error and the
 * whole run falls back to rules. Throttling keeps bursts under the limit.
 */
const GEMINI_MAX_CONCURRENCY = 3;

/** Run `fn` over `items` with at most `limit` in flight at a time. */
async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

export function llmConfigured(): boolean {
  return Boolean(apiKey);
}

function model() {
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
  const google = createGoogleGenerativeAI({ apiKey });
  return google(MODEL_ID);
}

// ---- categorisation ----

const categorySchema = z.object({
  items: z.array(
    z.object({
      index: z.number().int(),
      category: z.enum(CATEGORY_KEYS),
      subcategory: z.string(),
      confidence: z.number().min(0).max(1),
      isIncome: z.boolean(),
      isRecurring: z.boolean(),
      isObligation: z.boolean(),
    }),
  ),
});

const SYSTEM = CATEGORISER_SYSTEM;
const FEW_SHOT = CATEGORISER_FEWSHOT;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Live Gemini categoriser. Throws on any failure so callers fall back to rules. */
export async function categoriseWithGemini(
  txns: Transaction[],
): Promise<CategorisedTransaction[]> {
  const m = model();
  const out: CategorisedTransaction[] = new Array(txns.length);

  await mapLimit(
    chunk(txns.map((t, i) => ({ t, i })), 40),
    GEMINI_MAX_CONCURRENCY,
    async (group) => {
      const lines = group
        .map(({ t, i }) => `${i}: "${t.description}" amount ${t.amount.toFixed(2)} EUR (${t.direction})`)
        .join("\n");
      const { object } = await generateObject({
        model: m,
        schema: categorySchema,
        temperature: 0.1,
        system: SYSTEM,
        prompt: `${FEW_SHOT}\n\nCategorise these ${group.length} transactions:\n${lines}`,
      });
      const byIndex = new Map(object.items.map((it) => [it.index, it]));
      for (const { t, i } of group) {
        const r = byIndex.get(i);
        out[i] = r
          ? {
              ...t,
              categorisation: {
                category: r.category,
                subcategory: r.subcategory,
                confidence: r.confidence,
                isIncome: r.isIncome,
                isRecurring: r.isRecurring,
                isObligation: r.isObligation,
              },
              source: "gemini",
            }
          : { ...t, categorisation: categoriseByRules(t), source: "rules" };
      }
    },
  );

  return out;
}

/**
 * Cache-aware live categoriser. Looks every line up in the persistent cache
 * first, sends only the misses to Gemini, then writes the fresh model labels
 * back. Re-running over an already-seen statement is a 100% cache hit and makes
 * zero model calls. Only genuine model outputs are persisted — lines that fell
 * back to rules inside categoriseWithGemini are never cached as if they were
 * the model's answer. If the model call for the misses throws, the whole run
 * throws so the caller falls back to the rules baseline (same as before).
 */
export async function categoriseWithGeminiCached(
  txns: Transaction[],
): Promise<LiveCategoriseOutput> {
  const cache = getCatCache();
  const keys = txns.map(cacheKey);
  const cached = await cache.getMany(keys);

  const out: CategorisedTransaction[] = new Array(txns.length);
  const misses: { t: Transaction; i: number }[] = [];
  txns.forEach((t, i) => {
    const hit = cached.get(keys[i]);
    if (hit) out[i] = { ...t, categorisation: hit, source: "gemini" };
    else misses.push({ t, i });
  });

  if (misses.length) {
    const fresh = await categoriseWithGemini(misses.map((m) => m.t));
    const toPersist: { key: string; categorisation: CategorisedTransaction["categorisation"] }[] = [];
    fresh.forEach((cat, j) => {
      const { i } = misses[j];
      out[i] = cat;
      // only persist real model outputs, never per-line rules fallbacks
      if (cat.source === "gemini") toPersist.push({ key: keys[i], categorisation: cat.categorisation });
    });
    if (toPersist.length) await cache.putMany(toPersist, MODEL_ID);
  }

  return {
    transactions: out,
    cache: { hits: txns.length - misses.length, misses: misses.length, store: cache.kind },
  };
}

// register so the cadence categorise() gemini path is wired without a hard dep
registerLiveCategoriser(categoriseWithGeminiCached);

// ---- live evaluation (Gemini over a labelled sample) ----

/**
 * One Gemini batch. The live eval runs a representative SAMPLE rather than all
 * ~900 labelled lines: the free tier only allows a few requests per minute, so
 * a full live eval would burst far past the limit and fail. Cached results make
 * re-runs free. The rules baseline (shown on load) still scores the full set.
 */
const LIVE_EVAL_SAMPLE = 40;

/** Deterministic sample: every hard case + a spread across the seeded set. */
function sampleEvalCases(cases: EvalCase[], max: number): EvalCase[] {
  const hard = cases.filter((c) => c.isHard);
  const seeded = cases.filter((c) => !c.isHard);
  const need = Math.max(0, max - hard.length);
  if (need === 0 || seeded.length === 0) return [...hard, ...seeded].slice(0, max);
  const stride = Math.max(1, Math.floor(seeded.length / need));
  const picked: EvalCase[] = [];
  for (let i = 0; i < seeded.length && picked.length < need; i += stride) picked.push(seeded[i]);
  return [...hard, ...picked];
}

export interface LiveEvalResult {
  result: EvalResult;
  source: "gemini" | "rules";
  fellBack?: boolean;
  error?: string;
  /** True when only a sample of the labelled set was scored live. */
  sampled?: boolean;
  sampleSize?: number;
  totalAvailable?: number;
  cache?: CacheStats;
}

export async function evaluateWithGemini(): Promise<LiveEvalResult> {
  const { getEvalCases, scoreCases, baselineEval } = await import("./eval");
  if (!llmConfigured()) {
    return { result: baselineEval(), source: "rules", fellBack: true };
  }
  const all = getEvalCases();
  const sample = sampleEvalCases(all, LIVE_EVAL_SAMPLE);
  try {
    const { transactions, cache } = await categoriseWithGeminiCached(sample.map((c) => c.transaction));
    const result = scoreCases(sample, transactions.map((t) => t.categorisation));
    return {
      result,
      source: "gemini",
      sampled: sample.length < all.length,
      sampleSize: sample.length,
      totalAvailable: all.length,
      cache,
    };
  } catch (err) {
    return {
      result: baselineEval(),
      source: "rules",
      fellBack: true,
      error: err instanceof Error ? err.message : "Live evaluation failed",
    };
  }
}

// ---- grounded rationale ----

export interface RationaleResult {
  text: string;
  source: "gemini" | "rules";
  fellBack?: boolean;
}

export async function generateRationale(
  d: DecisionPackage,
  applicantName: string,
): Promise<RationaleResult> {
  const grounded = buildRationale(d, applicantName);
  if (!llmConfigured()) return { text: grounded, source: "rules" };

  try {
    const figures = {
      outcome: d.outcomeLabel,
      netMonthlyIncome: d.income.monthlyNet,
      livingAllowance: d.haushalt.livingAllowance,
      rent: d.haushalt.rent,
      existingObligations: d.haushalt.obligations,
      availableIncome: d.haushalt.available,
      proposedInstalment: d.instalment,
      affordabilityBuffer: d.product.affordabilityBuffer,
      dti: Number((d.dti * 100).toFixed(1)),
      maxDti: d.product.maxDti * 100,
      incomeStabilityPct: Math.round(d.income.stability * 100),
      tenureMonths: d.income.tenureMonths,
      rules: d.rules.map((r) => ({ rule: r.label, status: r.status })),
      conditions: d.conditions,
      recommendedLimit: d.recommendedLimit,
    };
    const { text } = await generateText({
      model: model(),
      temperature: 0.3,
      system:
        "You write a short, plain-language lending decision rationale for a loan officer. " +
        "Ground every statement strictly in the JSON figures provided. Do not invent numbers or facts. " +
        "Do not use second-person marketing voice. 3-5 sentences. State the outcome and the key reasons.",
      prompt: `Decision figures:\n${JSON.stringify(figures, null, 2)}`,
    });
    return { text: text.trim(), source: "gemini" };
  } catch {
    return { text: grounded, source: "rules", fellBack: true };
  }
}
