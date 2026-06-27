import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { applications, auditEvents, consents, decisions, sessions } from "@/db/schema";
import type {
  ApplicationStatus,
  CategoriserSource,
  ConsentScope,
  DecisionOutcome,
  LoanPurpose,
} from "../types";
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
} from "./types";

const iso = (d: Date | string | null) =>
  d == null ? null : typeof d === "string" ? d : d.toISOString();

export class NeonStore implements Store {
  readonly kind = "neon" as const;
  constructor(private db: Db) {}

  async ensureSession(sessionId: string): Promise<void> {
    await this.db.insert(sessions).values({ id: sessionId }).onConflictDoNothing();
  }

  async resetSession(sessionId: string): Promise<void> {
    await this.db.delete(auditEvents).where(eq(auditEvents.sessionId, sessionId));
    await this.db.delete(decisions).where(eq(decisions.sessionId, sessionId));
    await this.db.delete(consents).where(eq(consents.sessionId, sessionId));
    await this.db.delete(applications).where(eq(applications.sessionId, sessionId));
  }

  async createApplication(input: CreateApplicationInput): Promise<AppRecord> {
    const id = newId();
    const [row] = await this.db
      .insert(applications)
      .values({
        id,
        sessionId: input.sessionId,
        personaId: input.personaId,
        applicantName: input.applicantName,
        amount: input.amount,
        termMonths: input.termMonths,
        purpose: input.purpose,
        status: input.status ?? "pending",
        source: input.source ?? "applicant",
      })
      .returning();
    return this.toApp(row);
  }

  async listApplications(sessionId: string): Promise<AppRecord[]> {
    const rows = await this.db
      .select()
      .from(applications)
      .where(eq(applications.sessionId, sessionId))
      .orderBy(desc(applications.submittedAt));
    return rows.map((r) => this.toApp(r));
  }

  async getApplicationById(sessionId: string, id: string): Promise<AppRecord | undefined> {
    const rows = await this.db
      .select()
      .from(applications)
      .where(and(eq(applications.sessionId, sessionId), eq(applications.id, id)));
    return rows[0] ? this.toApp(rows[0]) : undefined;
  }

  async updateApplicationStatus(sessionId: string, id: string, status: ApplicationStatus): Promise<void> {
    await this.db
      .update(applications)
      .set({ status })
      .where(and(eq(applications.sessionId, sessionId), eq(applications.id, id)));
  }

  async createConsent(input: CreateConsentInput): Promise<ConsentRec> {
    const id = newId();
    const [row] = await this.db
      .insert(consents)
      .values({
        id,
        sessionId: input.sessionId,
        personaId: input.personaId,
        applicationId: input.applicationId,
        scope: input.scope,
        purpose: input.purpose,
        grantedAt: new Date(input.grantedAt),
        expiresAt: new Date(input.expiresAt),
        status: "active",
      })
      .returning();
    return this.toConsent(row);
  }

  async listConsents(sessionId: string): Promise<ConsentRec[]> {
    const rows = await this.db
      .select()
      .from(consents)
      .where(eq(consents.sessionId, sessionId))
      .orderBy(desc(consents.grantedAt));
    return rows.map((r) => this.toConsent(r));
  }

  async getConsentForApplication(sessionId: string, applicationId: string): Promise<ConsentRec | undefined> {
    const rows = await this.db
      .select()
      .from(consents)
      .where(and(eq(consents.sessionId, sessionId), eq(consents.applicationId, applicationId)));
    return rows[0] ? this.toConsent(rows[0]) : undefined;
  }

  async withdrawConsent(sessionId: string, consentId: string): Promise<ConsentRec | undefined> {
    const [row] = await this.db
      .update(consents)
      .set({ status: "withdrawn", withdrawnAt: new Date() })
      .where(and(eq(consents.sessionId, sessionId), eq(consents.id, consentId)))
      .returning();
    return row ? this.toConsent(row) : undefined;
  }

  async recordDecision(input: RecordDecisionInput): Promise<DecisionRec> {
    const id = newId();
    const [row] = await this.db
      .insert(decisions)
      .values({
        id,
        sessionId: input.sessionId,
        applicationId: input.applicationId,
        outcome: input.outcome,
        outcomeLabel: input.outcomeLabel,
        recommendedLimit: input.recommendedLimit ?? null,
        rationale: input.rationale ?? null,
        categoriserSource: input.categoriserSource,
        decidedBy: input.decidedBy,
        note: input.note ?? null,
      })
      .returning();
    return this.toDecision(row);
  }

  async latestDecision(sessionId: string, applicationId: string): Promise<DecisionRec | undefined> {
    const rows = await this.db
      .select()
      .from(decisions)
      .where(and(eq(decisions.sessionId, sessionId), eq(decisions.applicationId, applicationId)))
      .orderBy(desc(decisions.createdAt))
      .limit(1);
    return rows[0] ? this.toDecision(rows[0]) : undefined;
  }

  async appendAudit(input: AppendAuditInput): Promise<AuditRec> {
    const id = newId();
    const [row] = await this.db
      .insert(auditEvents)
      .values({
        id,
        sessionId: input.sessionId,
        applicationId: input.applicationId,
        type: input.type,
        message: input.message,
        actor: input.actor,
        meta: input.meta ?? null,
      })
      .returning();
    return this.toAudit(row);
  }

  async listAudit(sessionId: string, applicationId?: string): Promise<AuditRec[]> {
    const where = applicationId
      ? and(eq(auditEvents.sessionId, sessionId), eq(auditEvents.applicationId, applicationId))
      : eq(auditEvents.sessionId, sessionId);
    const rows = await this.db.select().from(auditEvents).where(where).orderBy(desc(auditEvents.createdAt));
    return rows.map((r) => this.toAudit(r));
  }

  // ---- row → domain mappers ----
  private toApp(r: typeof applications.$inferSelect): AppRecord {
    return {
      id: r.id,
      sessionId: r.sessionId,
      personaId: r.personaId,
      applicantName: r.applicantName,
      amount: r.amount,
      termMonths: r.termMonths,
      purpose: r.purpose as LoanPurpose,
      status: r.status as ApplicationStatus,
      source: r.source as "applicant" | "seed",
      submittedAt: iso(r.submittedAt)!,
    };
  }
  private toConsent(r: typeof consents.$inferSelect): ConsentRec {
    return {
      id: r.id,
      sessionId: r.sessionId,
      personaId: r.personaId,
      applicationId: r.applicationId,
      scope: r.scope as ConsentScope,
      purpose: r.purpose,
      grantedAt: iso(r.grantedAt)!,
      expiresAt: iso(r.expiresAt)!,
      status: r.status as "active" | "withdrawn",
      withdrawnAt: iso(r.withdrawnAt),
    };
  }
  private toDecision(r: typeof decisions.$inferSelect): DecisionRec {
    return {
      id: r.id,
      sessionId: r.sessionId,
      applicationId: r.applicationId,
      outcome: r.outcome as DecisionOutcome,
      outcomeLabel: r.outcomeLabel,
      recommendedLimit: r.recommendedLimit,
      rationale: r.rationale,
      categoriserSource: r.categoriserSource as CategoriserSource,
      decidedBy: r.decidedBy as "engine" | "officer",
      note: r.note,
      createdAt: iso(r.createdAt)!,
    };
  }
  private toAudit(r: typeof auditEvents.$inferSelect): AuditRec {
    return {
      id: r.id,
      sessionId: r.sessionId,
      applicationId: r.applicationId,
      type: r.type,
      message: r.message,
      actor: r.actor as "applicant" | "officer" | "system",
      meta: (r.meta as Record<string, unknown> | null) ?? null,
      createdAt: iso(r.createdAt)!,
    };
  }
}
