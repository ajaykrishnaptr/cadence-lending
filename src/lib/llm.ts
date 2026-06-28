import { z } from "zod";
import { generateObject, generateText, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
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
 * LLM provider abstraction with FAILOVER. The model does two jobs only —
 * transaction categorisation and a grounded rationale — and every call has a
 * deterministic rules fallback so the product degrades gracefully and always
 * says which path ran. The credit decision itself is never made by the model.
 *
 * Providers are tried in priority order per call: Groq (GPT-OSS 120B) first for
 * reliability, then Gemini 2.5 Flash if Groq errors. (Gemini's free tier quota-caps
 * quickly, so it sits behind the more dependable Groq path.) If every provider fails
 * the caller falls back to the deterministic rules baseline. The provider that
 * actually answered is surfaced to the UI and audit trail.
 */

const GEMINI_MODEL_ID = "gemini-2.5-flash";
// gpt-oss-120b supports strict json_schema structured outputs on Groq (the
// llama-3.3-70b model only does json_object, which generateObject rejects).
const GROQ_MODEL_ID = "openai/gpt-oss-120b";

interface Provider {
  /** Short id surfaced in the UI/audit. */
  name: "gemini" | "groq";
  /** Human label, e.g. "Gemini 2.5 Flash". */
  label: string;
  modelId: string;
  model: LanguageModel;
}

let providersCache: Provider[] | undefined;

/** Built once, lazily, so dotenv-injected env (scripts/tests) is picked up. */
function providers(): Provider[] {
  if (providersCache) return providersCache;
  const chain: Provider[] = [];
  // Groq first: reliable + fast, and unaffected by Gemini's free-tier quota caps.
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    chain.push({ name: "groq", label: "GPT-OSS 120B (Groq)", modelId: GROQ_MODEL_ID, model: groq(GROQ_MODEL_ID) });
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    chain.push({ name: "gemini", label: "Gemini 2.5 Flash", modelId: GEMINI_MODEL_ID, model: google(GEMINI_MODEL_ID) });
  }
  providersCache = chain;
  return chain;
}

export function llmConfigured(): boolean {
  return providers().length > 0;
}

/**
 * Run an AI SDK call against each provider in turn, returning the first success
 * plus which provider answered. Throws the last error only if all fail.
 */
async function withFailover<T>(
  run: (model: LanguageModel) => Promise<T>,
): Promise<{ value: T; provider: Provider }> {
  const chain = providers();
  if (chain.length === 0) throw new Error("No LLM provider configured (set GEMINI_API_KEY and/or GROQ_API_KEY)");
  let lastErr: unknown;
  for (const p of chain) {
    try {
      return { value: await run(p.model), provider: p };
    } catch (err) {
      lastErr = err;
      // fall through to the next provider (e.g. Gemini rate-limited -> Groq)
    }
  }
  throw lastErr;
}

/**
 * Cap concurrent live requests in flight. Free tiers allow only a handful of
 * requests per minute, so firing one request per 40-transaction batch all at
 * once (e.g. ~24 at once for the full eval set) trips a 429 and the whole run
 * fails over / falls back. Throttling keeps bursts under the limit.
 */
const LLM_MAX_CONCURRENCY = 3;

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

export interface RawCategoriseOutput {
  transactions: CategorisedTransaction[];
  /** Human label of the provider(s) that answered, e.g. "Gemini 2.5 Flash". */
  modelLabel?: string;
  /** Single model id when one provider answered (cache provenance); "mixed" otherwise. */
  modelId?: string;
}

/**
 * Live categoriser with provider failover. Each batch tries Gemini then Groq;
 * throws only if every provider fails (so callers fall back to rules). Reports
 * which provider(s) actually answered.
 */
export async function categoriseWithGemini(
  txns: Transaction[],
): Promise<RawCategoriseOutput> {
  const out: CategorisedTransaction[] = new Array(txns.length);
  const usedNames = new Set<string>();
  const usedLabels = new Set<string>();
  let lastModelId: string | undefined;

  await mapLimit(
    chunk(txns.map((t, i) => ({ t, i })), 40),
    LLM_MAX_CONCURRENCY,
    async (group) => {
      const lines = group
        .map(({ t, i }) => `${i}: "${t.description}" amount ${t.amount.toFixed(2)} EUR (${t.direction})`)
        .join("\n");
      const { value, provider } = await withFailover((m) =>
        generateObject({
          model: m,
          schema: categorySchema,
          temperature: 0.1,
          system: SYSTEM,
          prompt: `${FEW_SHOT}\n\nCategorise these ${group.length} transactions:\n${lines}`,
        }),
      );
      usedNames.add(provider.name);
      usedLabels.add(provider.label);
      lastModelId = provider.modelId;
      const byIndex = new Map(value.object.items.map((it) => [it.index, it]));
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

  return {
    transactions: out,
    modelLabel: usedLabels.size ? [...usedLabels].join(" + ") : undefined,
    modelId: usedNames.size === 1 ? lastModelId : usedNames.size > 1 ? "mixed" : undefined,
  };
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
  opts?: { force?: boolean },
): Promise<LiveCategoriseOutput> {
  const cache = getCatCache();
  const keys = txns.map(cacheKey);
  // Always read the cache. In normal mode a hit skips the model; `force` ignores
  // hits for the primary path (so the model genuinely runs and a viewer sees a
  // real call) but the same hits are the safety net if every provider is down.
  const cacheHits = await cache.getMany(keys);

  const out: CategorisedTransaction[] = new Array(txns.length);
  const toModel: { t: Transaction; i: number }[] = [];
  txns.forEach((t, i) => {
    const hit = cacheHits.get(keys[i]);
    if (hit && !opts?.force) out[i] = { ...t, categorisation: hit, source: "gemini" };
    else toModel.push({ t, i });
  });

  let modelLabel: string | undefined;
  let servedFromCache = false;
  if (toModel.length) {
    try {
      const fresh = await categoriseWithGemini(toModel.map((m) => m.t));
      modelLabel = fresh.modelLabel;
      const toPersist: { key: string; categorisation: CategorisedTransaction["categorisation"] }[] = [];
      fresh.transactions.forEach((cat, j) => {
        const { i } = toModel[j];
        out[i] = cat;
        // only persist real model outputs, never per-line rules fallbacks
        if (cat.source === "gemini") toPersist.push({ key: keys[i], categorisation: cat.categorisation });
      });
      if (toPersist.length) await cache.putMany(toPersist, fresh.modelId ?? "live");
    } catch (liveErr) {
      // Live providers are unavailable (e.g. every one rate-limited). If a forced
      // run's lines are all already in the cache, serve those — they are the
      // model's own prior labels — instead of dropping to the rules baseline. A
      // non-forced run, or an incomplete cache, still throws (caller -> rules).
      const everyCached = keys.every((k) => cacheHits.has(k));
      if (opts?.force && everyCached) {
        txns.forEach((t, i) => {
          out[i] = { ...t, categorisation: cacheHits.get(keys[i])!, source: "gemini" };
        });
        servedFromCache = true;
      } else {
        throw liveErr;
      }
    }
  }

  const liveCount = servedFromCache ? 0 : toModel.length;
  return {
    transactions: out,
    cache: { hits: txns.length - liveCount, misses: liveCount, store: cache.kind },
    model: modelLabel,
    servedFromCache,
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
  /** Provider/model that answered, e.g. "Gemini 2.5 Flash" or "Llama 3.3 70B (Groq)". */
  model?: string;
  /** A forced live run was rate-limited and served the model's cached labels. */
  servedFromCache?: boolean;
}

export async function evaluateWithGemini(opts?: { force?: boolean }): Promise<LiveEvalResult> {
  const { getEvalCases, scoreCases, baselineEval } = await import("./eval");
  if (!llmConfigured()) {
    return { result: baselineEval(), source: "rules", fellBack: true };
  }
  const all = getEvalCases();
  const sample = sampleEvalCases(all, LIVE_EVAL_SAMPLE);
  try {
    const { transactions, cache, model, servedFromCache } = await categoriseWithGeminiCached(sample.map((c) => c.transaction), opts);
    const result = scoreCases(sample, transactions.map((t) => t.categorisation));
    return {
      result,
      source: "gemini",
      sampled: sample.length < all.length,
      sampleSize: sample.length,
      totalAvailable: all.length,
      cache,
      model,
      servedFromCache,
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
  /** Provider/model that answered (live path only). */
  model?: string;
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
    const { value, provider } = await withFailover((m) =>
      generateText({
        model: m,
        temperature: 0.3,
        system:
          "You write a short, plain-language lending decision rationale for a loan officer. " +
          "Ground every statement strictly in the JSON figures provided. Do not invent numbers or facts. " +
          "Do not use second-person marketing voice. 3-5 sentences. State the outcome and the key reasons.",
        prompt: `Decision figures:\n${JSON.stringify(figures, null, 2)}`,
      }),
    );
    return { text: value.text.trim(), source: "gemini", model: provider.label };
  } catch {
    return { text: grounded, source: "rules", fellBack: true };
  }
}
