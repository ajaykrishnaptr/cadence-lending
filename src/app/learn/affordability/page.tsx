import {
  Scale,
  Gauge,
  CalendarClock,
  TrendingUp,
  AlertTriangle,
  Lock,
} from "lucide-react";
import {
  LearnHeader,
  LearnSection,
  LearnCard,
  NextPageLink,
} from "@/components/learn/learn-ui";
import {
  PAUSCHALE_TABLE,
  PAUSCHALE_EXTRA,
  CONSUMER_LOAN,
} from "@/lib/engine/config";

export const metadata = {
  title: "The affordability engine · Learn · Cadence",
};

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const pct = (n: number) => `${(n * 100).toFixed(1).replace(/\.0$/, "")}%`;

const FORMULA = [
  { term: "Net monthly income", op: "", tone: "text-success-foreground" },
  { term: "Living-cost allowance (Pauschale)", op: "−", tone: "text-muted-foreground" },
  { term: "Rent", op: "−", tone: "text-muted-foreground" },
  { term: "Existing obligations", op: "−", tone: "text-muted-foreground" },
  { term: "Available income", op: "=", tone: "text-brand" },
];

const householdSizes = Object.keys(PAUSCHALE_TABLE)
  .map(Number)
  .sort((a, b) => a - b);

const stressedApr = CONSUMER_LOAN.apr + CONSUMER_LOAN.stressRateDelta;

const RULES = [
  {
    icon: Scale,
    title: "Affordability buffer",
    value: `${CONSUMER_LOAN.affordabilityBuffer.toFixed(1)}×`,
    desc: `Available income must cover the new instalment with margin to spare — at least ${CONSUMER_LOAN.affordabilityBuffer.toFixed(1)} times the instalment. A budget that only just balances is not treated as affordable.`,
  },
  {
    icon: Gauge,
    title: "Debt-to-income ceiling",
    value: pct(CONSUMER_LOAN.maxDti),
    desc: `Existing obligations plus the new instalment may not exceed ${pct(CONSUMER_LOAN.maxDti)} of net income. Beyond this ratio the application cannot pass automatically regardless of headroom.`,
  },
  {
    icon: CalendarClock,
    title: "Stability & tenure",
    value: `${pct(CONSUMER_LOAN.minStability)} · ${CONSUMER_LOAN.minTenureMonths} mo`,
    desc: `Income must score at least ${pct(CONSUMER_LOAN.minStability)} on regularity and there must be at least ${CONSUMER_LOAN.minTenureMonths} months of statement history. Thin or erratic income is referred, not auto-approved.`,
  },
  {
    icon: TrendingUp,
    title: "Interest-rate stress test",
    value: `+${(CONSUMER_LOAN.stressRateDelta * 100).toFixed(1)} pp`,
    desc: `The instalment is recomputed at ${pct(stressedApr)} — the ${pct(CONSUMER_LOAN.apr)} demo rate plus a ${(CONSUMER_LOAN.stressRateDelta * 100).toFixed(1)} percentage-point shock — and must still fit the budget, so affordability survives a rate rise.`,
  },
  {
    icon: AlertTriangle,
    title: "Adverse markers",
    value: "Hard stop",
    desc: "Categorised signals such as gambling activity or returned-payment fees flag the file for human review. These are surfaced explicitly rather than averaged away into a score.",
  },
];

export default function LearnAffordabilityPage() {
  return (
    <>
      <LearnHeader
        eyebrow="Learn"
        title="The affordability engine"
        intro="Cadence assesses affordability with a German Haushaltsrechnung — a household budget calculation — framed as the statutory creditworthiness assessment, the Kreditwürdigkeitsprüfung. It is arithmetic over categorised cash flow, followed by fixed rules."
      />

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-6 lg:py-16">
        <LearnSection
          eyebrow="The method"
          title="The Haushaltsrechnung"
          description="The budget reduces a statement to one figure: how much income remains each month once unavoidable costs are removed. Everything the engine decides rests on this calculation."
        >
          <div className="rounded-2xl border bg-card p-6">
            <ul className="space-y-2.5">
              {FORMULA.map((row) => (
                <li
                  key={row.term}
                  className="flex items-center gap-3 border-b pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted font-mono text-base font-semibold text-muted-foreground">
                    {row.op || " "}
                  </span>
                  <span
                    className={`font-heading text-base font-semibold tracking-tight ${row.tone}`}
                  >
                    {row.term}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              Rent and obligations are not estimated — they are read from the
              categorised transactions, so the budget reflects how the applicant
              actually spends rather than what they declare.
            </p>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="The allowance"
          title="Living-cost allowance by household size"
          description="The Pauschale is a standard monthly figure for everyday living costs — food, utilities, incidentals — that scales with household size. It deliberately excludes rent and existing credit, which are counted separately from the detected transactions."
        >
          <div className="overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Household size</th>
                  <th className="px-6 py-3 text-right font-medium">
                    Monthly allowance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {householdSizes.map((size) => (
                  <tr key={size}>
                    <td className="px-6 py-3">
                      {size} {size === 1 ? "person" : "people"}
                    </td>
                    <td className="px-6 py-3 text-right font-mono tabular-nums">
                      {eur(PAUSCHALE_TABLE[size])}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/20">
                  <td className="px-6 py-3 text-muted-foreground">
                    Each additional person
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    + {eur(PAUSCHALE_EXTRA)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            These are demo figures. In production the table would track the
            published reference values for the assessment, but the mechanism is
            identical: a transparent, look-up allowance rather than a discretionary
            estimate.
          </p>
        </LearnSection>

        <LearnSection
          eyebrow="The rules"
          title="What a clean pass requires"
          description="Once available income is known, the requested instalment is tested against a fixed set of thresholds drawn from the active consumer-loan product. Each is a named, inspectable parameter."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {RULES.map((rule) => (
              <div key={rule.title} className="rounded-2xl border bg-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                    <rule.icon className="h-4 w-4" />
                  </span>
                  <span className="font-heading text-lg font-semibold tabular-nums text-brand">
                    {rule.value}
                  </span>
                </div>
                <h3 className="mt-3 font-heading text-base font-semibold tracking-tight">
                  {rule.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{rule.desc}</p>
              </div>
            ))}
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Why deterministic"
          title="The model never decides"
        >
          <LearnCard title="Transparent, auditable code" icon={<Lock className="h-4 w-4" />}>
            <p>
              The decision is a pure function of the categorised figures and the
              published thresholds. The same inputs always yield the same outcome,
              every threshold is a named constant, and the full calculation — income,
              allowance, obligations, buffer, ratio, stress instalment — is recorded.
              An officer or auditor can re-derive any approve, refer or decline by
              hand.
            </p>
            <p className="mt-3">
              The language model contributes perception, labelling the cash flow; it
              contributes no judgement to the outcome. Keeping the decision in
              deterministic code is what makes it defensible: there is no opaque score
              to explain after the fact, only arithmetic and rules anyone can follow.
            </p>
          </LearnCard>
        </LearnSection>

        <NextPageLink
          href="/learn/architecture"
          label="Next"
          title="Architecture & extensions"
        />
      </div>
    </>
  );
}
