import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categorisationCache } from "@/db/schema";
import type { Categorisation, Transaction } from "../types";

/**
 * Persistent categorisation cache. A real categorisation harness never re-asks
 * the model about a booking line it has already classified — the model is the
 * expensive, rate-limited dependency. This cache memoises the Gemini label for a
 * normalised `description + amount + direction` key, so re-running the live
 * categoriser over a statement the model has already seen costs zero calls.
 *
 * It is GLOBAL (not session-scoped) and is never cleared by "reset my demo
 * data" — a label for "Lohn/Gehalt …" at €3,200 is true regardless of who is
 * looking. Neon backs it when DATABASE_URL is set; otherwise an in-process map
 * (kept on globalThis so it survives dev hot-reloads) stands in, exactly like
 * the application store.
 */

/** Normalised, collision-safe cache key. Same key ⇒ semantically the same line. */
export function cacheKey(t: Transaction): string {
  const desc = t.description.toLowerCase().replace(/\s+/g, " ").trim();
  return `${desc}|${t.amount.toFixed(2)}|${t.direction}`;
}

export interface CatCache {
  readonly kind: "neon" | "memory";
  getMany(keys: string[]): Promise<Map<string, Categorisation>>;
  putMany(entries: { key: string; categorisation: Categorisation }[], model: string): Promise<void>;
}

function toCategorisation(row: {
  category: string;
  subcategory: string;
  confidence: number;
  isIncome: boolean;
  isRecurring: boolean;
  isObligation: boolean;
}): Categorisation {
  return {
    category: row.category as Categorisation["category"],
    subcategory: row.subcategory,
    confidence: row.confidence,
    isIncome: row.isIncome,
    isRecurring: row.isRecurring,
    isObligation: row.isObligation,
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---- in-memory (no DATABASE_URL) ----
interface MemEntry extends Categorisation {
  model: string;
}
const g = globalThis as unknown as { __cadenceCatCache?: Map<string, MemEntry> };
const memMap: Map<string, MemEntry> = g.__cadenceCatCache ?? (g.__cadenceCatCache = new Map());

class MemoryCatCache implements CatCache {
  readonly kind = "memory" as const;
  async getMany(keys: string[]): Promise<Map<string, Categorisation>> {
    const out = new Map<string, Categorisation>();
    for (const k of keys) {
      const hit = memMap.get(k);
      if (hit) out.set(k, hit);
    }
    return out;
  }
  async putMany(entries: { key: string; categorisation: Categorisation }[], model: string): Promise<void> {
    for (const e of entries) memMap.set(e.key, { ...e.categorisation, model });
  }
}

// ---- Neon-backed ----
class NeonCatCache implements CatCache {
  readonly kind = "neon" as const;
  constructor(private db: NonNullable<ReturnType<typeof getDb>>) {}

  async getMany(keys: string[]): Promise<Map<string, Categorisation>> {
    const out = new Map<string, Categorisation>();
    if (keys.length === 0) return out;
    for (const group of chunk(keys, 200)) {
      const rows = await this.db
        .select()
        .from(categorisationCache)
        .where(inArray(categorisationCache.key, group));
      for (const r of rows) out.set(r.key, toCategorisation(r));
    }
    return out;
  }

  async putMany(entries: { key: string; categorisation: Categorisation }[], model: string): Promise<void> {
    if (entries.length === 0) return;
    const rows = entries.map((e) => ({
      key: e.key,
      category: e.categorisation.category,
      subcategory: e.categorisation.subcategory,
      confidence: e.categorisation.confidence,
      isIncome: e.categorisation.isIncome,
      isRecurring: e.categorisation.isRecurring,
      isObligation: e.categorisation.isObligation,
      model,
    }));
    for (const group of chunk(rows, 100)) {
      await this.db.insert(categorisationCache).values(group).onConflictDoNothing();
    }
  }
}

let cached: CatCache | undefined;

/** Neon-backed when DATABASE_URL is set, otherwise an in-process map. */
export function getCatCache(): CatCache {
  if (cached) return cached;
  const db = getDb();
  cached = db ? new NeonCatCache(db) : new MemoryCatCache();
  return cached;
}
