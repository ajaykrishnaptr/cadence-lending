import { CATEGORY_KEYS, type Category } from "./categories";
import { categoriseByRules } from "./categoriser/rules";
import { PROFILES, getPersonaData } from "./demo-bank";
import { HARD_CASES, type HardCase } from "./demo-bank/hard-cases";
import type { Categorisation, Transaction } from "./types";

/**
 * The evaluation harness. Ground-truth labels come from the Demo Bank generator
 * (and a hand-authored hard-case set) — independent of the categoriser — so the
 * score measures the categoriser, not itself. We own the limitation explicitly:
 * synthetic labels measure consistency against a known generator, not absolute
 * truth; production needs human-reviewed labels and inter-rater agreement.
 */

export interface EvalCase {
  id: string;
  transaction: Transaction;
  truth: Category;
  isHard: boolean;
  personaId?: string;
  /** Why this case is tricky (hard cases only). */
  note?: string;
}

export interface CaseResult extends EvalCase {
  predicted: Category;
  confidence: number;
  correct: boolean;
}

export interface CategoryMetric {
  category: Category;
  support: number;
  precision: number;
  recall: number;
  f1: number;
}

export interface EvalResult {
  total: number;
  correct: number;
  accuracy: number;
  hardTotal: number;
  hardCorrect: number;
  hardAccuracy: number;
  perCategory: CategoryMetric[];
  /** confusion[actual][predicted] = count. */
  confusion: Record<Category, Record<Category, number>>;
  /** Present categories (those with any support or predictions). */
  labels: Category[];
  misclassified: CaseResult[];
  cases: CaseResult[];
}

/** All labelled cases: every seeded transaction + the hard-case set. */
export function getEvalCases(): EvalCase[] {
  const cases: EvalCase[] = [];
  for (const p of PROFILES) {
    const data = getPersonaData(p.id);
    if (!data) continue;
    for (const t of data.transactions) {
      const { truth: _t, balance: _b, ...tx } = t;
      cases.push({ id: t.id, transaction: tx, truth: t.truth.category, isHard: false, personaId: p.id });
    }
  }
  for (const hc of HARD_CASES) {
    cases.push({ id: hc.id, transaction: hcToTransaction(hc), truth: hc.truth, isHard: true, note: hc.note });
  }
  return cases;
}

function hcToTransaction(hc: HardCase): Transaction {
  return {
    id: hc.id,
    accountId: "eval",
    bookingDate: hc.bookingDate,
    amount: hc.amount,
    currency: "EUR",
    description: hc.description,
    counterparty: hc.counterparty,
    direction: hc.amount >= 0 ? "credit" : "debit",
  };
}

type Categoriser = (t: Transaction) => Categorisation;

function emptyConfusion(): Record<Category, Record<Category, number>> {
  const m = {} as Record<Category, Record<Category, number>>;
  for (const a of CATEGORY_KEYS) {
    m[a] = {} as Record<Category, number>;
    for (const b of CATEGORY_KEYS) m[a][b] = 0;
  }
  return m;
}

/** Score a set of cases against a categoriser (sync — used for the rules baseline). */
export function evaluate(
  cases: EvalCase[],
  categoriser: Categoriser = categoriseByRules,
): EvalResult {
  return scoreCases(cases, cases.map((c) => categoriser(c.transaction)));
}

/** Score cases given predictions aligned by index (used by the live Gemini path). */
export function scoreCases(cases: EvalCase[], predictions: Categorisation[]): EvalResult {
  const confusion = emptyConfusion();
  const results: CaseResult[] = cases.map((c, i) => {
    const cat = predictions[i];
    const correct = cat.category === c.truth;
    confusion[c.truth][cat.category] += 1;
    return { ...c, predicted: cat.category, confidence: cat.confidence, correct };
  });

  const correct = results.filter((r) => r.correct).length;
  const hard = results.filter((r) => r.isHard);
  const hardCorrect = hard.filter((r) => r.correct).length;

  // per-category precision/recall over categories that appear as truth or prediction
  const present = new Set<Category>();
  for (const r of results) {
    present.add(r.truth);
    present.add(r.predicted);
  }
  const labels = CATEGORY_KEYS.filter((c) => present.has(c));

  const perCategory: CategoryMetric[] = labels.map((cat) => {
    const tp = results.filter((r) => r.truth === cat && r.predicted === cat).length;
    const fp = results.filter((r) => r.truth !== cat && r.predicted === cat).length;
    const fn = results.filter((r) => r.truth === cat && r.predicted !== cat).length;
    const support = results.filter((r) => r.truth === cat).length;
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    return { category: cat, support, precision, recall, f1 };
  });

  return {
    total: results.length,
    correct,
    accuracy: results.length ? correct / results.length : 0,
    hardTotal: hard.length,
    hardCorrect,
    hardAccuracy: hard.length ? hardCorrect / hard.length : 0,
    perCategory,
    confusion,
    labels,
    misclassified: results.filter((r) => !r.correct),
    cases: results,
  };
}

export interface MisclassView {
  id: string;
  description: string;
  truth: Category;
  predicted: Category;
  confidence: number;
  isHard: boolean;
  note?: string;
}

export interface EvalView {
  total: number;
  correct: number;
  accuracy: number;
  hardTotal: number;
  hardCorrect: number;
  hardAccuracy: number;
  perCategory: CategoryMetric[];
  confusion: Record<Category, Record<Category, number>>;
  labels: Category[];
  misclassified: MisclassView[];
}

/** Compact, serialisable shape for the client (drops the full transaction objects). */
export function toEvalView(r: EvalResult): EvalView {
  return {
    total: r.total,
    correct: r.correct,
    accuracy: r.accuracy,
    hardTotal: r.hardTotal,
    hardCorrect: r.hardCorrect,
    hardAccuracy: r.hardAccuracy,
    perCategory: r.perCategory,
    confusion: r.confusion,
    labels: r.labels,
    misclassified: r.misclassified.map((m) => ({
      id: m.id,
      description: m.transaction.description,
      truth: m.truth,
      predicted: m.predicted,
      confidence: m.confidence,
      isHard: m.isHard,
      note: m.note,
    })),
  };
}

/** Cached rules-baseline evaluation (used by the dashboard accuracy stat). */
let cachedBaseline: EvalResult | undefined;
export function baselineEval(): EvalResult {
  if (!cachedBaseline) cachedBaseline = evaluate(getEvalCases());
  return cachedBaseline;
}
