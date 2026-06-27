import type { ApplicationStatus } from "../types";
import {
  type AppRecord,
  type AppendAuditInput,
  type AuditRec,
  type ConsentRec,
  type CreateApplicationInput,
  type CreateConsentInput,
  type DecisionRec,
  type RecordDecisionInput,
  type Store,
  newId,
  nowIso,
} from "./types";

/**
 * In-memory store used when no DATABASE_URL is set, so the demo runs locally
 * before Neon is wired up. Implements exactly the same Store contract as the
 * Neon-backed store; data lives for the process lifetime. Persisted on
 * globalThis to survive Next.js dev hot-reloads.
 */
interface MemoryState {
  sessions: Set<string>;
  applications: AppRecord[];
  consents: ConsentRec[];
  decisions: DecisionRec[];
  audit: AuditRec[];
}

const g = globalThis as unknown as { __cadenceMem?: MemoryState };
const state: MemoryState =
  g.__cadenceMem ??
  (g.__cadenceMem = {
    sessions: new Set(),
    applications: [],
    consents: [],
    decisions: [],
    audit: [],
  });

export class MemoryStore implements Store {
  readonly kind = "memory" as const;

  async ensureSession(sessionId: string): Promise<void> {
    state.sessions.add(sessionId);
  }

  async resetSession(sessionId: string): Promise<void> {
    state.applications = state.applications.filter((a) => a.sessionId !== sessionId);
    state.consents = state.consents.filter((c) => c.sessionId !== sessionId);
    state.decisions = state.decisions.filter((d) => d.sessionId !== sessionId);
    state.audit = state.audit.filter((a) => a.sessionId !== sessionId);
  }

  async createApplication(input: CreateApplicationInput): Promise<AppRecord> {
    const rec: AppRecord = {
      id: newId(),
      sessionId: input.sessionId,
      personaId: input.personaId,
      applicantName: input.applicantName,
      amount: input.amount,
      termMonths: input.termMonths,
      purpose: input.purpose,
      status: input.status ?? "pending",
      source: input.source ?? "applicant",
      connectedBanks: input.connectedBanks ?? null,
      submittedAt: nowIso(),
    };
    state.applications.push(rec);
    return rec;
  }

  async listApplications(sessionId: string): Promise<AppRecord[]> {
    return state.applications
      .filter((a) => a.sessionId === sessionId)
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  }

  async getApplicationById(sessionId: string, id: string): Promise<AppRecord | undefined> {
    return state.applications.find((a) => a.sessionId === sessionId && a.id === id);
  }

  async updateApplicationStatus(sessionId: string, id: string, status: ApplicationStatus): Promise<void> {
    const app = state.applications.find((a) => a.sessionId === sessionId && a.id === id);
    if (app) app.status = status;
  }

  async createConsent(input: CreateConsentInput): Promise<ConsentRec> {
    const rec: ConsentRec = {
      id: newId(),
      sessionId: input.sessionId,
      personaId: input.personaId,
      bankId: input.bankId,
      applicationId: input.applicationId,
      scope: input.scope,
      purpose: input.purpose,
      grantedAt: input.grantedAt,
      expiresAt: input.expiresAt,
      status: "active",
      withdrawnAt: null,
    };
    state.consents.push(rec);
    return rec;
  }

  async listConsents(sessionId: string): Promise<ConsentRec[]> {
    return state.consents
      .filter((c) => c.sessionId === sessionId)
      .sort((a, b) => (a.grantedAt < b.grantedAt ? 1 : -1));
  }

  async getConsentsForApplication(sessionId: string, applicationId: string): Promise<ConsentRec[]> {
    return state.consents.filter((c) => c.sessionId === sessionId && c.applicationId === applicationId);
  }

  async withdrawConsent(sessionId: string, consentId: string): Promise<ConsentRec | undefined> {
    const c = state.consents.find((x) => x.sessionId === sessionId && x.id === consentId);
    if (c) {
      c.status = "withdrawn";
      c.withdrawnAt = nowIso();
    }
    return c;
  }

  async recordDecision(input: RecordDecisionInput): Promise<DecisionRec> {
    const rec: DecisionRec = {
      id: newId(),
      sessionId: input.sessionId,
      applicationId: input.applicationId,
      outcome: input.outcome,
      outcomeLabel: input.outcomeLabel,
      recommendedLimit: input.recommendedLimit,
      rationale: input.rationale ?? null,
      categoriserSource: input.categoriserSource,
      decidedBy: input.decidedBy,
      note: input.note ?? null,
      createdAt: nowIso(),
    };
    state.decisions.push(rec);
    return rec;
  }

  async latestDecision(sessionId: string, applicationId: string): Promise<DecisionRec | undefined> {
    return state.decisions
      .filter((d) => d.sessionId === sessionId && d.applicationId === applicationId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  }

  async appendAudit(input: AppendAuditInput): Promise<AuditRec> {
    const rec: AuditRec = {
      id: newId(),
      sessionId: input.sessionId,
      applicationId: input.applicationId,
      type: input.type,
      message: input.message,
      actor: input.actor,
      meta: input.meta ?? null,
      createdAt: nowIso(),
    };
    state.audit.push(rec);
    return rec;
  }

  async listAudit(sessionId: string, applicationId?: string): Promise<AuditRec[]> {
    return state.audit
      .filter((a) => a.sessionId === sessionId && (!applicationId || a.applicationId === applicationId))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
}
