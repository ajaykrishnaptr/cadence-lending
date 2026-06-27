CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"persona_id" text NOT NULL,
	"applicant_name" text NOT NULL,
	"amount" integer NOT NULL,
	"term_months" integer NOT NULL,
	"purpose" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"application_id" text,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"actor" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"persona_id" text NOT NULL,
	"application_id" text,
	"scope" jsonb NOT NULL,
	"purpose" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"application_id" text NOT NULL,
	"outcome" text NOT NULL,
	"outcome_label" text NOT NULL,
	"recommended_limit" integer,
	"rationale" text,
	"categoriser_source" text NOT NULL,
	"decided_by" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
