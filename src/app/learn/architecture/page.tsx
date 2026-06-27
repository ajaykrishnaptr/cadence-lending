import {
  Workflow,
  Building2,
  Boxes,
  Home,
  Cable,
  Database,
  Network,
} from "lucide-react";
import {
  LearnHeader,
  LearnSection,
  LearnCard,
  NextPageLink,
} from "@/components/learn/learn-ui";
import { CONSUMER_LOAN, MORTGAGE } from "@/lib/engine/config";

export const metadata = {
  title: "Architecture & extensions · Learn · Cadence",
};

const mortgageInputs = [
  { label: "Property value", value: "Purchase price input" },
  {
    label: "Maximum LTV",
    value: MORTGAGE.mortgageInputs
      ? `${Math.round(MORTGAGE.mortgageInputs.maxLtv * 100)}%`
      : "—",
  },
  {
    label: "Minimum equity",
    value: MORTGAGE.mortgageInputs
      ? `${Math.round(MORTGAGE.mortgageInputs.minEquity * 100)}%`
      : "—",
  },
  {
    label: "Term",
    value: `${MORTGAGE.termRange.min}–${MORTGAGE.termRange.max} months`,
  },
  {
    label: "Stress-rate buffer",
    value: `+${(MORTGAGE.stressRateDelta * 100).toFixed(1)} pp`,
  },
];

export default function LearnArchitecturePage() {
  return (
    <>
      <LearnHeader
        eyebrow="Learn"
        title="Architecture & extensions"
        intro="Cadence is built around a few clean seams: a third-party/account-servicer boundary, a product-parameterised decision core, swappable provider adapters, and per-session persistence. Each seam is where the system grows next."
      />

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-6 lg:py-16">
        <LearnSection
          eyebrow="The boundary"
          title="Third-party provider and account servicer"
          description="The open-banking split is modelled explicitly so the wire format never leaks into the decisioning code."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <LearnCard title="Cadence — the TPP / console" icon={<Workflow className="h-4 w-4" />}>
              Cadence is the third-party provider and the loan-officer console. It
              holds consent, runs categorisation and affordability, and owns the
              decision and audit trail. Nothing about a particular account servicer is
              hard-wired into its domain logic.
            </LearnCard>
            <LearnCard title="Demo Bank — the mock ASPSP" icon={<Building2 className="h-4 w-4" />}>
              Demo Bank is a mock account-servicing institution exposing
              account-information endpoints in the Berlin Group NextGenPSD2 shape.
              Cadence&apos;s account-information adapter maps that wire format onto its
              internal transaction model, so the rest of the system sees one stable
              domain type.
            </LearnCard>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="The core"
          title="A product-parameterised engine"
          description="One rule core, different parameter sets per product. The consumer instalment loan is active today; the mortgage parameter set is already defined to prove the seam."
        >
          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <LearnCard title="Consumer loan — active" icon={<Boxes className="h-4 w-4" />}>
              <p>
                The live product runs the full Haushaltsrechnung and rule set:
                affordability buffer, debt-to-income ceiling, stability and tenure
                minimums, and a rate-stress test, all expressed as named parameters
                on a single product config.
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Demo APR</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {(CONSUMER_LOAN.apr * 100).toFixed(1)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Max DTI</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {Math.round(CONSUMER_LOAN.maxDti * 100)}%
                  </dd>
                </div>
              </dl>
            </LearnCard>
            <LearnCard title="Mortgage — the next module" icon={<Home className="h-4 w-4" />}>
              <p>
                The mortgage seam reuses the same core with a heavier parameter set
                and a few product-specific inputs. It is defined but inactive in the
                demo — the seam, not the screen.
              </p>
              <dl className="mt-4 space-y-2 text-xs">
                {mortgageInputs.map((input) => (
                  <div
                    key={input.label}
                    className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                  >
                    <dt className="text-muted-foreground">{input.label}</dt>
                    <dd className="font-mono tabular-nums text-foreground">
                      {input.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </LearnCard>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="The seams"
          title="Provider abstractions & persistence"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <LearnCard title="Swappable providers" icon={<Cable className="h-4 w-4" />}>
              Account-information access and the language model both sit behind
              provider interfaces. The mock account servicer can be replaced with a
              live one, and the categorisation model can be swapped, without touching
              the decision core — each provider is an adapter, not a dependency baked
              into the rules.
            </LearnCard>
            <LearnCard title="Per-session persistence" icon={<Database className="h-4 w-4" />}>
              State is persisted to a serverless Postgres store through a typed query
              layer, keyed by session. Every session is isolated by its identifier, so
              one applicant&apos;s data, decisions and audit log never cross into
              another&apos;s.
            </LearnCard>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="The horizon"
          title="Open finance as the natural extension"
        >
          <LearnCard title="Beyond payment accounts" icon={<Network className="h-4 w-4" />}>
            <p>
              The same architecture extends naturally from payment-account data toward
              broader open-finance access — savings, investments, pensions and
              insurance brought under comparable consent-based sharing. A wider
              evidence base would sharpen both categorisation and affordability while
              the boundary, the decision core and the audit trail stay exactly as they
              are.
            </p>
            <p className="mt-3">
              This is framed as where the system would grow, not what the demo runs
              on. The demo deliberately stays within account-information access; the
              forward path is additive, plugging new providers into seams that already
              exist.
            </p>
          </LearnCard>
        </LearnSection>

        <NextPageLink
          href="/tour"
          label="See it in motion"
          title="Take the 60-second tour"
        />
      </div>
    </>
  );
}
