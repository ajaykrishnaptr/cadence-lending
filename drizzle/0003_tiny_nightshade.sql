CREATE TABLE "categorisation_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"subcategory" text NOT NULL,
	"confidence" real NOT NULL,
	"is_income" boolean NOT NULL,
	"is_recurring" boolean NOT NULL,
	"is_obligation" boolean NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
