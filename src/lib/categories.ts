/**
 * The transaction taxonomy used by both the (independent) Demo Bank seed
 * generator's ground-truth labels and the AI categoriser's output. Sixteen
 * categories per the spec. Badge classes are written out in full so Tailwind's
 * compiler can see them (no dynamically-constructed class names).
 */

export const CATEGORY_KEYS = [
  "salary",
  "recurring-income",
  "rent",
  "utilities",
  "insurance",
  "groceries",
  "transport",
  "subscriptions",
  "loan-repayment",
  "bnpl",
  "other-credit",
  "discretionary",
  "transfer",
  "fees",
  "gambling",
  "other",
] as const;

export type Category = (typeof CATEGORY_KEYS)[number];

export type CategoryGroup =
  | "income"
  | "housing"
  | "living"
  | "obligations"
  | "discretionary"
  | "movement";

export interface CategoryMeta {
  key: Category;
  label: string;
  group: CategoryGroup;
  /** Typical defaults — the generator/categoriser can still override per txn. */
  isIncome: boolean;
  isObligation: boolean;
  /** Full, statically-analysable badge classes (light + dark). */
  badge: string;
  /** Solid dot colour for legends/keys. */
  dot: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  salary: {
    key: "salary",
    label: "Salary",
    group: "income",
    isIncome: true,
    isObligation: false,
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  "recurring-income": {
    key: "recurring-income",
    label: "Recurring income",
    group: "income",
    isIncome: true,
    isObligation: false,
    badge:
      "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-400/20",
    dot: "bg-teal-500",
  },
  rent: {
    key: "rent",
    label: "Rent",
    group: "housing",
    isIncome: false,
    isObligation: true,
    badge:
      "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20",
    dot: "bg-indigo-500",
  },
  utilities: {
    key: "utilities",
    label: "Utilities",
    group: "living",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/20",
    dot: "bg-sky-500",
  },
  insurance: {
    key: "insurance",
    label: "Insurance",
    group: "living",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-500/15 dark:text-cyan-300 dark:ring-cyan-400/20",
    dot: "bg-cyan-500",
  },
  groceries: {
    key: "groceries",
    label: "Groceries",
    group: "living",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-lime-50 text-lime-700 ring-lime-600/20 dark:bg-lime-500/15 dark:text-lime-300 dark:ring-lime-400/20",
    dot: "bg-lime-500",
  },
  transport: {
    key: "transport",
    label: "Transport",
    group: "living",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-400/20",
    dot: "bg-green-500",
  },
  subscriptions: {
    key: "subscriptions",
    label: "Subscriptions",
    group: "discretionary",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/20 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:ring-fuchsia-400/20",
    dot: "bg-fuchsia-500",
  },
  "loan-repayment": {
    key: "loan-repayment",
    label: "Loan repayment",
    group: "obligations",
    isIncome: false,
    isObligation: true,
    badge:
      "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/20",
    dot: "bg-orange-500",
  },
  bnpl: {
    key: "bnpl",
    label: "BNPL",
    group: "obligations",
    isIncome: false,
    isObligation: true,
    badge:
      "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  "other-credit": {
    key: "other-credit",
    label: "Other credit",
    group: "obligations",
    isIncome: false,
    isObligation: true,
    badge:
      "bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-500/15 dark:text-yellow-300 dark:ring-yellow-400/20",
    dot: "bg-yellow-500",
  },
  discretionary: {
    key: "discretionary",
    label: "Discretionary",
    group: "discretionary",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-500/15 dark:text-pink-300 dark:ring-pink-400/20",
    dot: "bg-pink-500",
  },
  transfer: {
    key: "transfer",
    label: "Transfer",
    group: "movement",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-slate-100 text-slate-700 ring-slate-600/20 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/20",
    dot: "bg-slate-500",
  },
  fees: {
    key: "fees",
    label: "Fees",
    group: "living",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20",
    dot: "bg-rose-500",
  },
  gambling: {
    key: "gambling",
    label: "Gambling",
    group: "discretionary",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/20",
    dot: "bg-red-500",
  },
  other: {
    key: "other",
    label: "Other",
    group: "movement",
    isIncome: false,
    isObligation: false,
    badge:
      "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-400/15 dark:text-zinc-300 dark:ring-zinc-400/20",
    dot: "bg-zinc-400",
  },
};

export const CATEGORY_LIST: CategoryMeta[] = CATEGORY_KEYS.map(
  (k) => CATEGORY_META[k],
);

export function categoryLabel(key: Category): string {
  return CATEGORY_META[key]?.label ?? key;
}

export function isCategory(value: string): value is Category {
  return (CATEGORY_KEYS as readonly string[]).includes(value);
}
