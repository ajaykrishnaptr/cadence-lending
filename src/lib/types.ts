import type { Category } from "./categories";

export type Direction = "credit" | "debit";

/** What a real AIS feed exposes: no labels, just the raw booking line. */
export interface Transaction {
  id: string;
  accountId: string;
  /** ISO date (YYYY-MM-DD). */
  bookingDate: string;
  /** Signed EUR amount: credits positive, debits negative. */
  amount: number;
  currency: "EUR";
  /** Raw bank description, as it would appear on a statement. */
  description: string;
  counterparty?: string;
  direction: Direction;
  /** Which ASPSP this line came from (set by the AIS aggregator). */
  bankId?: string;
  /** Running balance after this line (Berlin Group balanceAfterTransaction). */
  balanceAfter?: number;
}

export interface Account {
  id: string;
  /** Which ASPSP this account is held at. */
  bankId: string;
  type: "checking" | "savings";
  name: string;
  /** Full IBAN as the ASPSP returns it; masked for display in the UI. */
  iban: string;
  balance: number;
  currency: "EUR";
}

/** The categoriser's output shape (mirrors the Zod schema in §8). */
export interface Categorisation {
  category: Category;
  subcategory: string;
  /** 0–1. */
  confidence: number;
  isIncome: boolean;
  isRecurring: boolean;
  isObligation: boolean;
}

export type CategoriserSource = "seed" | "rules" | "gemini";

export interface CategorisedTransaction extends Transaction {
  categorisation: Categorisation;
  source: CategoriserSource;
}

/** Ground-truth label assigned by the Demo Bank generator (eval only). */
export interface GroundTruth {
  category: Category;
  isIncome: boolean;
  isRecurring: boolean;
  isObligation: boolean;
}

export type DecisionOutcome = "approve" | "refer" | "decline";

export type ApplicationStatus =
  | "pending"
  | "approved"
  | "referred"
  | "declined";

export type LoanPurpose =
  | "debt-consolidation"
  | "home-improvement"
  | "vehicle"
  | "major-purchase"
  | "other";

export interface LoanRequest {
  amount: number;
  termMonths: number;
  purpose: LoanPurpose;
}

export interface PersonaProfile {
  id: string;
  name: string;
  /** Short headline shown in lists. */
  tagline: string;
  /** Expected demo outcome (for narration; not used by the engine). */
  expected: DecisionOutcome | "approve-conditions";
  expectedLabel: string;
  age: number;
  occupation: string;
  city: string;
  householdSize: number;
  /** Months of statement history available. */
  tenureMonths: number;
  /** Default loan request pre-filled in the applicant flow. */
  request: LoanRequest;
  /** Whether this persona is a hand-authored hard/ambiguous eval case. */
  hardCase?: boolean;
  /** ASPSP ids the applicant banks with (aggregated by Cadence). */
  banks: string[];
  blurb: string;
}

export interface ConsentScope {
  accounts: boolean;
  balances: boolean;
  transactions: boolean;
  standingOrders: boolean;
}

export interface ConsentRecord {
  id: string;
  personaId: string;
  scope: ConsentScope;
  purpose: string;
  grantedAt: string;
  /** grantedAt + 180 days. */
  expiresAt: string;
  status: "active" | "withdrawn";
  withdrawnAt?: string;
}
