import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Per-session isolation: every visitor write carries a sessionId. Seeded Demo
 * Bank data is global and read-only (it never lives in these tables). "Reset my
 * demo data" deletes a single session's rows.
 */

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  personaId: text("persona_id").notNull(),
  applicantName: text("applicant_name").notNull(),
  amount: integer("amount").notNull(),
  termMonths: integer("term_months").notNull(),
  purpose: text("purpose").notNull(),
  status: text("status").notNull(), // pending | approved | referred | declined
  source: text("source").notNull(), // applicant | seed
  /** ASPSP ids the applicant connected (null = all of the persona's banks). */
  connectedBanks: jsonb("connected_banks"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consents = pgTable("consents", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  personaId: text("persona_id").notNull(),
  /** The ASPSP this consent authorises (per-bank consent). */
  bankId: text("bank_id").notNull().default("demo-bank"),
  applicationId: text("application_id"),
  scope: jsonb("scope").notNull(),
  purpose: text("purpose").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // active | withdrawn
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
});

export const decisions = pgTable("decisions", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  applicationId: text("application_id").notNull(),
  outcome: text("outcome").notNull(), // approve | refer | decline
  outcomeLabel: text("outcome_label").notNull(),
  recommendedLimit: integer("recommended_limit"),
  rationale: text("rationale"),
  categoriserSource: text("categoriser_source").notNull(), // seed | rules | gemini
  decidedBy: text("decided_by").notNull(), // engine | officer
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  applicationId: text("application_id"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  actor: text("actor").notNull(), // applicant | officer | system
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Persistent categorisation cache. Global (NOT session-scoped) and never cleared
 * by "reset my demo data" — it dedupes live Gemini calls across sessions. Keyed
 * by a normalised description+amount+direction hash, so re-running the live
 * categoriser over an already-seen statement costs zero model calls.
 */
export const categorisationCache = pgTable("categorisation_cache", {
  key: text("key").primaryKey(),
  category: text("category").notNull(),
  subcategory: text("subcategory").notNull(),
  confidence: real("confidence").notNull(),
  isIncome: boolean("is_income").notNull(),
  isRecurring: boolean("is_recurring").notNull(),
  isObligation: boolean("is_obligation").notNull(),
  /** Model id that produced this label (for cache invalidation on model change). */
  model: text("model").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ApplicationRow = typeof applications.$inferSelect;
export type ConsentRow = typeof consents.$inferSelect;
export type DecisionRow = typeof decisions.$inferSelect;
export type AuditRow = typeof auditEvents.$inferSelect;
