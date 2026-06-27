import type { Category } from "../categories";
import type { BureauInput } from "../engine/types";
import { getBank } from "./banks";
import { getProfile, type ProfileSpec, type RecurringSpec } from "./personas";

/**
 * Demo Credit Registry — a FICTIONAL, synthetic stand-in for a consumer credit
 * bureau. It is NOT a real bureau and names no real scheme. With the applicant's
 * consent it discloses the bank relationships and credit agreements it holds on
 * record, which lets Cadence pre-seed the bank picker BEFORE any account is
 * connected — a cold-start discovery source that complements the IBAN nudge
 * (which only works once transaction data is already flowing). Both paths route
 * into the same per-bank AIS consent.
 *
 * In a real bureau the disclosure is the credit file; here it is derived
 * deterministically from the same synthetic persona definition that drives Demo
 * Bank, so the registry and the open-banking data always agree.
 */

const OBLIGATION_LABEL: Partial<Record<Category, string>> = {
  "loan-repayment": "Instalment loan",
  bnpl: "BNPL agreement",
  "other-credit": "Revolving credit line",
};

export interface RegistryDisclosure {
  bankId: string;
  bankName: string;
  /** Whether Cadence can actually pull open-banking data for this institution. */
  hasData: boolean;
  /** "Current account" | "Savings account" | a credit-agreement label. */
  relationship: string;
  /** True for credit agreements (loans, BNPL, revolving) — highlighted in the UI. */
  isCredit: boolean;
  /** Free-text detail: lender/counterparty or account name. */
  detail: string;
  /** Year the relationship was opened (synthetic). */
  since: number;
  /** Masked agreement/account reference (synthetic). */
  maskedRef: string;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function maskedRef(seed: string): string {
  return `•••• ${String((hash(seed) % 9000) + 1000)}`;
}

function sinceYear(seed: string): number {
  return 2014 + (hash(seed) % 10); // 2014–2023
}

function creditDisclosures(
  bankId: string,
  bankNm: string,
  hasData: boolean,
  recurring: RecurringSpec[],
): RegistryDisclosure[] {
  return recurring
    .filter((r) => OBLIGATION_LABEL[r.category])
    .map((r) => {
      const seed = `${bankId}-${r.desc}-${r.amount}`;
      return {
        bankId,
        bankName: bankNm,
        hasData,
        relationship: OBLIGATION_LABEL[r.category]!,
        isCredit: true,
        detail: r.counterparty ?? r.desc,
        since: sinceYear(seed),
        maskedRef: maskedRef(seed),
      };
    });
}

/** What the registry holds on record for a persona (consent-gated in the UI). */
export function queryCreditRegistry(personaId: string): RegistryDisclosure[] {
  const profile: ProfileSpec | undefined = getProfile(personaId);
  if (!profile) return [];
  const out: RegistryDisclosure[] = [];

  // --- primary bank: current account + any credit agreements on the main file ---
  const demo = getBank("demo-bank")!;
  out.push({
    bankId: demo.id,
    bankName: demo.name,
    hasData: demo.hasData,
    relationship: "Current account",
    isCredit: false,
    detail: "Primary salary account",
    since: sinceYear(`${personaId}-demo-bank`),
    maskedRef: maskedRef(`${personaId}-demo-bank`),
  });
  out.push(...creditDisclosures(demo.id, demo.name, demo.hasData, profile.recurring));

  // --- second bank: account relationship(s) + their credit agreements ---
  if (profile.secondBank) {
    const sb = profile.secondBank;
    const bank = getBank(sb.bankId);
    const bankNm = bank?.name ?? sb.bankId;
    const hasData = bank?.hasData ?? false;
    for (const acc of sb.accounts) {
      out.push({
        bankId: sb.bankId,
        bankName: bankNm,
        hasData,
        relationship: acc.type === "savings" ? "Savings account" : "Current account",
        isCredit: false,
        detail: acc.name,
        since: sinceYear(`${personaId}-${sb.bankId}-${acc.name}`),
        maskedRef: maskedRef(`${personaId}-${sb.bankId}-${acc.name}`),
      });
      out.push(...creditDisclosures(sb.bankId, bankNm, hasData, acc.recurring ?? []));
    }
  }

  return out;
}

/** Distinct banks the registry can disclose for a persona (picker pre-seed). */
export function registryBanks(personaId: string): string[] {
  return [...new Set(queryCreditRegistry(personaId).map((d) => d.bankId))];
}

// ---- credit score + negative features (the bureau's decision inputs) ----

export interface BureauNegative {
  kind: "default" | "collection" | "insolvency" | "public-register";
  label: string;
  detail: string;
  /** Hard negatives (active default / insolvency / public register) knock out. */
  hard: boolean;
  since: number;
}

export interface BureauProfile {
  /** 0–100, higher is better (synthetic). */
  score: number;
  band: string;
  negatives: BureauNegative[];
}

/** Synthetic per-persona credit scores. Most are clean; one is a knock-out. */
const BUREAU_SCORE: Record<string, number> = {
  "clara-bauer": 96,
  "tomas-neuer": 84,
  "mara-vogel": 63,
  "jonas-frei": 95,
  "sofia-lindqvist": 81,
  "erik-hofer": 88,
  "lena-brandt": 86,
  "bruno-falk": 31,
};

/** Negative features on file. Only the knock-out persona carries hard negatives. */
const BUREAU_NEGATIVES: Record<string, BureauNegative[]> = {
  "bruno-falk": [
    { kind: "default", label: "Active payment default", detail: "TelKom Nord — €1,240 outstanding", hard: true, since: 2025 },
    { kind: "collection", label: "Debt-collection request", detail: "Inkasso Rhein GmbH", hard: false, since: 2025 },
  ],
};

function scoreBand(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 45) return "Elevated risk";
  return "High risk";
}

/** The bureau's full record for a persona (score + negatives). */
export function creditBureauProfile(personaId: string): BureauProfile {
  const score = BUREAU_SCORE[personaId] ?? 80;
  return { score, band: scoreBand(score), negatives: BUREAU_NEGATIVES[personaId] ?? [] };
}

/** Decision-relevant view the engine consumes. */
export function bureauInput(personaId: string): BureauInput {
  const p = creditBureauProfile(personaId);
  const hard = p.negatives.find((n) => n.hard);
  return {
    score: p.score,
    band: p.band,
    hardNegative: Boolean(hard),
    negativeCount: p.negatives.length,
    worstNegativeLabel: hard?.label ?? p.negatives[0]?.label,
  };
}
