import { Home, Lock, ArrowRight, Building, Percent, Wallet, CalendarClock, Gauge } from "lucide-react";
import { CONSUMER_LOAN, MORTGAGE } from "@/lib/engine/config";
import { SectionTitle } from "@/components/brand/stat";

const MORTGAGE_INPUTS = [
  { icon: Building, label: "Property value", hint: "Purchase price / valuation", example: "€420,000" },
  { icon: Percent, label: "Loan-to-value (LTV)", hint: `Capped at ${(MORTGAGE.mortgageInputs!.maxLtv * 100).toFixed(0)}%`, example: "82%" },
  { icon: Wallet, label: "Equity / deposit", hint: `Minimum ${(MORTGAGE.mortgageInputs!.minEquity * 100).toFixed(0)}%`, example: "€75,600" },
  { icon: CalendarClock, label: "Term", hint: `${MORTGAGE.termRange.min / 12}–${MORTGAGE.termRange.max / 12} years`, example: "25 years" },
  { icon: Gauge, label: "Stress-rate buffer", hint: `Repayment tested at +${(MORTGAGE.stressRateDelta * 100).toFixed(0)}% APR`, example: "Pass" },
];

function ParamRow({ label, consumer, mortgage }: { label: string; consumer: string; mortgage: string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-2.5 text-sm text-muted-foreground">{label}</td>
      <td className="px-4 py-2.5 text-sm font-medium tabular-nums">{consumer}</td>
      <td className="px-4 py-2.5 text-sm font-medium tabular-nums text-brand">{mortgage}</td>
    </tr>
  );
}

export default function MortgagePage() {
  return (
    <div className="space-y-6">
      <SectionTitle title="Mortgage — next module" description="The next product on the same decision engine. Designed, parameterised, and inactive in this demo." />

      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Lock className="h-3 w-3" /> Inactive
        </span>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-brand"><Home className="h-5 w-5" /></span>
          <div>
            <h2 className="font-heading text-lg font-semibold">Residential mortgage</h2>
            <p className="text-sm text-muted-foreground">Same Haushaltsrechnung core, extra inputs and tighter thresholds.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
          {MORTGAGE_INPUTS.map((f) => (
            <div key={f.label} className="rounded-xl border border-dashed bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <f.icon className="h-4 w-4 text-brand" /> {f.label}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-md bg-card px-2 py-1 font-mono text-xs text-muted-foreground">{f.example}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{f.hint}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Inputs shown for design only — the mortgage product is not wired into the live engine in this demo.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold">One engine, two parameter sets</h3>
          <p className="mt-1 text-xs text-muted-foreground">The affordability core is product-parameterised. Switching products swaps the numbers, not the logic.</p>
          <div className="mt-4 overflow-hidden rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Parameter</th>
                  <th className="px-4 py-2 font-medium">Consumer loan</th>
                  <th className="px-4 py-2 font-medium">Mortgage</th>
                </tr>
              </thead>
              <tbody>
                <ParamRow label="Demo APR" consumer={`${(CONSUMER_LOAN.apr * 100).toFixed(1)}%`} mortgage={`${(MORTGAGE.apr * 100).toFixed(1)}%`} />
                <ParamRow label="Affordability buffer" consumer={`${CONSUMER_LOAN.affordabilityBuffer}×`} mortgage={`${MORTGAGE.affordabilityBuffer}×`} />
                <ParamRow label="Max DTI" consumer={`${(CONSUMER_LOAN.maxDti * 100).toFixed(0)}%`} mortgage={`${(MORTGAGE.maxDti * 100).toFixed(0)}%`} />
                <ParamRow label="Stress-rate buffer" consumer={`+${(CONSUMER_LOAN.stressRateDelta * 100).toFixed(0)}%`} mortgage={`+${(MORTGAGE.stressRateDelta * 100).toFixed(0)}%`} />
                <ParamRow label="Min. history" consumer={`${CONSUMER_LOAN.minTenureMonths} mo`} mortgage={`${MORTGAGE.minTenureMonths} mo`} />
                <ParamRow label="Min. stability" consumer={`${(CONSUMER_LOAN.minStability * 100).toFixed(0)}%`} mortgage={`${(MORTGAGE.minStability * 100).toFixed(0)}%`} />
                <ParamRow label="Amount range" consumer="€1k–€50k" mortgage="€50k–€1m" />
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-brand-muted/40 to-transparent p-5">
          <h3 className="font-heading text-sm font-semibold">What the mortgage module adds</h3>
          <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Collateral checks: LTV and minimum equity on top of affordability.</li>
            <li className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Longer terms and a tighter DTI ceiling for secured lending.</li>
            <li className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> The same deterministic, per-rule, auditable decision and explainability.</li>
            <li className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Open finance / FIDA data widens the inputs beyond payment accounts.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
