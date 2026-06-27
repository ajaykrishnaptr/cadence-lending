import type { DecisionPackage } from "./engine";

/**
 * Origination checks & governance — the layer around the affordability+bureau
 * decision that a real consumer-lending flow requires but that sits outside the
 * scored decision: identity verification, sanctions/PEP and AML screening, fraud
 * signals, and income corroboration; plus the GDPR Art. 22 / §31 BDSG framing of
 * the automated decision. All synthetic. These are NOT inputs to runDecision —
 * they are pre-conditions and governance, surfaced for completeness and to show
 * the demo understands where the deterministic engine stops.
 */

export type CheckStatus = "pass" | "review" | "fail";

export interface OriginationCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface OriginationChecks {
  checks: OriginationCheck[];
  /** All hard onboarding gates (identity, sanctions, AML, fraud) clear. */
  allClear: boolean;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function maskedRef(personaId: string): string {
  return `ID-••${String((hash(personaId) % 9000) + 1000)}`;
}

/**
 * Deterministic per-persona onboarding checks. In the demo every hard gate is
 * clear (synthetic identities); income verification reflects the real income
 * analysis, so a thin/irregular file is flagged for corroboration — which is an
 * honest limitation, not a decision the engine makes.
 */
export function originationChecks(personaId: string, decision: DecisionPackage): OriginationChecks {
  const identity: OriginationCheck = {
    id: "identity",
    label: "Identity verification",
    status: "pass",
    detail: `Verified via video-/eID-ident (synthetic) · ${maskedRef(personaId)}`,
  };
  const sanctions: OriginationCheck = {
    id: "sanctions",
    label: "Sanctions & PEP screening",
    status: "pass",
    detail: "No match on sanctions or politically-exposed-person lists (synthetic).",
  };
  const aml: OriginationCheck = {
    id: "aml",
    label: "AML risk rating",
    status: "pass",
    detail: "Low — no structuring, cash-intensive or high-risk-jurisdiction flows detected.",
  };
  const fraud: OriginationCheck = {
    id: "fraud",
    label: "Fraud & device signals",
    status: "pass",
    detail: "No velocity, device-reuse or synthetic-identity signals.",
  };

  const inc = decision.income;
  let income: OriginationCheck;
  if (inc.cadence === "irregular" || inc.tenureMonths < 3) {
    income = {
      id: "income",
      label: "Income verification",
      status: "review",
      detail: `Income is ${inc.cadence === "irregular" ? "irregular" : "thin"} (${inc.tenureMonths} mo history). Recommend payslip / employer corroboration before drawdown.`,
    };
  } else {
    income = {
      id: "income",
      label: "Income verification",
      status: "pass",
      detail: `Salary corroborated from ${inc.tenureMonths} months of recurring credits${inc.detectedEmployer ? ` (${inc.detectedEmployer})` : ""}, ${(inc.stability * 100).toFixed(0)}% stable. Demo: bank-feed only — no payslip/employer API.`,
    };
  }

  const hardGates = [identity, sanctions, aml, fraud];
  return {
    checks: [identity, sanctions, aml, fraud, income],
    allClear: hardGates.every((c) => c.status === "pass"),
  };
}
