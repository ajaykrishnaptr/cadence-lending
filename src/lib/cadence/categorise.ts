import { categoriseByRules } from "../categoriser/rules";
import type { CategorisedTransaction, CategoriserSource, Transaction } from "../types";

export interface CategoriseResult {
  transactions: CategorisedTransaction[];
  /** Which path actually produced the labels (surfaced in the UI). */
  source: CategoriserSource;
  /** Set when a requested live run fell back to the rules baseline. */
  fellBack?: boolean;
  error?: string;
}

/**
 * Chooses a categorisation path. "seed" and "rules" both use the deterministic
 * baseline (the seeded personas ship pre-categorised for instant load). "gemini"
 * runs the live model and falls back to rules on any error — always surfacing
 * which path ran. The Gemini implementation is injected from lib/llm to keep
 * this module free of provider dependencies.
 */
export type LiveCategoriser = (
  txns: Transaction[],
) => Promise<CategorisedTransaction[]>;

let liveCategoriser: LiveCategoriser | null = null;

export function registerLiveCategoriser(fn: LiveCategoriser) {
  liveCategoriser = fn;
}

export function categoriseWithRules(txns: Transaction[], source: CategoriserSource = "rules"): CategorisedTransaction[] {
  return txns.map((t) => ({ ...t, categorisation: categoriseByRules(t), source }));
}

export async function categorise(
  txns: Transaction[],
  source: CategoriserSource,
): Promise<CategoriseResult> {
  if (source === "gemini") {
    if (!liveCategoriser) {
      return { transactions: categoriseWithRules(txns, "rules"), source: "rules", fellBack: true, error: "Live categoriser not configured" };
    }
    try {
      const transactions = await liveCategoriser(txns);
      return { transactions, source: "gemini" };
    } catch (err) {
      return {
        transactions: categoriseWithRules(txns, "rules"),
        source: "rules",
        fellBack: true,
        error: err instanceof Error ? err.message : "Live categorisation failed",
      };
    }
  }
  return { transactions: categoriseWithRules(txns, source), source };
}
