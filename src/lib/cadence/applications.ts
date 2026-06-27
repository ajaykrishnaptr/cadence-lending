import { listPersonas, getProfile, banksForPersona } from "../demo-bank";
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
  bankId: string;
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

/** Deterministic per-bank consent dates for seeded personas (granted recently). */
function seedConsent(personaId: string, index: number, bankId: string, bankIndex: number): ConsentView {
  const grantedDay = 4 + index * 6 + bankIndex * 2;
  const granted = new Date(Date.UTC(2026, 3, grantedDay)); // April 2026
  const expires = new Date(granted);
  expires.setUTCDate(expires.getUTCDate() + 180);
  return {
    id: `seed-consent-${personaId}-${bankId}`,
    bankId,
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
  const d = await getDecision(a.personaId, request, "seed", undefined, a.connectedBanks ?? undefined);
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
  /** Connected ASPSPs (null = all the persona's banks). */
  connectedBanks: string[] | null;
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
      connectedBanks: null,
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
    connectedBanks: a.connectedBanks,
  };
}

/** Per-bank consents for an application: synthesized for seed, from the store otherwise. */
export async function getConsentViews(
  sessionId: string,
  resolved: ApplicationResolved,
): Promise<ConsentView[]> {
  if (resolved.isSeed) {
    const index = Math.max(0, listPersonas().findIndex((p) => p.id === resolved.personaId));
    return banksForPersona(resolved.personaId).map((bankId, bi) =>
      seedConsent(resolved.personaId, index, bankId, bi),
    );
  }
  const cs = await getStore().getConsentsForApplication(sessionId, resolved.appId);
  return cs.map((c) => ({
    id: c.id,
    bankId: c.bankId,
    scope: c.scope,
    purpose: c.purpose,
    grantedAt: c.grantedAt,
    expiresAt: c.expiresAt,
    status: c.status,
    withdrawnAt: c.withdrawnAt,
    source: "session" as const,
  }));
}

export { FULL_SCOPE, CONSENT_PURPOSE };

// ---- consent management view ----
export interface ConsentRow {
  id: string;
  applicationId: string;
  applicantName: string;
  personaId: string;
  bankId: string;
  scope: ConsentScope;
  grantedAt: string;
  expiresAt: string;
  status: "active" | "withdrawn";
  source: "seed" | "session";
}

export async function getConsoleConsents(sessionId: string): Promise<ConsentRow[]> {
  const personas = listPersonas();
  const seed: ConsentRow[] = personas.flatMap((p, i) =>
    banksForPersona(p.id).map((bankId, bi) => {
      const c = seedConsent(p.id, i, bankId, bi);
      return {
        id: c.id!,
        applicationId: seedId(p.id),
        applicantName: p.name,
        personaId: p.id,
        bankId,
        scope: c.scope,
        grantedAt: c.grantedAt,
        expiresAt: c.expiresAt,
        status: "active" as const,
        source: "seed" as const,
      };
    }),
  );

  const store = getStore();
  const [apps, consents] = await Promise.all([
    store.listApplications(sessionId),
    store.listConsents(sessionId),
  ]);
  const nameByApp = new Map(apps.map((a) => [a.id, a.applicantName]));
  const session: ConsentRow[] = consents.map((c) => ({
    id: c.id,
    applicationId: c.applicationId ?? "",
    applicantName: (c.applicationId && nameByApp.get(c.applicationId)) || "Applicant",
    personaId: c.personaId,
    bankId: c.bankId,
    scope: c.scope,
    grantedAt: c.grantedAt,
    expiresAt: c.expiresAt,
    status: c.status,
    source: "session",
  }));

  return [...session, ...seed];
}

// ---- audit log view (synthesised seed trail + this session's real events) ----
export interface AuditRow {
  id: string;
  applicationId: string | null;
  applicantName: string;
  type: string;
  message: string;
  actor: "applicant" | "officer" | "system";
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

function seedAuditTrail(): AuditRow[] {
  const rows: AuditRow[] = [];
  listPersonas().forEach((p, i) => {
    const base = new Date(seedSubmittedAt(i)).getTime();
    const at = (offsetMin: number) => new Date(base + offsetMin * 60000).toISOString();
    const appId = seedId(p.id);
    rows.push(
      { id: `${appId}-a0`, applicationId: appId, applicantName: p.name, type: "consent.granted", message: "Consent granted for account information access (180-day expiry, 4/4 scopes).", actor: "applicant", createdAt: at(0) },
      { id: `${appId}-a1`, applicationId: appId, applicantName: p.name, type: "data.pull", message: "Retrieved accounts and ~6 months of transactions via the AIS provider (Demo Bank · Berlin Group NextGenPSD2).", actor: "system", createdAt: at(1) },
      { id: `${appId}-a2`, applicationId: appId, applicantName: p.name, type: "categorisation", message: "Categorised statement transactions (pre-computed categoriser, schema v1).", actor: "system", createdAt: at(2) },
      { id: `${appId}-a3`, applicationId: appId, applicantName: p.name, type: "decision.engine", message: `Affordability engine result recorded for ${p.name}.`, actor: "system", createdAt: at(3) },
    );
  });
  return rows;
}

export async function getConsoleAudit(sessionId: string): Promise<AuditRow[]> {
  const store = getStore();
  const [apps, events] = await Promise.all([
    store.listApplications(sessionId),
    store.listAudit(sessionId),
  ]);
  const nameByApp = new Map(apps.map((a) => [a.id, a.applicantName]));
  const session: AuditRow[] = events.map((e) => ({
    id: e.id,
    applicationId: e.applicationId,
    applicantName: (e.applicationId && nameByApp.get(e.applicationId)) || "—",
    type: e.type,
    message: e.message,
    actor: e.actor,
    createdAt: e.createdAt,
    meta: e.meta,
  }));
  return [...session, ...seedAuditTrail()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
