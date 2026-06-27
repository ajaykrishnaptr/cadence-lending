import {
  UserRound,
  ShieldCheck,
  Building2,
  Workflow,
  ClipboardCheck,
  ScrollText,
} from "lucide-react";
import {
  LearnHeader,
  LearnSection,
  LearnCard,
  NextPageLink,
} from "@/components/learn/learn-ui";

export const metadata = {
  title: "How it works · Learn · Cadence",
};

const STEPS = [
  {
    icon: UserRound,
    title: "Applicant arrives",
    desc: "An applicant reaches Cadence from a comparison-portal lead carrying a requested amount and term. The session is created and isolated from the first interaction; nothing is shared across applicants.",
    tag: "Inbound lead",
  },
  {
    icon: ShieldCheck,
    title: "Consent is granted",
    desc: "The applicant authorises account-information access against Demo Bank under an explicit, time-boxed consent. The grant is scoped to read-only statement data and expires; it is recorded as the legal basis for everything downstream.",
    tag: "AIS consent · 180-day expiry",
  },
  {
    icon: Building2,
    title: "Account data is retrieved",
    desc: "With consent in place, the engine pulls accounts, balances and several months of transactions over a standardised account-information interface. The raw wire format is mapped into Cadence's internal transaction model.",
    tag: "Berlin Group account data",
  },
  {
    icon: Workflow,
    title: "Transactions are categorised",
    desc: "Each transaction line is labelled into one of sixteen categories, with flags for income, recurrence and obligation. The model supplies a grounded rationale per label; it categorises the evidence but never decides the loan.",
    tag: "Model categorisation",
  },
  {
    icon: ClipboardCheck,
    title: "Affordability is computed",
    desc: "Categorised cash flow feeds the Haushaltsrechnung: net income minus a standard living-cost allowance, rent and existing obligations yields available income. Deterministic rules then test the requested instalment against buffer, ratio, stability and stress thresholds.",
    tag: "Haushaltsrechnung",
  },
  {
    icon: ScrollText,
    title: "A decision is issued",
    desc: "The engine returns approve, refer or decline with the exact figures and rule outcomes behind it. Every input, label and threshold is captured in an append-only audit log an officer or auditor can replay end to end.",
    tag: "Transparent · auditable",
  },
];

export default function LearnHowItWorksPage() {
  return (
    <>
      <LearnHeader
        eyebrow="Learn"
        title="How a decision is made, end to end"
        intro="Cadence turns an applicant's account data into an explainable lending decision through a fixed, ordered sequence. Each stage produces evidence the next stage consumes; the credit decision itself is deterministic code rather than a model judgement."
      />

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-6 lg:py-16">
        <LearnSection
          eyebrow="The sequence"
          title="Six stages from lead to decision"
          description="The order matters: consent precedes retrieval, retrieval precedes categorisation, and categorisation precedes affordability. Because it is a genuine ordered process, the stages are numbered."
        >
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="relative rounded-2xl border bg-card p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted font-heading text-base font-semibold tabular-nums text-brand">
                      {i + 1}
                    </span>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border text-muted-foreground sm:h-8 sm:w-8">
                      <step.icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-heading text-base font-semibold tracking-tight">
                        {step.title}
                      </h3>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {step.tag}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {step.desc}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </LearnSection>

        <LearnSection
          eyebrow="Boundary"
          title="The third-party and account-holder boundary"
          description="Open-banking access has two sides, and Cadence sits firmly on one of them."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <LearnCard title="Third-party provider (TPP)" icon={<Workflow className="h-4 w-4" />}>
              Cadence is the third-party provider: the regulated party that requests
              access, consumes account data and runs the decisioning. It holds the
              consent, performs categorisation and affordability, and owns the
              decision and its audit trail. The intelligence lives here.
            </LearnCard>
            <LearnCard title="Account servicer (ASPSP)" icon={<Building2 className="h-4 w-4" />}>
              Demo Bank is the account-servicing institution: it holds the
              applicant&apos;s accounts and exposes them, only after consent, through a
              standardised account-information interface. Cadence reads; it never
              writes. Account access is a commodity — the decisioning layer is the
              work.
            </LearnCard>
          </div>
          <p className="text-sm text-muted-foreground">
            Keeping this boundary clean is what makes the system auditable: the
            account servicer is the single source of truth for the data, and Cadence
            is the single source of truth for the reasoning applied to it.
          </p>
        </LearnSection>

        <NextPageLink
          href="/learn/categoriser"
          label="Next"
          title="The categoriser & evaluation"
        />
      </div>
    </>
  );
}
