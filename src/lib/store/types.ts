import type { ApplicationStatus, ConsentScope, DecisionOutcome, LoanPurpose } from "../types";
import type { CategoriserSource } from "../types";

export interface AppRecord {
  id: string;
  sessionId: string;
  personaId: string;
  applicantName: string;
  amount: number;
  termMonths: number;
  purpose: LoanPurpose;
  status: ApplicationStatus;
  source: "applicant" | "seed";
  submittedAt: string;
}

export interface ConsentRec {
  id: string;
  sessionId: string;
  personaId: string;
  applicationId: string | null;
  scope: ConsentScope;
  purpose: string;
  grantedAt: string;
  expiresAt: string;
  status: "active" | "withdrawn";
  withdrawnAt: string | null;
}

export interface DecisionRec {
  id: string;
  sessionId: string;
  applicationId: string;
  outcome: DecisionOutcome;
  outcomeLabel: string;
  recommendedLimit: number | null;
  rationale: string | null;
  categoriserSource: CategoriserSource;
  decidedBy: "engine" | "officer";
  note: string | null;
  createdAt: string;
}

export interface AuditRec {
  id: string;
  sessionId: string;
  applicationId: string | null;
  type: string;
  message: string;
  actor: "applicant" | "officer" | "system";
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateApplicationInput {
  sessionId: string;
  personaId: string;
  applicantName: string;
  amount: number;
  termMonths: number;
  purpose: LoanPurpose;
  status?: ApplicationStatus;
  source?: "applicant" | "seed";
}

export interface CreateConsentInput {
  sessionId: string;
  personaId: string;
  applicationId: string | null;
  scope: ConsentScope;
  purpose: string;
  grantedAt: string;
  expiresAt: string;
}

export interface RecordDecisionInput {
  sessionId: string;
  applicationId: string;
  outcome: DecisionOutcome;
  outcomeLabel: string;
  recommendedLimit: number | null;
  rationale?: string | null;
  categoriserSource: CategoriserSource;
  decidedBy: "engine" | "officer";
  note?: string | null;
}

export interface AppendAuditInput {
  sessionId: string;
  applicationId: string | null;
  type: string;
  message: string;
  actor: "applicant" | "officer" | "system";
  meta?: Record<string, unknown> | null;
}

export interface Store {
  readonly kind: "neon" | "memory";
  ensureSession(sessionId: string): Promise<void>;
  resetSession(sessionId: string): Promise<void>;
  createApplication(input: CreateApplicationInput): Promise<AppRecord>;
  listApplications(sessionId: string): Promise<AppRecord[]>;
  getApplicationById(sessionId: string, id: string): Promise<AppRecord | undefined>;
  updateApplicationStatus(sessionId: string, id: string, status: ApplicationStatus): Promise<void>;
  createConsent(input: CreateConsentInput): Promise<ConsentRec>;
  listConsents(sessionId: string): Promise<ConsentRec[]>;
  getConsentForApplication(sessionId: string, applicationId: string): Promise<ConsentRec | undefined>;
  withdrawConsent(sessionId: string, consentId: string): Promise<ConsentRec | undefined>;
  recordDecision(input: RecordDecisionInput): Promise<DecisionRec>;
  latestDecision(sessionId: string, applicationId: string): Promise<DecisionRec | undefined>;
  appendAudit(input: AppendAuditInput): Promise<AuditRec>;
  listAudit(sessionId: string, applicationId?: string): Promise<AuditRec[]>;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
