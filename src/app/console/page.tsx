import Link from "next/link";
import { Inbox, TrendingUp, Wallet, Gauge, Activity, ArrowRight } from "lucide-react";
import { getSessionId } from "@/lib/session";
import { getConsoleApplications } from "@/lib/cadence/applications";
import { baselineEval } from "@/lib/eval";
import { formatEUR } from "@/lib/format";
import { Stat, SectionTitle } from "@/components/brand/stat";
import { DonutChart } from "@/components/console/charts";
import { OutcomeBadge, StatusBadge } from "@/components/brand/badges";

export default async function DashboardPage() {
  const sid = await getSessionId();
  const apps = await getConsoleApplications(sid);
  const ev = baselineEval();

  const counts = {
    approved: apps.filter((a) => a.status === "approved").length,
    referred: apps.filter((a) => a.status === "referred").length,
    declined: apps.filter((a) => a.status === "declined").length,
    pending: apps.filter((a) => a.status === "pending").length,
  };
  const pipeline = apps.reduce((s, a) => s + a.request.amount, 0);
  const approvedValue = apps.filter((a) => a.outcome === "approve").reduce((s, a) => s + (a.recommendedLimit ?? a.request.amount), 0);
  const avgAvailable = apps.length ? apps.reduce((s, a) => s + a.available, 0) / apps.length : 0;

  const mix = [
    { name: "Approved", value: counts.approved, color: "var(--success)" },
    { name: "Referred", value: counts.referred, color: "var(--warning)" },
    { name: "Declined", value: counts.declined, color: "var(--danger)" },
    { name: "Pending", value: counts.pending, color: "var(--brand)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <SectionTitle title="Portfolio dashboard" description="A snapshot of the application book, decision mix, pipeline value and categoriser accuracy." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Applications" value={apps.length} icon={<Inbox className="h-4 w-4" />} hint={`${counts.pending} pending review`} />
        <Stat label="Pipeline value" value={formatEUR(pipeline, false)} icon={<TrendingUp className="h-4 w-4" />} hint={`${formatEUR(approvedValue, false)} approvable`} />
        <Stat label="Avg available income" value={formatEUR(avgAvailable, false)} icon={<Wallet className="h-4 w-4" />} hint="per applicant / month" />
        <Stat label="Categoriser accuracy" value={`${(ev.accuracy * 100).toFixed(1)}%`} icon={<Activity className="h-4 w-4" />} hint={`${ev.total} labelled lines`} tone="brand" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold">Decision mix</h3>
          <DonutChart data={mix} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {mix.map((m) => (
              <div key={m.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                <span className="text-muted-foreground">{m.name}</span>
                <span className="ml-auto font-medium tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold">Recent applications</h3>
            <Link href="/console/applications" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 divide-y">
            {apps.slice(0, 6).map((a) => (
              <Link key={a.id} href={`/console/applications/${a.id}`} className="flex items-center justify-between py-2.5 transition-colors hover:opacity-80">
                <div>
                  <div className="text-sm font-medium">{a.applicantName}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">{formatEUR(a.request.amount, false)} · {a.request.termMonths} mo</div>
                </div>
                <div className="flex items-center gap-2">
                  <OutcomeBadge outcome={a.outcome} label={a.outcomeLabel} size="sm" />
                  <StatusBadge status={a.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-gradient-to-br from-brand-muted/40 to-transparent p-5">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <h3 className="font-heading text-sm font-semibold">The decision is deterministic code</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              The model categorises transactions and drafts the rationale. Every approve / refer / decline is the transparent combination of the affordability rules — auditable, reproducible, and explainable down to the source transaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
