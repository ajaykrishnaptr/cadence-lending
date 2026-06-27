"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ROLE_COOKIE } from "@/middleware";
import { getSessionId } from "./session";
import { getStore } from "./store";
import { getProfile, banksForPersona, bankName, detectConnectableBanks, queryCreditRegistry, creditBureauProfile } from "./demo-bank";
import { getDecision, getCategorised } from "./cadence";
import { originationChecks } from "./origination";
import "./llm"; // side-effect: registers the live Gemini categoriser
import { outcomeToStatus } from "./cadence/applications";
import { CONSENT_PURPOSE, FULL_SCOPE } from "./cadence/applications";
import type { ConsentScope, DecisionOutcome, LoanPurpose } from "./types";

// ---- auth (mock) ----
export async function loginAs(role: "officer" | "applicant", next?: string) {
  const jar = await cookies();
  jar.set(ROLE_COOKIE, role, { sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return { ok: true, redirect: next || (role === "officer" ? "/console" : "/apply") };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ROLE_COOKIE);
  return { ok: true };
}

// ---- reset session data ----
export async function resetDemoData() {
  const sid = await getSessionId();
  await getStore().resetSession(sid);
  revalidatePath("/console");
  revalidatePath("/console/applications");
  revalidatePath("/console/consents");
  revalidatePath("/console/audit");
  return { ok: true };
}

// ---- applicant journey: submit (writes consent + application + audit) ----
export interface SubmitInput {
  personaId: string;
  amount: number;
  termMonths: number;
  purpose: LoanPurpose;
  scope?: ConsentScope;
  /** ASPSPs the applicant chose to connect (default: all the persona's banks). */
  connectedBanks?: string[];
}

export async function submitApplication(input: SubmitInput) {
  const sid = await getSessionId();
  const store = getStore();
  const profile = getProfile(input.personaId);
  if (!profile) return { ok: false as const, error: "Unknown applicant" };

  const request = { amount: input.amount, termMonths: input.termMonths, purpose: input.purpose };
  const scope = input.scope ?? FULL_SCOPE;
  // only the banks the applicant actually connected (intersected with what they hold)
  const all = banksForPersona(input.personaId);
  const banks = (input.connectedBanks?.length ? input.connectedBanks : all).filter((b) => all.includes(b));

  // 1. consent (180-day expiry) — decorative gating, but a real record
  const grantedAt = new Date();
  const expiresAt = new Date(grantedAt);
  expiresAt.setDate(expiresAt.getDate() + 180);

  const app = await store.createApplication({
    sessionId: sid,
    personaId: input.personaId,
    applicantName: profile.name,
    amount: request.amount,
    termMonths: request.termMonths,
    purpose: request.purpose,
    status: "pending",
    source: "applicant",
    connectedBanks: banks,
  });

  // one consent per ASPSP — each bank grants access independently (PSD2)
  const grantedScopes = Object.values(scope).filter(Boolean).length;
  for (const bankId of banks) {
    await store.createConsent({
      sessionId: sid,
      personaId: input.personaId,
      bankId,
      applicationId: app.id,
      scope,
      purpose: CONSENT_PURPOSE,
      grantedAt: grantedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  // 2. engine decision (records the recommendation; status stays pending for the officer)
  const decision = await getDecision(input.personaId, request, "seed", undefined, banks);
  await store.recordDecision({
    sessionId: sid,
    applicationId: app.id,
    outcome: decision.outcome,
    outcomeLabel: decision.outcomeLabel,
    recommendedLimit: decision.recommendedLimit,
    categoriserSource: decision.categoriserSource,
    decidedBy: "engine",
  });

  // 3. audit trail for the full flow
  const checks = originationChecks(input.personaId, decision);
  const incomeCheck = checks.checks.find((c) => c.id === "income");

  // coverage gap: banks the applicant holds (per the registry) but did not connect
  const missingBanks = all.filter((b) => !banks.includes(b));
  const registryDisclosures = queryCreditRegistry(input.personaId);
  const missingCredit = registryDisclosures.filter(
    (d) => d.isCredit && missingBanks.includes(d.bankId),
  ).length;
  const events: { type: string; message: string; actor: "applicant" | "system"; meta?: Record<string, unknown> }[] = [
    ...banks.map((bankId) => ({
      type: "consent.granted",
      message: `Consent granted to ${bankName(bankId)} for account information access (180-day expiry, ${grantedScopes}/4 scopes).`,
      actor: "applicant" as const,
      meta: { bankId, scope },
    })),
    { type: "onboarding.kyc", message: `Onboarding checks ${checks.allClear ? "cleared" : "flagged"} — identity verified, sanctions/PEP no match, AML low risk, no fraud signals; income verification ${incomeCheck?.status ?? "pass"}.`, actor: "system", meta: { allClear: checks.allClear, checks: checks.checks.map((c) => ({ id: c.id, status: c.status })) } },
    { type: "data.pull", message: `Aggregated accounts and ~6 months of transactions across ${banks.length} bank${banks.length > 1 ? "s" : ""} (${banks.map(bankName).join(", ")}) via the AIS provider (Berlin Group NextGenPSD2).`, actor: "system", meta: { banks, standard: "Berlin Group NextGenPSD2 XS2A" } },
    ...(missingBanks.length
      ? [{
          type: "data.coverage_gap",
          message: `Coverage gap — applicant connected ${banks.length} of ${all.length} known bank${all.length > 1 ? "s" : ""}. ${missingBanks.map(bankName).join(", ")} not connected${missingCredit > 0 ? `; the registry discloses ${missingCredit} credit agreement${missingCredit === 1 ? "" : "s"} there` : ""}. Automated approval is withheld pending full coverage.`,
          actor: "system" as const,
          meta: { connected: banks, missing: missingBanks, missingCredit },
        }]
      : []),
    { type: "categorisation", message: `Categorised ${decision.transactions.length} transactions (${decision.categoriserSource} categoriser).`, actor: "system", meta: { source: decision.categoriserSource, count: decision.transactions.length } },
    { type: "decision.automated", message: `Automated decision produced by the affordability engine + credit-bureau rule: ${decision.outcomeLabel}. Under GDPR Art. 22(3) the applicant may request human review.`, actor: "system", meta: { outcome: decision.outcome, recommendedLimit: decision.recommendedLimit, bureauScore: decision.bureau?.score ?? null, automated: true } },
    { type: "application.submitted", message: `Application submitted from a comparison-portal lead — €${request.amount.toLocaleString("de-DE")} over ${request.termMonths} months.`, actor: "applicant" },
  ];
  for (const e of events) {
    await store.appendAudit({ sessionId: sid, applicationId: app.id, ...e });
  }

  revalidatePath("/console");
  revalidatePath("/console/applications");
  return { ok: true as const, applicationId: app.id, outcome: decision.outcome };
}

// ---- officer decision (override → audit) ----
export async function recordOfficerDecision(input: {
  applicationId: string;
  outcome: DecisionOutcome;
  outcomeLabel: string;
  recommendedLimit: number | null;
  note?: string;
}) {
  const sid = await getSessionId();
  const store = getStore();
  // Seeded portfolio apps have no applications row; their officer decision is
  // recorded as a session-scoped overlay (decision + audit keyed by sessionId +
  // the seed app id), so the global seed data is never mutated.
  const isSeed = input.applicationId.startsWith("seed-");
  const app = isSeed ? null : await store.getApplicationById(sid, input.applicationId);
  if (!isSeed && !app) return { ok: false as const, error: "Application not found in this session." };

  await store.ensureSession(sid);
  if (app) await store.updateApplicationStatus(sid, input.applicationId, outcomeToStatus(input.outcome));
  await store.recordDecision({
    sessionId: sid,
    applicationId: input.applicationId,
    outcome: input.outcome,
    outcomeLabel: input.outcomeLabel,
    recommendedLimit: input.recommendedLimit,
    categoriserSource: "seed",
    decidedBy: "officer",
    note: input.note ?? null,
  });
  await store.appendAudit({
    sessionId: sid,
    applicationId: input.applicationId,
    type: "decision.officer",
    message: `Officer recorded decision: ${input.outcomeLabel}${input.note ? ` — ${input.note}` : ""}.`,
    actor: "officer",
    meta: { outcome: input.outcome, recommendedLimit: input.recommendedLimit },
  });
  revalidatePath(`/console/applications/${input.applicationId}`);
  revalidatePath("/console");
  return { ok: true as const };
}

// ---- GDPR Art. 22(3): applicant requests human review of the automated decision ----
export async function requestHumanReviewAction(input: { applicationId: string }) {
  const sid = await getSessionId();
  const store = getStore();
  const app = await store.getApplicationById(sid, input.applicationId);
  // Seed/portfolio apps are read-only; only a real session application escalates.
  if (app && app.source !== "seed") {
    await store.updateApplicationStatus(sid, input.applicationId, "referred");
  }
  await store.appendAudit({
    sessionId: sid,
    applicationId: input.applicationId,
    type: "art22.human_review_requested",
    message: "Applicant exercised the GDPR Art. 22(3) right to human intervention — application escalated to an underwriter for manual review.",
    actor: "applicant",
    meta: { legalBasis: "GDPR Art. 22(3)" },
  });
  revalidatePath(`/console/applications/${input.applicationId}`);
  revalidatePath("/console");
  return { ok: true as const };
}

// ---- "connect your other bank" nudge ----
export async function suggestBanksAction(input: { personaId: string; connectedBanks: string[] }) {
  return { ok: true as const, suggestions: detectConnectableBanks(input.personaId, input.connectedBanks) };
}

// ---- Demo Credit Registry lookup (fictional bureau; cold-start discovery) ----
export async function queryRegistryAction(input: { personaId: string }) {
  const sid = await getSessionId();
  const disclosures = queryCreditRegistry(input.personaId);
  const bureau = creditBureauProfile(input.personaId);
  const banks = [...new Set(disclosures.map((d) => d.bankId))];
  const creditCount = disclosures.filter((d) => d.isCredit).length;
  const hardNeg = bureau.negatives.some((n) => n.hard);
  await getStore().appendAudit({
    sessionId: sid,
    applicationId: null,
    type: "registry.query",
    message: `Demo Credit Registry consulted with consent (synthetic bureau) — score ${bureau.score}/100 (${bureau.band}), ${bureau.negatives.length} negative feature${bureau.negatives.length === 1 ? "" : "s"}${hardNeg ? " incl. a hard negative" : ""}; disclosed ${creditCount} credit agreement${creditCount === 1 ? "" : "s"} across ${banks.length} institution${banks.length === 1 ? "" : "s"}.`,
    actor: "applicant",
    meta: { banks, disclosures: disclosures.length, creditAgreements: creditCount, score: bureau.score, negatives: bureau.negatives.length, hardNegative: hardNeg },
  });
  return { ok: true as const, disclosures, bureau };
}

// ---- live re-categorisation (Gemini, with rules fallback) ----
export async function recategoriseAction(input: { personaId: string }) {
  const sid = await getSessionId();
  const result = await getCategorised(input.personaId, "gemini");
  const cache = result.cache;
  const modelNote = result.model ? ` via ${result.model}` : "";
  const cacheNote = cache ? ` (${cache.hits} from cache, ${cache.misses} live model calls${modelNote}; ${cache.store} cache)` : "";
  await getStore().appendAudit({
    sessionId: sid,
    applicationId: null,
    type: "categorisation.live",
    message: `Live re-categorisation requested — ran ${result.source} categoriser on ${result.transactions.length} transactions${result.fellBack ? " (fell back to rules; no model available)" : cacheNote}.`,
    actor: "officer",
    meta: { source: result.source, fellBack: result.fellBack ?? false, error: result.error ?? null, cache: cache ?? null, model: result.model ?? null },
  });
  return {
    ok: true as const,
    source: result.source,
    fellBack: result.fellBack ?? false,
    error: result.error,
    cache: cache ?? null,
    model: result.model ?? null,
    transactions: result.transactions,
  };
}

// ---- regenerate grounded rationale (Gemini, with deterministic fallback) ----
export async function regenerateRationaleAction(input: {
  personaId: string;
  amount: number;
  termMonths: number;
  purpose: LoanPurpose;
}) {
  const profile = getProfile(input.personaId);
  if (!profile) return { ok: false as const, error: "Unknown applicant" };
  const request = { amount: input.amount, termMonths: input.termMonths, purpose: input.purpose };
  const decision = await getDecision(input.personaId, request, "gemini");
  const { generateRationale } = await import("./llm");
  const r = await generateRationale(decision, profile.name);
  return { ok: true as const, rationale: r.text, source: r.source, fellBack: r.fellBack, model: r.model ?? null };
}

// ---- live model evaluation (Gemini over a labelled sample) ----
export async function runLiveEvalAction() {
  const { evaluateWithGemini } = await import("./llm");
  const { toEvalView } = await import("./eval");
  const r = await evaluateWithGemini();
  return {
    ok: true as const,
    source: r.source,
    fellBack: r.fellBack ?? false,
    error: r.error ?? null,
    sampled: r.sampled ?? false,
    sampleSize: r.sampleSize ?? null,
    totalAvailable: r.totalAvailable ?? null,
    cache: r.cache ?? null,
    model: r.model ?? null,
    view: toEvalView(r.result),
  };
}

// ---- consent withdrawal (session apps; seed apps are visual-only in the UI) ----
export async function withdrawConsentAction(input: { consentId: string; applicationId: string }) {
  const sid = await getSessionId();
  const store = getStore();
  const c = await store.withdrawConsent(sid, input.consentId);
  if (!c) return { ok: false as const, error: "Consent not found" };

  // For a real session application, withdrawing a bank shrinks the connected set,
  // so the affordability picture (and the data-coverage rule) is recomputed on
  // the banks that remain. Seed/portfolio apps have no stored row — there the
  // withdrawal stays a visual state, as before.
  const app = await store.getApplicationById(sid, input.applicationId);
  let recomputedLabel: string | null = null;
  if (app && app.source !== "seed") {
    const current = app.connectedBanks ?? banksForPersona(app.personaId);
    const remaining = current.filter((b) => b !== c.bankId);
    await store.updateConnectedBanks(sid, app.id, remaining);
    const request = { amount: app.amount, termMonths: app.termMonths, purpose: app.purpose };
    const d = await getDecision(app.personaId, request, "seed", undefined, remaining);
    await store.updateApplicationStatus(sid, app.id, outcomeToStatus(d.outcome));
    recomputedLabel = d.outcomeLabel;
  }

  await store.appendAudit({
    sessionId: sid,
    applicationId: input.applicationId,
    type: "consent.withdrawn",
    message: recomputedLabel
      ? `Consent withdrawn for ${bankName(c.bankId)}. Decision recomputed on the remaining banks: ${recomputedLabel}.`
      : `Consent withdrawn for ${bankName(c.bankId)}. Account data hidden from the console (visual state).`,
    actor: "applicant",
    meta: { consentId: input.consentId, bankId: c.bankId, recomputed: recomputedLabel },
  });
  revalidatePath(`/console/applications/${input.applicationId}`);
  revalidatePath("/console");
  revalidatePath("/console/consents");
  return { ok: true as const };
}
