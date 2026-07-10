import type { DecisionPackage } from "./engine";

/**
 * The rationale evaluation harness. The rationale is the one free-text thing the
 * model produces for a loan officer, so it is held to explicit checks. The five
 * programmatic checks below are deterministic and need no API key — they run in
 * `scripts/verify-rationale.ts` as a release gate. The subjective dimensions
 * (relevance / balance / tone) are scored by an injected LLM-as-judge and are
 * informational, never blocking.
 *
 * Honesty about limits: the deny-list in the compliance check is a floor, not a
 * ceiling — it catches overt advisor language, not every paraphrase, which is
 * why the judge sits behind it. Groundedness allows rounding and derived figures
 * (debt-to-income, the buffer, the eligible ceiling) so it does not false-fail
 * on legitimate arithmetic.
 */

export type RationaleDimension =
  | "groundedness"
  | "outcome"
  | "compliance"
  | "completeness"
  | "structure";

export type JudgeDimension = "relevance" | "balance" | "tone";

export interface CriterionSpec {
  dimension: RationaleDimension | JudgeDimension;
  what: string;
  method: "code" | "code+judge" | "judge";
  /** hard = P0 blocker · gate = blocks · informational = advisory only. */
  gate: "hard" | "gate" | "informational";
}

/** The declarative "deciding metrics" table — evals as the spec. */
export const RATIONALE_CRITERIA: CriterionSpec[] = [
  { dimension: "groundedness", what: "Every figure traces to the decision package (rounding + derived values allowed).", method: "code", gate: "hard" },
  { dimension: "outcome", what: "The stated outcome matches the engine's computed outcome.", method: "code", gate: "hard" },
  { dimension: "compliance", what: "No advice, no recommendation to lend/decline, no protected-attribute reasoning.", method: "code+judge", gate: "hard" },
  { dimension: "completeness", what: "The rule that drove the outcome is named.", method: "code", gate: "gate" },
  { dimension: "structure", what: "Readable length; income and available-income figures both present.", method: "code", gate: "gate" },
  { dimension: "relevance", what: "Addresses the decision and its drivers.", method: "judge", gate: "informational" },
  { dimension: "balance", what: "Weighs the factors for and against fairly.", method: "judge", gate: "informational" },
  { dimension: "tone", what: "Professional and clear, no marketing voice.", method: "judge", gate: "informational" },
];

export interface CheckResult {
  dimension: RationaleDimension;
  pass: boolean;
  detail: string;
  /** The offending fragments, when the check fails. */
  violations: string[];
}

export interface JudgeScores {
  relevance: number;
  balance: number;
  tone: number;
  /** Hard pass/fail — false if it reads as advice, invents figures, or misstates the outcome. */
  pass: boolean;
  remark: string;
}

/** Injected so the core stays key-free and unit-testable. */
export type RationaleJudge = (
  text: string,
  d: DecisionPackage,
) => Promise<JudgeScores | undefined>;

export interface RationaleCaseResult {
  checks: CheckResult[];
  /** True when every programmatic check passes. */
  pass: boolean;
  judge?: JudgeScores;
}

// ---- number parsing ----

/** German-formatted amount ("3.200" → 3200; "−750" → -750; thousands dots stripped). */
function parseDe(s: string): number {
  return parseFloat(s.replace(/−/g, "-").replace(/\./g, "").replace(",", "."));
}

const blank = (m: string) => " ".repeat(m.length);
const near = (v: number, allow: number[], tol: number) =>
  allow.some((a) => Math.abs(a - v) <= tol);

// ---- the decisive rule (mirrors buildRationale's reason selection) ----

/** The rule whose status produced the outcome — what the explanation must name. */
export function decisiveRule(d: DecisionPackage) {
  if (d.outcome === "decline") return d.rules.find((r) => r.status === "fail");
  if (d.outcome === "refer") return d.rules.find((r) => r.status === "refer");
  return d.rules.find((r) => r.id === "affordability");
}

const RULE_KEYWORDS: Record<string, string[]> = {
  affordability: ["afford"],
  dti: ["debt-to-income", "debt to income", "dti"],
  stability: ["stability", "stable", "tenure", "history", "months of"],
  stress: ["stress"],
  adverse: ["adverse", "overdraft", "gambling"],
  bureau: ["bureau", "credit registry", "default", "insolvenc"],
  coverage: ["coverage", "connected", "banks"],
  scope: ["scope", "consent", "withheld"],
};

// ---- 1. groundedness ----

export function checkGroundedness(text: string, d: DecisionPackage): CheckResult {
  const currency = [
    d.income.monthlyNet,
    d.haushalt.livingAllowance,
    d.haushalt.rent,
    d.haushalt.obligations,
    d.haushalt.available,
    d.instalment,
    d.stressedInstalment,
    d.request.amount,
    d.maxEligible,
    d.recommendedLimit ?? undefined,
    d.adverse.gamblingSpend,
    d.obligations.rentMonthly,
    Math.round(d.instalment * d.product.affordabilityBuffer), // required-with-buffer
    ...d.obligations.items.map((i) => i.monthly),
    0,
  ]
    .filter((v): v is number => v != null)
    .map((v) => Math.round(v));

  const percent = [
    d.dti,
    d.product.maxDti,
    d.income.stability,
    d.product.minStability,
    d.product.apr,
    d.product.apr + d.product.stressRateDelta,
    d.product.stressRateDelta,
  ].map((x) => Math.round(x * 100));

  const multiplier = [d.product.affordabilityBuffer];
  const months = [d.income.tenureMonths, d.product.minTenureMonths];
  const counts = [d.adverse.overdraftCount, d.adverse.gamblingCount];

  const violations: string[] = [];
  let work = text;

  work = work.replace(/([−-]?\d[\d.]*)\s*€/g, (m, g: string) => {
    if (!near(parseDe(g), currency, 1)) violations.push(`${g} €`);
    return blank(m);
  });
  work = work.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (m, g: string) => {
    if (!near(parseFloat(g.replace(",", ".")), percent, 1)) violations.push(`${g}%`);
    return blank(m);
  });
  work = work.replace(/(\d+(?:\.\d+)?)\s*×/g, (m, g: string) => {
    if (!near(parseFloat(g), multiplier, 0.02)) violations.push(`${g}×`);
    return blank(m);
  });
  work = work.replace(/(\d+)\s*-?\s*months?\b/gi, (m, g: string) => {
    if (!months.includes(parseInt(g, 10))) violations.push(`${g} months`);
    return blank(m);
  });

  for (const b of work.match(/\d[\d.,]*/g) ?? []) {
    const v = parseInt(b.replace(/[.,]/g, ""), 10);
    if (!Number.isNaN(v) && !counts.includes(v)) violations.push(b);
  }

  return {
    dimension: "groundedness",
    pass: violations.length === 0,
    detail: violations.length
      ? `figures not traceable to the decision package: ${violations.join(", ")}`
      : "every figure traces to the decision package",
    violations,
  };
}

// ---- 2. outcome faithfulness ----

const OUTCOME_ROOT: Record<DecisionPackage["outcome"], RegExp> = {
  approve: /\bapprov/i,
  refer: /\brefer/i,
  decline: /\bdeclin/i,
};

export function checkOutcome(text: string, d: DecisionPackage): CheckResult {
  const expected = OUTCOME_ROOT[d.outcome];
  const others = (Object.keys(OUTCOME_ROOT) as DecisionPackage["outcome"][])
    .filter((o) => o !== d.outcome)
    .filter((o) => OUTCOME_ROOT[o].test(text));
  const hasExpected = expected.test(text);
  const violations: string[] = [];
  if (!hasExpected) violations.push(`does not state the outcome "${d.outcome}"`);
  if (others.length) violations.push(`states a conflicting outcome: ${others.join(", ")}`);
  return {
    dimension: "outcome",
    pass: violations.length === 0,
    detail: violations.length ? violations.join("; ") : `states the correct outcome (${d.outcome})`,
    violations,
  };
}

// ---- 3. compliance / fair lending ----

// Applicant-directed advice / recommendation to borrow or lend. Deliberately
// narrow so officer-facing prudential notes ("Recommend monitoring", "Advise an
// affordability review") do NOT trip it.
const ADVISOR_PATTERNS: RegExp[] = [
  /\byou should\b/i,
  /\byou must\b/i,
  /\byou ought\b/i,
  /\byou'?d better\b/i,
  /\bi\s+recommend\b/i,
  /\bwe\s+recommend\b/i,
  /\brecommend(?:ed|ing)?\s+(?:that\s+)?(?:you|the applicant|the borrower|approv|declin|lending|borrowing|to\s+borrow|taking\s+out)\b/i,
  /\b(?:should|must)\s+(?:borrow|apply|take out|proceed with the loan|go ahead with)\b/i,
  /\b(?:definitely|certainly)\s+(?:approve|borrow|take|apply)\b/i,
  /\bgo ahead and\s+(?:borrow|apply|approve|take)\b/i,
  /\b(?:guaranteed|risk[- ]?free|sure[- ]?shot)\b/i,
  /\b(?:buy|sell)\s+(?:this|the)\s+(?:stock|share|loan)\b/i,
];
const SECOND_PERSON: RegExp[] = [/\byou\b/i, /\byour\b/i, /\byou're\b/i, /\byou'll\b/i];
const PROTECTED_PATTERNS: RegExp[] = [
  /\brac(?:e|ial)\b/i,
  /\bethnic(?:ity)?\b/i,
  /\breligio(?:n|us)\b/i,
  /\bgender\b/i,
  /\bnationality\b/i,
  /\bimmigran\w*/i,
  /\bdisab(?:led|ility)\b/i,
  /\bpregnan\w*/i,
  /\bmarital\b/i,
];

export function checkCompliance(text: string, _d: DecisionPackage): CheckResult {
  void _d;
  const violations: string[] = [];
  const scan = (patterns: RegExp[]) => {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) violations.push(m[0].trim());
    }
  };
  scan(ADVISOR_PATTERNS);
  scan(SECOND_PERSON);
  scan(PROTECTED_PATTERNS);
  return {
    dimension: "compliance",
    pass: violations.length === 0,
    detail: violations.length
      ? `prohibited language (advice / second-person / protected attribute): ${violations.join(", ")}`
      : "no advisor language, second-person voice, or protected-attribute reasoning",
    violations,
  };
}

// ---- 4. completeness ----

export function checkCompleteness(text: string, d: DecisionPackage): CheckResult {
  const t = text.toLowerCase();
  const rule = decisiveRule(d);
  let pass: boolean;
  let subject: string;
  if (d.outcome === "approve") {
    subject = "affordability";
    pass = /afford/.test(t);
  } else if (rule) {
    subject = rule.label;
    const kws = RULE_KEYWORDS[rule.id] ?? [];
    pass = t.includes(rule.label.toLowerCase()) || kws.some((k) => t.includes(k));
  } else {
    subject = "decisive rule";
    pass = false;
  }
  return {
    dimension: "completeness",
    pass,
    detail: pass
      ? `names the decisive factor (${subject})`
      : `does not name the decisive factor (${subject})`,
    violations: pass ? [] : [subject],
  };
}

// ---- 5. structure ----

const MIN_SENTENCES = 2;
const MAX_SENTENCES = 12;

export function checkStructure(text: string, _d: DecisionPackage): CheckResult {
  void _d;
  const sentences = text
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
  const n = sentences.length;
  const t = text.toLowerCase();
  const hasIncome = /income/.test(t);
  const hasAvailable = /available/.test(t);
  const violations: string[] = [];
  if (n < MIN_SENTENCES || n > MAX_SENTENCES) violations.push(`sentence count ${n} (want ${MIN_SENTENCES}–${MAX_SENTENCES})`);
  if (!hasIncome) violations.push("no income figure cited");
  if (!hasAvailable) violations.push("no available-income figure cited");
  return {
    dimension: "structure",
    pass: violations.length === 0,
    detail: violations.length ? violations.join("; ") : `${n} sentences, income and available income both cited`,
    violations,
  };
}

// ---- aggregate ----

export const PROGRAMMATIC_CHECKS = [
  checkGroundedness,
  checkOutcome,
  checkCompliance,
  checkCompleteness,
  checkStructure,
] as const;

/** Run all five deterministic checks. */
export function runChecks(text: string, d: DecisionPackage): CheckResult[] {
  return PROGRAMMATIC_CHECKS.map((fn) => fn(text, d));
}

/** Full evaluation of one rationale, optionally with an injected judge. */
export async function evaluateRationale(
  text: string,
  d: DecisionPackage,
  judge?: RationaleJudge,
): Promise<RationaleCaseResult> {
  const checks = runChecks(text, d);
  const pass = checks.every((c) => c.pass);
  const judgeScores = judge ? await judge(text, d) : undefined;
  return { checks, pass, judge: judgeScores };
}
