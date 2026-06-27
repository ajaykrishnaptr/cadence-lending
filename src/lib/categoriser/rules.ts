import type { Category } from "../categories";
import { CATEGORY_META } from "../categories";
import type { Categorisation, Transaction } from "../types";

/**
 * Deterministic keyword/cadence categoriser. Serves three roles:
 *  - the pre-computed "instant load" labels for seeded personas,
 *  - the graceful fallback when the Gemini call fails,
 *  - a transparent baseline the evaluation can contrast against the LLM.
 * It is intentionally good-but-not-perfect: ambiguous lines (irregular income
 * that reads like a transfer, BNPL that reads like a subscription) are exactly
 * where it slips — which is what the eval's hard-case panel exists to show.
 */

interface Rule {
  test: RegExp;
  category: Category;
  confidence: number;
  recurring?: boolean;
}

const CREDIT_RULES: Rule[] = [
  { test: /lohn|gehalt/i, category: "salary", confidence: 0.97, recurring: true },
  { test: /honorar|projekt/i, category: "salary", confidence: 0.78 },
  { test: /übertrag|sparkonto|tagesgeld/i, category: "transfer", confidence: 0.74, recurring: true },
  { test: /erstattung|rückzahlung|gutschrift/i, category: "recurring-income", confidence: 0.55 },
];

const DEBIT_RULES: Rule[] = [
  { test: /miete/i, category: "rent", confidence: 0.96, recurring: true },
  { test: /ratenkredit|darlehen|finanzierung|leasing|werkzeug finanz/i, category: "loan-repayment", confidence: 0.9, recurring: true },
  { test: /ratenflex|paylater|ratenfix|raten\b/i, category: "bnpl", confidence: 0.88, recurring: true },
  { test: /rahmenkredit|quickcash|dispokredit/i, category: "other-credit", confidence: 0.8, recurring: true },
  { test: /strom|gas|energie|stadtwerke|volthaus|internet|netzklar|fasernet|mobilfunk|mobileins/i, category: "utilities", confidence: 0.9, recurring: true },
  { test: /versicherung|assur|haftpflicht|hausrat|kfz|kranken|schildvers/i, category: "insurance", confidence: 0.9, recurring: true },
  { test: /abo|mitgliedschaft|premium|streamly|kinora|tonika|pulsgym|kraftraum/i, category: "subscriptions", confidence: 0.85, recurring: true },
  { test: /markthalle|frischmarkt|tagesgut|korb & co/i, category: "groceries", confidence: 0.86 },
  { test: /tankpoint|voltdrive|citytransit|regiobahn/i, category: "transport", confidence: 0.85 },
  { test: /café|cafe|trattoria|imbiss|sushi|nori/i, category: "discretionary", confidence: 0.68 },
  { test: /kleiderwerk|elektromarkt|wohnreich|bucheck/i, category: "discretionary", confidence: 0.66 },
  { test: /sollzinsen|überziehung|entgelt|gebühr/i, category: "fees", confidence: 0.9 },
  { test: /luckyspin|betparadies|casino|wette|spielbank/i, category: "gambling", confidence: 0.92 },
  { test: /übertrag|sparkonto|tagesgeld|eigenes konto/i, category: "transfer", confidence: 0.7, recurring: true },
];

function build(category: Category, confidence: number, recurring: boolean): Categorisation {
  const meta = CATEGORY_META[category];
  return {
    category,
    subcategory: meta.label,
    confidence,
    isIncome: meta.isIncome,
    isRecurring: recurring,
    isObligation: meta.isObligation,
  };
}

export function categoriseByRules(t: Transaction): Categorisation {
  const rules = t.amount >= 0 ? CREDIT_RULES : DEBIT_RULES;
  for (const r of rules) {
    if (r.test.test(t.description)) {
      return build(r.category, r.confidence, r.recurring ?? false);
    }
  }
  // unmatched: a credit is most likely a transfer in, a debit is "other"
  return t.amount >= 0
    ? build("transfer", 0.45, false)
    : build("other", 0.4, false);
}

export function categoriseAllByRules(txns: Transaction[]): Categorisation[] {
  return txns.map(categoriseByRules);
}
