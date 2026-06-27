import type { DecisionPackage } from "./engine";
import { formatEUR } from "./format";

/**
 * Deterministic, grounded rationale. Every sentence is derived strictly from the
 * computed figures in the decision package — it states the engine's reasoning,
 * never invents facts. It ships as each persona's pre-computed rationale (for
 * instant load) and is the fallback when the live model call is unavailable.
 */
export function buildRationale(d: DecisionPackage, applicantName: string): string {
  const eur = (n: number) => formatEUR(n, false);
  const first = applicantName.split(" ")[0];
  const parts: string[] = [];

  // headline
  if (d.outcome === "approve") {
    parts.push(
      `The application meets every affordability rule, so the engine returns ${d.outcomeLabel.toLowerCase()}.`,
    );
  } else if (d.outcome === "refer") {
    const reason = d.rules.find((r) => r.status === "refer");
    parts.push(
      `The application is referred rather than auto-decided because the ${reason?.label.toLowerCase() ?? "review"} check did not clear automatically.`,
    );
  } else {
    const reason = d.rules.find((r) => r.status === "fail");
    parts.push(
      `The application is declined because the ${reason?.label.toLowerCase() ?? "affordability"} check fails.`,
    );
  }

  // affordability arithmetic
  parts.push(
    `Detected net monthly income is ${eur(d.income.monthlyNet)}. After a living-cost allowance of ${eur(d.haushalt.livingAllowance)}, rent of ${eur(d.haushalt.rent)} and existing credit obligations of ${eur(d.haushalt.obligations)}, ${eur(d.haushalt.available)} remains as available income.`,
  );

  // instalment vs available
  if (d.haushalt.available >= d.instalment) {
    parts.push(
      `The proposed instalment of ${eur(d.instalment)} fits within available income${
        d.rules.find((r) => r.id === "affordability")?.status === "pass"
          ? ` with the required ${d.product.affordabilityBuffer}× buffer`
          : `, but only inside the ${d.product.affordabilityBuffer}× safety buffer`
      }.`,
    );
  } else {
    parts.push(
      `The proposed instalment of ${eur(d.instalment)} exceeds available income, so the loan is not affordable as requested.`,
    );
  }

  // dti
  parts.push(
    `Debt-to-income, including the new instalment, is ${(d.dti * 100).toFixed(0)}% against a ${(d.product.maxDti * 100).toFixed(0)}% ceiling.`,
  );

  // stability / tenure
  if (d.income.tenureMonths < d.product.minTenureMonths) {
    parts.push(
      `Only ${d.income.tenureMonths} months of statement history are available, below the ${d.product.minTenureMonths}-month minimum for an automated decision.`,
    );
  } else if (d.income.stability < d.product.minStability) {
    parts.push(
      `Income stability is ${(d.income.stability * 100).toFixed(0)}%, below the ${(d.product.minStability * 100).toFixed(0)}% threshold, indicating month-to-month variability that warrants a human look.`,
    );
  } else {
    parts.push(
      `Income is stable (${(d.income.stability * 100).toFixed(0)}%) over ${d.income.tenureMonths} months of history.`,
    );
  }

  // adverse / conditions
  if (d.conditions.length > 0) {
    parts.push(`Conditions apply: ${d.conditions.join(" ")}`);
  } else if (d.adverse.severity === "severe") {
    parts.push(
      `Adverse markers are significant (${d.adverse.overdraftCount} overdraft events, ${d.adverse.gamblingCount} gambling payments), which weighs against approval.`,
    );
  }

  // recommendation
  if (d.outcome === "approve" && d.recommendedLimit != null) {
    const headroom = d.maxEligible > d.request.amount;
    parts.push(
      `Recommended limit: ${eur(d.recommendedLimit)}${
        headroom ? `; affordability supports up to ${eur(d.maxEligible)} on these figures` : ""
      }.`,
    );
  } else if (d.outcome === "refer") {
    parts.push(`An underwriter should confirm the flagged check before proceeding for ${first}.`);
  }

  return parts.join(" ");
}
