/**
 * The engine is product-parameterised: one rule core, different parameter sets
 * per product. The consumer instalment loan is active; the mortgage parameter
 * set is defined here to prove the seam, but its screen is inactive in the demo.
 */

export interface ProductConfig {
  id: "consumer-loan" | "mortgage";
  label: string;
  active: boolean;
  /** Fixed demo APR (decimal). */
  apr: number;
  /** Available income must cover instalment × this factor. */
  affordabilityBuffer: number;
  /** Max debt-to-income ratio (obligations + new instalment) / net income. */
  maxDti: number;
  /** Added to APR for the stress test. */
  stressRateDelta: number;
  /** Minimum months of statement history before an automated decision. */
  minTenureMonths: number;
  /** Minimum income-stability score (0–1) for a clean pass. */
  minStability: number;
  amountRange: { min: number; max: number; step: number };
  termRange: { min: number; max: number; step: number };
  /** Mortgage-only inputs, surfaced on the inactive tab. */
  mortgageInputs?: {
    maxLtv: number;
    minEquity: number;
  };
}

export const CONSUMER_LOAN: ProductConfig = {
  id: "consumer-loan",
  label: "Consumer instalment loan",
  active: true,
  apr: 0.079,
  affordabilityBuffer: 1.3,
  maxDti: 0.4,
  stressRateDelta: 0.03,
  minTenureMonths: 3,
  minStability: 0.88,
  amountRange: { min: 1000, max: 50000, step: 500 },
  termRange: { min: 12, max: 84, step: 6 },
};

export const MORTGAGE: ProductConfig = {
  id: "mortgage",
  label: "Residential mortgage",
  active: false,
  apr: 0.041,
  affordabilityBuffer: 1.4,
  maxDti: 0.35,
  stressRateDelta: 0.03,
  minTenureMonths: 12,
  minStability: 0.9,
  amountRange: { min: 50000, max: 1000000, step: 5000 },
  termRange: { min: 120, max: 360, step: 60 },
  mortgageInputs: { maxLtv: 0.9, minEquity: 0.1 },
};

export const PRODUCTS: Record<ProductConfig["id"], ProductConfig> = {
  "consumer-loan": CONSUMER_LOAN,
  mortgage: MORTGAGE,
};

/**
 * Standard living-cost allowances (Pauschalen) by household size, in EUR/month.
 * Demo figures — they represent everyday living costs (food, utilities,
 * incidentals) EXCLUDING rent and existing credit, which are counted from the
 * detected transactions separately. This is the heart of the Haushaltsrechnung.
 */
const PAUSCHALE: Record<number, number> = { 1: 950, 2: 1350, 3: 1700, 4: 2050 };
const PAUSCHALE_PER_EXTRA = 330;

export function livingAllowance(householdSize: number): number {
  if (householdSize <= 4) return PAUSCHALE[Math.max(1, householdSize)];
  return PAUSCHALE[4] + (householdSize - 4) * PAUSCHALE_PER_EXTRA;
}

export const PAUSCHALE_TABLE = PAUSCHALE;
export const PAUSCHALE_EXTRA = PAUSCHALE_PER_EXTRA;

/** Standard annuity instalment for a principal over n months at a monthly APR. */
export function monthlyInstalment(
  principal: number,
  annualRate: number,
  termMonths: number,
): number {
  const r = annualRate / 12;
  if (r === 0) return principal / termMonths;
  const factor = (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return principal * factor;
}

/** Inverse: the largest principal whose instalment fits a monthly budget. */
export function maxPrincipalForInstalment(
  instalmentBudget: number,
  annualRate: number,
  termMonths: number,
): number {
  const r = annualRate / 12;
  if (r === 0) return instalmentBudget * termMonths;
  const factor = (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return instalmentBudget / factor;
}
