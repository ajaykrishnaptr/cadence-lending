import type { Category } from "../categories";
import { categoryLabel } from "../categories";
import type {
  CategorisedTransaction,
  DecisionOutcome,
  LoanRequest,
} from "../types";
import {
  livingAllowance,
  maxPrincipalForInstalment,
  monthlyInstalment,
  type ProductConfig,
} from "./config";
import type {
  AdverseAnalysis,
  DecisionPackage,
  Haushaltsrechnung,
  IncomeAnalysis,
  ObligationItem,
  ObligationsAnalysis,
  RuleResult,
  RuleStatus,
} from "./types";

export * from "./types";
export * from "./config";

// ---- small numeric helpers ----
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function distinctMonths(txns: CategorisedTransaction[]): string[] {
  return [...new Set(txns.map((t) => monthKey(t.bookingDate)))].sort();
}

// ---- income ----
export function analyseIncome(txns: CategorisedTransaction[]): IncomeAnalysis {
  const incomeTxns = txns.filter((t) => t.categorisation.isIncome && t.amount > 0);
  const months = distinctMonths(txns);

  const byMonth = new Map<string, number>();
  for (const t of incomeTxns) {
    const k = monthKey(t.bookingDate);
    byMonth.set(k, (byMonth.get(k) ?? 0) + t.amount);
  }
  const incomeMonths = [...byMonth.entries()]
    .map(([month, income]) => ({ month, income: round2(income) }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  const incomeValues = incomeMonths.map((m) => m.income).filter((v) => v > 0);
  const monthlyNet = round2(median(incomeValues));

  // stability via coefficient of variation
  const mean = incomeValues.reduce((s, v) => s + v, 0) / (incomeValues.length || 1);
  const variance =
    incomeValues.reduce((s, v) => s + (v - mean) ** 2, 0) / (incomeValues.length || 1);
  const cov = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const stability = round2(clamp01(1 - cov));

  const incomeTxnsPerMonth = incomeTxns.length / (incomeValues.length || 1);
  const cadence: IncomeAnalysis["cadence"] =
    incomeTxnsPerMonth > 1.4 || stability < 0.6 ? "irregular" : "monthly";

  const stabilityLabel =
    stability >= 0.95
      ? "Very stable"
      : stability >= 0.88
        ? "Stable"
        : stability >= 0.7
          ? "Somewhat variable"
          : "Variable";

  // most common employer/counterparty among salary lines
  const counts = new Map<string, number>();
  for (const t of incomeTxns) {
    if (t.counterparty) counts.set(t.counterparty, (counts.get(t.counterparty) ?? 0) + 1);
  }
  const detectedEmployer = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    monthlyNet,
    cadence,
    stability,
    stabilityLabel,
    tenureMonths: months.length,
    monthly: incomeMonths,
    detectedEmployer,
    txnIds: incomeTxns.map((t) => t.id),
  };
}

// ---- obligations ----
const OBLIGATION_CATS: Category[] = ["loan-repayment", "bnpl", "other-credit"];

export function analyseObligations(
  txns: CategorisedTransaction[],
): ObligationsAnalysis {
  const items: ObligationItem[] = [];
  for (const cat of OBLIGATION_CATS) {
    const matching = txns.filter((t) => t.categorisation.category === cat && t.amount < 0);
    if (matching.length === 0) continue;
    // median monthly outgoing for this obligation type
    const byMonth = new Map<string, number>();
    for (const t of matching) {
      const k = monthKey(t.bookingDate);
      byMonth.set(k, (byMonth.get(k) ?? 0) + Math.abs(t.amount));
    }
    const monthly = round2(median([...byMonth.values()]));
    items.push({
      category: cat,
      label: categoryLabel(cat),
      monthly,
      count: matching.length,
      txnIds: matching.map((t) => t.id),
    });
  }
  const totalMonthly = round2(items.reduce((s, i) => s + i.monthly, 0));

  const rentTxns = txns.filter((t) => t.categorisation.category === "rent" && t.amount < 0);
  const rentByMonth = new Map<string, number>();
  for (const t of rentTxns) {
    const k = monthKey(t.bookingDate);
    rentByMonth.set(k, (rentByMonth.get(k) ?? 0) + Math.abs(t.amount));
  }
  const rentMonthly = round2(median([...rentByMonth.values()]));

  return {
    items,
    totalMonthly,
    rentMonthly,
    rentTxnIds: rentTxns.map((t) => t.id),
  };
}

// ---- adverse markers ----
export function analyseAdverse(txns: CategorisedTransaction[]): AdverseAnalysis {
  const monthCount = distinctMonths(txns).length || 1;
  const overdraft = txns.filter(
    (t) => t.categorisation.category === "fees" && /überziehung|sollzins/i.test(t.description),
  );
  const gambling = txns.filter((t) => t.categorisation.category === "gambling");
  const gamblingSpend = round2(gambling.reduce((s, t) => s + Math.abs(t.amount), 0));

  const overdraftPerMonth = overdraft.length / monthCount;
  const gamblingPerMonth = gambling.length / monthCount;

  let severity: AdverseAnalysis["severity"] = "none";
  if (overdraft.length > 0 || gambling.length > 0) severity = "mild";
  if (overdraftPerMonth >= 3 || gamblingSpend / monthCount > 200) severity = "severe";

  const conditions: string[] = [];
  if (overdraft.length > 0) {
    conditions.push(
      `Recurring overdraft use detected (${overdraft.length} occurrences across the statement period). Recommend monitoring and a conservative limit.`,
    );
  }
  if (gambling.length > 0) {
    conditions.push(
      `Gambling transactions present (${gambling.length} payments). Advise an affordability review before drawdown.`,
    );
  }

  return {
    overdraftCount: overdraft.length,
    overdraftTxnIds: overdraft.map((t) => t.id),
    gamblingCount: gambling.length,
    gamblingSpend,
    gamblingTxnIds: gambling.map((t) => t.id),
    severity,
    conditions,
  };
}

// ---- the full decision ----
export function runDecision(
  txns: CategorisedTransaction[],
  request: LoanRequest,
  product: ProductConfig,
  householdSize: number,
): DecisionPackage {
  const income = analyseIncome(txns);
  const obligations = analyseObligations(txns);
  const adverse = analyseAdverse(txns);

  const allowance = livingAllowance(householdSize);
  const available = round2(
    income.monthlyNet - allowance - obligations.rentMonthly - obligations.totalMonthly,
  );

  const haushalt: Haushaltsrechnung = {
    netIncome: income.monthlyNet,
    livingAllowance: allowance,
    rent: obligations.rentMonthly,
    obligations: obligations.totalMonthly,
    available,
    lines: [
      {
        id: "income",
        label: "Net monthly income",
        amount: income.monthlyNet,
        kind: "income",
        note: "Median of detected salary / recurring income",
        txnIds: income.txnIds,
      },
      {
        id: "allowance",
        label: `Living-cost allowance (household of ${householdSize})`,
        amount: -allowance,
        kind: "deduction",
        note: "Standard Pauschale — everyday living costs excluding rent",
        txnIds: [],
      },
      {
        id: "rent",
        label: "Rent",
        amount: -obligations.rentMonthly,
        kind: "deduction",
        note: "Detected housing cost",
        txnIds: obligations.rentTxnIds,
      },
      {
        id: "obligations",
        label: "Existing credit obligations",
        amount: -obligations.totalMonthly,
        kind: "deduction",
        note: "Loan, BNPL and other credit instalments",
        txnIds: obligations.items.flatMap((i) => i.txnIds),
      },
      {
        id: "available",
        label: "Available income",
        amount: available,
        kind: "result",
        note: "What remains for a new instalment",
        txnIds: [],
      },
    ],
  };

  const instalment = round2(monthlyInstalment(request.amount, product.apr, request.termMonths));
  const stressedInstalment = round2(
    monthlyInstalment(request.amount, product.apr + product.stressRateDelta, request.termMonths),
  );
  const dti = income.monthlyNet > 0
    ? round2((obligations.totalMonthly + instalment) / income.monthlyNet)
    : 1;

  const rules: RuleResult[] = [];

  // R1 — affordability buffer
  const requiredWithBuffer = round2(instalment * product.affordabilityBuffer);
  let r1: RuleStatus;
  if (available >= requiredWithBuffer) r1 = "pass";
  else if (available >= instalment) r1 = "refer";
  else r1 = "fail";
  rules.push({
    id: "affordability",
    label: "Affordability buffer",
    description: `Available income must cover the new instalment with a ${product.affordabilityBuffer}× safety buffer.`,
    status: r1,
    valueLabel: `€${available.toLocaleString("de-DE")} available`,
    thresholdLabel: `≥ €${requiredWithBuffer.toLocaleString("de-DE")} (instalment × ${product.affordabilityBuffer})`,
    inputs: [
      { label: "Available income", value: `€${available.toLocaleString("de-DE")}` },
      { label: "Proposed instalment", value: `€${instalment.toLocaleString("de-DE")}` },
      { label: "Required (with buffer)", value: `€${requiredWithBuffer.toLocaleString("de-DE")}` },
    ],
    txnIds: [...income.txnIds, ...obligations.rentTxnIds, ...obligations.items.flatMap((i) => i.txnIds)],
  });

  // R2 — debt-to-income
  let r2: RuleStatus;
  if (dti <= product.maxDti) r2 = "pass";
  else if (dti <= product.maxDti + 0.05) r2 = "refer";
  else r2 = "fail";
  rules.push({
    id: "dti",
    label: "Debt-to-income ratio",
    description: "Total credit commitments including the new instalment, as a share of net income.",
    status: r2,
    valueLabel: `${(dti * 100).toFixed(1)}%`,
    thresholdLabel: `≤ ${(product.maxDti * 100).toFixed(0)}%`,
    inputs: [
      { label: "Existing obligations", value: `€${obligations.totalMonthly.toLocaleString("de-DE")}` },
      { label: "New instalment", value: `€${instalment.toLocaleString("de-DE")}` },
      { label: "Net income", value: `€${income.monthlyNet.toLocaleString("de-DE")}` },
    ],
    txnIds: [...obligations.items.flatMap((i) => i.txnIds), ...income.txnIds],
  });

  // R3 — stability & tenure
  let r3: RuleStatus = "pass";
  let r3Detail = "Sufficient history and a stable income pattern.";
  if (income.tenureMonths < product.minTenureMonths) {
    r3 = "refer";
    r3Detail = `Only ${income.tenureMonths} months of history (minimum ${product.minTenureMonths}). Too thin for an automated decision.`;
  } else if (income.stability < product.minStability) {
    r3 = "refer";
    r3Detail = `Income stability ${(income.stability * 100).toFixed(0)}% is below the ${(product.minStability * 100).toFixed(0)}% threshold.`;
  }
  rules.push({
    id: "stability",
    label: "Income stability & tenure",
    description: "Enough statement history, and a steady enough income, to decide automatically.",
    status: r3,
    valueLabel: `${income.tenureMonths} mo · ${(income.stability * 100).toFixed(0)}% stable`,
    thresholdLabel: `≥ ${product.minTenureMonths} mo · ≥ ${(product.minStability * 100).toFixed(0)}%`,
    inputs: [
      { label: "Statement history", value: `${income.tenureMonths} months` },
      { label: "Income stability", value: `${(income.stability * 100).toFixed(0)}%` },
      { label: "Cadence", value: income.cadence },
    ],
    txnIds: income.txnIds,
  });
  void r3Detail;

  // R4 — stress test
  const r4: RuleStatus = available >= stressedInstalment ? "pass" : "refer";
  rules.push({
    id: "stress",
    label: "Interest-rate stress test",
    description: `Instalment recomputed at +${(product.stressRateDelta * 100).toFixed(0)}% APR must still be covered by available income.`,
    status: r4,
    valueLabel: `€${stressedInstalment.toLocaleString("de-DE")} stressed`,
    thresholdLabel: `≤ €${available.toLocaleString("de-DE")} available`,
    inputs: [
      { label: "Stressed APR", value: `${((product.apr + product.stressRateDelta) * 100).toFixed(1)}%` },
      { label: "Stressed instalment", value: `€${stressedInstalment.toLocaleString("de-DE")}` },
      { label: "Available income", value: `€${available.toLocaleString("de-DE")}` },
    ],
    txnIds: income.txnIds,
  });

  // R5 — adverse markers
  const r5: RuleStatus = adverse.severity === "severe" ? "refer" : "pass";
  rules.push({
    id: "adverse",
    label: "Adverse markers",
    description: "Overdraft frequency and gambling activity that should temper or block an approval.",
    status: r5,
    valueLabel:
      adverse.severity === "none"
        ? "None detected"
        : `${adverse.overdraftCount} overdraft · ${adverse.gamblingCount} gambling`,
    thresholdLabel: "No severe markers",
    inputs: [
      { label: "Overdraft occurrences", value: `${adverse.overdraftCount}` },
      { label: "Gambling payments", value: `${adverse.gamblingCount}` },
      { label: "Gambling spend", value: `€${adverse.gamblingSpend.toLocaleString("de-DE")}` },
    ],
    txnIds: [...adverse.overdraftTxnIds, ...adverse.gamblingTxnIds],
  });

  // ---- aggregate outcome ----
  const hasFail = rules.some((r) => r.status === "fail");
  const hasRefer = rules.some((r) => r.status === "refer");
  let outcome: DecisionOutcome;
  if (hasFail) outcome = "decline";
  else if (hasRefer) outcome = "refer";
  else outcome = "approve";

  const conditions = outcome === "approve" ? [...adverse.conditions] : [];

  let outcomeLabel: string;
  if (outcome === "approve") outcomeLabel = conditions.length > 0 ? "Approve with conditions" : "Approve";
  else if (outcome === "refer") outcomeLabel = "Refer to underwriter";
  else outcomeLabel = "Decline";

  // ---- limit ----
  const maxInstalmentBudget = Math.max(0, available / product.affordabilityBuffer);
  const rawMax = maxPrincipalForInstalment(maxInstalmentBudget, product.apr, request.termMonths);
  const maxEligible = Math.max(
    0,
    Math.min(product.amountRange.max, Math.floor(rawMax / product.amountRange.step) * product.amountRange.step),
  );
  const recommendedLimit =
    outcome === "approve" ? Math.min(request.amount, maxEligible) : null;

  return {
    product,
    request,
    income,
    obligations,
    adverse,
    haushalt,
    instalment,
    stressedInstalment,
    dti,
    rules,
    outcome,
    outcomeLabel,
    conditions,
    recommendedLimit,
    maxEligible,
    transactions: txns,
  };
}
