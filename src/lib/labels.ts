import type { LoanPurpose } from "./types";

export const PURPOSE_LABELS: Record<LoanPurpose, string> = {
  "debt-consolidation": "Debt consolidation",
  "home-improvement": "Home improvement",
  vehicle: "Vehicle",
  "major-purchase": "Major purchase",
  other: "Other",
};

export function purposeLabel(p: LoanPurpose): string {
  return PURPOSE_LABELS[p] ?? p;
}
