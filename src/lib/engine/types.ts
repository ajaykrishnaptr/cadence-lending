import type { Category } from "../categories";
import type {
  CategorisedTransaction,
  DecisionOutcome,
  LoanRequest,
} from "../types";
import type { ProductConfig } from "./config";

export type RuleStatus = "pass" | "refer" | "fail";

export interface RuleInput {
  label: string;
  value: string;
}

export interface RuleResult {
  id: string;
  label: string;
  description: string;
  status: RuleStatus;
  /** Headline computed value, e.g. "€1,400 available". */
  valueLabel: string;
  /** The threshold it was tested against. */
  thresholdLabel: string;
  inputs: RuleInput[];
  /** Source transactions backing this rule's figures (explainability). */
  txnIds: string[];
}

export interface MonthlyIncome {
  month: string;
  income: number;
}

export interface IncomeAnalysis {
  monthlyNet: number;
  cadence: "monthly" | "irregular";
  stability: number;
  stabilityLabel: string;
  tenureMonths: number;
  monthly: MonthlyIncome[];
  detectedEmployer?: string;
  txnIds: string[];
}

export interface ObligationItem {
  category: Category;
  label: string;
  monthly: number;
  count: number;
  txnIds: string[];
}

export interface ObligationsAnalysis {
  items: ObligationItem[];
  totalMonthly: number;
  rentMonthly: number;
  rentTxnIds: string[];
}

export interface AdverseAnalysis {
  overdraftCount: number;
  overdraftTxnIds: string[];
  gamblingCount: number;
  gamblingSpend: number;
  gamblingTxnIds: string[];
  severity: "none" | "mild" | "severe";
  conditions: string[];
}

/**
 * Decision-relevant view of a credit-bureau record (the fictional Demo Credit
 * Registry). The engine only needs the score and whether a hard negative is
 * present; the full disclosure (individual negatives) lives in the registry.
 */
export interface BureauInput {
  /** 0–100, higher is better (synthetic). */
  score: number;
  band: string;
  /** Active default / insolvency / public-register entry → knock-out. */
  hardNegative: boolean;
  /** Total negative features on file. */
  negativeCount: number;
  /** Short label of the worst negative, for the rule readout. */
  worstNegativeLabel?: string;
}

/**
 * Bank-connection coverage, computed by the caller (which knows the persona's
 * full bank set) and passed into the decision. Drives the R7 data-coverage rule.
 * Kept pre-resolved so the engine stays free of any demo-bank dependency.
 */
export interface CoverageInput {
  /** Banks the applicant actually connected (AIS consent granted). */
  connectedCount: number;
  /** Banks the applicant is known to hold (registry + IBAN discovery). */
  knownCount: number;
  /** Display names of the known banks that were NOT connected. */
  missingBankNames: string[];
  /** Credit agreements the registry discloses at the unconnected banks. */
  missingCreditCount: number;
}

/** Data-completeness summary surfaced on the decision package (for the UI). */
export interface DataCoverage {
  connectedCount: number;
  knownCount: number;
  /** 0–100. */
  percent: number;
  missingBankNames: string[];
  missingCreditCount: number;
  /** True when every known bank is connected. */
  complete: boolean;
}

export interface HaushaltLine {
  id: string;
  label: string;
  amount: number;
  kind: "income" | "deduction" | "result";
  note?: string;
  txnIds: string[];
}

export interface Haushaltsrechnung {
  netIncome: number;
  livingAllowance: number;
  rent: number;
  obligations: number;
  available: number;
  lines: HaushaltLine[];
}

export interface DecisionPackage {
  product: ProductConfig;
  request: LoanRequest;
  income: IncomeAnalysis;
  obligations: ObligationsAnalysis;
  adverse: AdverseAnalysis;
  haushalt: Haushaltsrechnung;
  instalment: number;
  stressedInstalment: number;
  dti: number;
  rules: RuleResult[];
  /** The bureau record the decision used, if any (for explainability). */
  bureau?: BureauInput;
  outcome: DecisionOutcome;
  outcomeLabel: string;
  conditions: string[];
  recommendedLimit: number | null;
  maxEligible: number;
  /** Bank-connection coverage behind the decision, if supplied by the caller. */
  dataCoverage?: DataCoverage;
  /** Categorised transactions the package was computed from. */
  transactions: CategorisedTransaction[];
}
