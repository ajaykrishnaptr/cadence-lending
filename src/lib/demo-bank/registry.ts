import type { Category } from "../categories";
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
