# Cadence — Lending Decision Engine

A polished, production-grade demo that turns a loan applicant's open-banking
account data into an **explainable lending decision**. The thesis: account access
is a commodity; the categorisation and decisioning layer is the work. The credit
decision itself is **deterministic, transparent code** an auditor can follow — the
model only categorises transactions and drafts a grounded rationale.

> **Demo — synthetic data, not a live system.** All brands are fictional
> placeholders. No real institution is represented anywhere in the app.
> Built with Claude Code.

## What it does

- **Two logical sides in one app.** *Cadence* is the lender/TPP console and
  applicant experience. *Demo Bank* is a mock ASPSP that exposes
  **Berlin Group NextGenPSD2 (XS2A)** account-information endpoints, seeded by an
  independent rule-based generator. Cadence reaches it only through an AIS
  provider interface (`lib/ais.ts`) — a real TPP → ASPSP boundary — and maps the
  raw wire format into its own domain model.
- **Applicant journey** (warmer mood): arrive from a comparison-portal lead,
  choose a loan, grant AIS consent (180-day expiry), connect Demo Bank with a
  simulated SCA, and submit. The submission appears live in the officer console —
  the loop closes end to end.
- **Loan officer console** (denser mood): a six-applicant portfolio dashboard,
  an applications list, and a deep application detail with transactions
  (model category + confidence), income analysis, obligations, the
  **Haushaltsrechnung** affordability breakdown, a per-rule decision, a grounded
  rationale, an officer override, **deep clickable explainability** (every figure
  drills to its source transactions), consent management, and an append-only
  audit log with JSON export.
- **Model evaluation**: runs the categoriser over a labelled synthetic set —
  accuracy, per-category precision/recall, a confusion matrix, and the hard cases
  shown failing honestly. The labelling limitation is owned explicitly.
- **Mortgage — next module**: a designed, inactive tab showing the distinct
  inputs (property value, LTV, equity, longer term, stress-rate buffer) on the
  same product-parameterised engine.
- **Learn**: four concept-level pages on how it works, the categoriser &
  evaluation, the affordability engine, and the architecture & extensions.

## Tech stack

- **Next.js (App Router) + TypeScript**, **Tailwind v4 + shadcn/ui**, **Recharts**
- **Vercel AI SDK + `@ai-sdk/google`**, model **`gemini-2.5-flash`** — `generateObject`
  + **Zod** for categorisation, a grounded structured call for the rationale.
  The LLM provider is abstracted in `lib/llm.ts`.
- **Neon Postgres + Drizzle ORM** with per-session isolation (every visitor write
  is scoped by `sessionId`; seeded Demo Bank data is global read-only). Falls back
  to an in-memory store when no database is configured, so the demo runs locally
  with zero setup.

## Running locally

```bash
npm install
npm run dev          # starts the local dev server
```

The app runs **without any credentials** — it uses an in-memory store and the
deterministic rules-based categoriser, and says so. To unlock real persistence and
the live model, copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL="postgresql://…"   # Neon (free tier)
GEMINI_API_KEY="…"              # Google AI Studio (free tier)
```

Then push the schema to your database:

```bash
npm run db:push      # or: npm run db:generate  (migrations are in ./drizzle)
```

### Mock credentials (shown on the login screen)

| Role         | Email                  | Password |
| ------------ | ---------------------- | -------- |
| Loan officer | `officer@cadence.demo` | `demo`   |
| Applicant    | `applicant@demo.bank`  | `demo`   |

Authentication is mock and decorative; the login screen shows the credentials with
one-click autofill, and a "Switch role" control toggles between the two.

## Scripts

| Script                | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `npm run dev`         | Start the dev server                               |
| `npm run build`       | Production build                                   |
| `npm run verify`      | Sanity-check the engine: generate every persona, categorise, decide, and confirm outcomes match the intended design |
| `npm run db:push`     | Push the Drizzle schema to Neon                    |
| `npm run db:studio`   | Open Drizzle Studio                                |

## How the decision works (deterministic)

The **Haushaltsrechnung** (German household-budget method, framed as the statutory
Kreditwürdigkeitsprüfung):

```
net monthly income
  − standard living-cost allowance (Pauschale, by household size)
  − rent
  − existing credit obligations (loan / BNPL / other credit)
  = available income
```

The proposed instalment is computed from the amount, term and a fixed demo APR.
Rules then check: available income covers the instalment with a safety buffer;
debt-to-income stays under a ceiling; income is stable enough and the statement
history is long enough; the instalment survives an interest-rate stress test; and
adverse markers (overdraft frequency, gambling) are within tolerance. Each rule
shows its inputs and a **pass / refer / fail** outcome, and the result is their
transparent combination — **Approve / Refer / Decline** with a limit. The engine is
product-parameterised, so the mortgage module is the same core with different
parameters.

## Deploying to Vercel

1. Import the repository in Vercel.
2. Add the `DATABASE_URL` and `GEMINI_API_KEY` environment variables (both free
   tiers are sufficient).
3. Deploy. The seeded personas ship with pre-computed categorisation and rationale
   for instant load; the live Gemini path is called only on "Re-categorise",
   "Regenerate rationale" and "Run evaluation".

## Guardrails

- **All brands are fictional.** The lender/console is *Cadence*; the data-source
  bank is *Demo Bank*; the inbound channel is *a comparison-portal lead*. No real
  employer, comparison portal, account-information aggregator, payment scheme or
  competitor is named anywhere in the code, copy, or commits.
- **Synthetic data only.** A persistent ribbon makes this unmissable.
- **The decision is deterministic.** The model categorises and explains; it never
  decides.

---

Built with Claude Code. Open finance / FIDA is framed as the natural forward
extension, not what the demo runs on.
