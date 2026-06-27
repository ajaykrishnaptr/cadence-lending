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
  outcome: DecisionOutcome;
  outcomeLabel: string;
  conditions: string[];
  recommendedLimit: number | null;
  maxEligible: number;
  /** Categorised transactions the package was computed from. */
  transactions: CategorisedTransaction[];
}
