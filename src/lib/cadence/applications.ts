import { listPersonas, getProfile } from "../demo-bank";
import type {
  ApplicationStatus,
  ConsentScope,
  DecisionOutcome,
  LoanRequest,
} from "../types";
import { getStore, type AppRecord } from "../store";
import { getDecision } from ".";

export interface ConsentView {
  id: string | null;
  scope: ConsentScope;
  purpose: string;
  grantedAt: string;
  expiresAt: string;
  status: "active" | "withdrawn";
  withdrawnAt: string | null;
  source: "seed" | "session";
}

export interface AppListItem {
  id: string;
  personaId: string;
  applicantName: string;
  request: LoanRequest;
  status: ApplicationStatus;
  source: "seed" | "applicant";
  submittedAt: string;
  isSeed: boolean;
  outcome: DecisionOutcome;
  outcomeLabel: string;
  available: number;
  dti: number;
  monthlyNet: number;
  recommendedLimit: number | null;
}

const FULL_SCOPE: ConsentScope = {
  accounts: true,
  balances: true,
  transactions: true,
  standingOrders: true,
};

const CONSENT_PURPOSE =
  "Creditworthiness assessment for a consumer instalment loan application";

export function outcomeToStatus(outcome: DecisionOutcome): ApplicationStatus {
  return outcome === "approve" ? "approved" : outcome === "refer" ? "referred" : "declined";
}

function seedId(personaId: string): string {
  return `seed-${personaId}`;
}

/** Deterministic consent dates for seeded personas (granted in the recent past). */
function seedConsent(personaId: string, index: number): ConsentView {
  const grantedDay = 4 + index * 6;
  const granted = new Date(Date.UTC(2026, 3, grantedDay)); // April 2026
  const expires = new Date(granted);
  expires.setUTCDate(expires.getUTCDate() + 180);
  return {
    id: null,
    scope: FULL_SCOPE,
    purpose: CONSENT_PURPOSE,
    grantedAt: granted.toISOString(),
    expiresAt: expires.toISOString(),
    status: "active",
    withdrawnAt: null,
    source: "seed",
  };
}

function seedSubmittedAt(index: number): string {
  return new Date(Date.UTC(2026, 5, 2 + index * 3, 9, 0, 0)).toISOString();
}

/** The 6 seeded personas as already-decided portfolio applications. */
export async function getSeedApplications(): Promise<AppListItem[]> {
  const personas = listPersonas();
  return Promise.all(
    personas.map(async (p, i) => {
      const d = await getDecision(p.id, p.request, "seed");
      return {
        id: seedId(p.id),
        personaId: p.id,
        applicantName: p.name,
        request: p.request,
        status: outcomeToStatus(d.outcome),
        source: "seed" as const,
        submittedAt: seedSubmittedAt(i),
        isSeed: true,
        outcome: d.outcome,
        outcomeLabel: d.outcomeLabel,
        available: d.haushalt.available,
        dti: d.dti,
        monthlyNet: d.income.monthlyNet,
        recommendedLimit: d.recommendedLimit,
      };
    }),
  );
}

async function sessionAppToItem(a: AppRecord): Promise<AppListItem> {
  const request: LoanRequest = {
    amount: a.amount,
    termMonths: a.termMonths,
    purpose: a.purpose,
  };
  const d = await getDecision(a.personaId, request, "seed");
  return {
    id: a.id,
    personaId: a.personaId,
    applicantName: a.applicantName,
    request,
    status: a.status,
    source: "applicant",
    submittedAt: a.submittedAt,
    isSeed: false,
    outcome: d.outcome,
    outcomeLabel: d.outcomeLabel,
    available: d.haushalt.available,
    dti: d.dti,
    monthlyNet: d.income.monthlyNet,
    recommendedLimit: d.recommendedLimit,
  };
}

/** Seeded portfolio + this session's submitted applications, newest first. */
export async function getConsoleApplications(sessionId: string): Promise<AppListItem[]> {
  const store = getStore();
  const [seed, session] = await Promise.all([
    getSeedApplications(),
    store.listApplications(sessionId),
  ]);
  const sessionItems = await Promise.all(session.map(sessionAppToItem));
  // session submissions first (most relevant to the visitor), then portfolio
  return [...sessionItems, ...seed];
}

export interface ApplicationResolved {
  isSeed: boolean;
  personaId: string;
  applicantName: string;
  request: LoanRequest;
  status: ApplicationStatus;
  submittedAt: string;
  appId: string;
}

/** Resolve a console application id (seed-* or a session row) to its inputs. */
export async function resolveApplication(
  sessionId: string,
  id: string,
): Promise<ApplicationResolved | undefined> {
  if (id.startsWith("seed-")) {
    const personaId = id.slice("seed-".length);
    const profile = getProfile(personaId);
    if (!profile) return undefined;
    const index = listPersonas().findIndex((p) => p.id === personaId);
    return {
      isSeed: true,
      personaId,
      applicantName: profile.name,
      request: profile.request,
      status: "pending",
      submittedAt: seedSubmittedAt(Math.max(0, index)),
      appId: id,
    };
  }
  const a = await getStore().getApplicationById(sessionId, id);
  if (!a) return undefined;
  return {
    isSeed: false,
    personaId: a.personaId,
    applicantName: a.applicantName,
    request: { amount: a.amount, termMonths: a.termMonths, purpose: a.purpose },
    status: a.status,
    submittedAt: a.submittedAt,
    appId: a.id,
  };
}

/** Consent for an application: synthesized for seed, from the store for session. */
export async function getConsentView(
  sessionId: string,
  resolved: ApplicationResolved,
): Promise<ConsentView | undefined> {
  if (resolved.isSeed) {
    const index = Math.max(0, listPersonas().findIndex((p) => p.id === resolved.personaId));
    return seedConsent(resolved.personaId, index);
  }
  const c = await getStore().getConsentForApplication(sessionId, resolved.appId);
  if (!c) return undefined;
  return {
    id: c.id,
    scope: c.scope,
    purpose: c.purpose,
    grantedAt: c.grantedAt,
    expiresAt: c.expiresAt,
    status: c.status,
    withdrawnAt: c.withdrawnAt,
    source: "session",
  };
}

export { FULL_SCOPE, CONSENT_PURPOSE };
