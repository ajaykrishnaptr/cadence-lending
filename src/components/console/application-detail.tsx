"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  RefreshCw,
  Wand2,
  Building2,
  PiggyBank,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import type { DecisionPackage } from "@/lib/engine";
import type { Account, CategorisedTransaction, CategoriserSource, DecisionOutcome } from "@/lib/types";
import type { ConsentView } from "@/lib/cadence/applications";
import type { DecisionRec } from "@/lib/store";
import { formatEUR, formatSigned, formatDate, formatDateTime, maskIban, daysUntil } from "@/lib/format";
import { purposeLabel } from "@/lib/labels";
import { recategoriseAction, regenerateRationaleAction, recordOfficerDecision, withdrawConsentAction } from "@/lib/actions";
import { ExplainProvider, Explain } from "./explain";
import { IncomeChart, BalanceChart, CategoryBars } from "./charts";
import { CategoryBadge, OutcomeBadge, StatusBadge, RuleStatusPill } from "@/components/brand/badges";
import { ScoreRing, ConfidenceBar } from "@/components/brand/score-ring";
import { Stat } from "@/components/brand/stat";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_META } from "@/lib/categories";
import { cn } from "@/lib/utils";

export interface DetailMeta {
  appId: string;
  isSeed: boolean;
  personaId: string;
  applicantName: string;
  tagline: string;
  expectedLabel: string;
  occupation: string;
  city: string;
  householdSize: number;
  status: "pending" | "approved" | "referred" | "declined";
  submittedAt: string;
}

export interface DetailProps {
  meta: DetailMeta;
  decision: DecisionPackage & { categoriserSource: CategoriserSource; categoriserFellBack?: boolean };
  accounts: Account[];
  balanceSeries: { date: string; balance: number }[];
  consent: ConsentView | null;
  officerDecision: DecisionRec | null;
  initialRationale: string;
}

export function ApplicationDetail(props: DetailProps) {
  const { meta, decision } = props;
  const [withdrawn, setWithdrawn] = useState(props.consent?.status === "withdrawn");

  return (
    <ExplainProvider transactions={decision.transactions}>
      <div className="space-y-6">
        <Header {...props} withdrawn={withdrawn} />
        <SummaryBand {...props} />
        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="obligations">Obligations</TabsTrigger>
            <TabsTrigger value="affordability">Affordability</TabsTrigger>
            <TabsTrigger value="decision">Decision</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-5">
            <OverviewTab {...props} withdrawn={withdrawn} setWithdrawn={setWithdrawn} />
          </TabsContent>
          <TabsContent value="transactions" className="mt-5">
            <TransactionsTab decision={decision} personaId={meta.personaId} withdrawn={withdrawn} />
          </TabsContent>
          <TabsContent value="income" className="mt-5">
            <IncomeTab decision={decision} />
          </TabsContent>
          <TabsContent value="obligations" className="mt-5">
            <ObligationsTab decision={decision} />
          </TabsContent>
          <TabsContent value="affordability" className="mt-5">
            <AffordabilityTab decision={decision} />
          </TabsContent>
          <TabsContent value="decision" className="mt-5">
            <DecisionTab {...props} />
          </TabsContent>
        </Tabs>
      </div>
    </ExplainProvider>
  );
}

// ---------------- Header ----------------
function Header({ meta, consent, withdrawn }: DetailProps & { withdrawn: boolean }) {
  const days = consent ? daysUntil(consent.expiresAt) : null;
  return (
    <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <Link href="/console/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Applications
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{meta.applicantName}</h1>
          {!meta.isSeed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-muted px-2 py-0.5 text-xs font-medium text-brand">
              <Sparkles className="h-3 w-3" /> This session
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {meta.tagline} · {meta.occupation} · {meta.city} · household of {meta.householdSize}
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <StatusBadge status={meta.status} />
        {consent && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
              withdrawn
                ? "bg-danger-muted text-danger-foreground ring-danger/30"
                : "bg-success-muted text-success-foreground ring-success/30",
            )}
          >
            {withdrawn ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {withdrawn ? "Consent withdrawn" : `Consent active · ${days}d to expiry`}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------- Summary band ----------------
function SummaryBand({ decision, meta }: DetailProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">Engine decision</span>
        <div className="mt-2">
          <OutcomeBadge outcome={decision.outcome} label={decision.outcomeLabel} size="lg" />
        </div>
      </div>
      <Stat
        label="Recommended limit"
        value={decision.recommendedLimit != null ? formatEUR(decision.recommendedLimit, false) : "—"}
        hint={decision.outcome === "approve" && decision.maxEligible > decision.request.amount ? `up to ${formatEUR(decision.maxEligible, false)} eligible` : `${formatEUR(decision.request.amount, false)} requested`}
      />
      <Stat label="Monthly instalment" value={formatEUR(decision.instalment)} hint={`${decision.request.termMonths} mo · ${(decision.product.apr * 100).toFixed(1)}% APR`} />
      <div className="rounded-xl border bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">Available income</span>
        <div className={cn("mt-1.5 font-heading text-2xl font-semibold tabular-nums", decision.haushalt.available < 0 && "text-danger-foreground")}>
          <Explain ids={decision.income.txnIds} title="Available income — income sources" description="Available income = net income − allowance − rent − obligations.">
            {formatEUR(decision.haushalt.available)}
          </Explain>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{purposeLabel(meta.status === "pending" ? decision.request.purpose : decision.request.purpose)} · submitted {formatDate(meta.submittedAt.slice(0, 10))}</div>
      </div>
    </div>
  );
}

// ---------------- Overview ----------------
function OverviewTab({ accounts, balanceSeries, consent, decision, meta, withdrawn, setWithdrawn }: DetailProps & { withdrawn: boolean; setWithdrawn: (v: boolean) => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function revoke() {
    start(async () => {
      if (consent?.id) {
        const res = await withdrawConsentAction({ consentId: consent.id, applicationId: meta.appId });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        router.refresh();
      }
      setWithdrawn(true);
      toast.success("Consent withdrawn", { description: "Account data is now hidden in the console (visual state)." });
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        {/* Accounts */}
        <div className="grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  {a.type === "checking" ? <Building2 className="h-4 w-4" /> : <PiggyBank className="h-4 w-4" />}
                </span>
                <div>
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{withdrawn ? "•••• hidden" : maskIban(a.iban)}</div>
                </div>
              </div>
              <div className="mt-3 font-heading text-xl font-semibold tabular-nums">
                {withdrawn ? "—" : formatEUR(a.balance)}
              </div>
            </div>
          ))}
        </div>
        {/* Balance chart */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Checking balance · last 6 months</div>
          {withdrawn ? <HiddenPanel /> : <BalanceChart data={balanceSeries} />}
        </div>
      </div>

      {/* Consent panel */}
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold">Consent (AIS)</h3>
            {consent && !withdrawn && (
              <Button variant="destructive" size="sm" onClick={revoke} disabled={pending}>
                <ShieldOff className="h-3.5 w-3.5" /> Revoke
              </Button>
            )}
          </div>
          {consent ? (
            <div className="mt-3 space-y-3 text-sm">
              <Row label="Status" value={withdrawn ? <span className="font-medium text-danger-foreground">Withdrawn</span> : <span className="font-medium text-success-foreground">Active</span>} />
              <Row label="Granted" value={formatDate(consent.grantedAt.slice(0, 10))} />
              <Row label="Expires (180 days)" value={`${formatDate(consent.expiresAt.slice(0, 10))} · ${daysUntil(consent.expiresAt)}d`} />
              <div>
                <span className="text-xs text-muted-foreground">Scopes granted</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.entries(consent.scope).map(([k, v]) => (
                    <span key={k} className={cn("rounded-md px-1.5 py-0.5 text-[11px] ring-1 ring-inset", v ? "bg-brand-muted text-brand ring-brand/20" : "bg-muted text-muted-foreground ring-border line-through")}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              {withdrawn && (
                <p className="rounded-lg bg-danger-muted/60 p-2 text-xs text-danger-foreground">
                  Consent withdrawn — account data hidden from the console. This is a visual state; the demo does not truly gate the underlying data.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No consent record for this application.</p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold">At a glance</h3>
          <div className="mt-3 space-y-2.5 text-sm">
            <Row label="Net monthly income" value={formatEUR(decision.income.monthlyNet)} />
            <Row label="Rent" value={formatEUR(decision.haushalt.rent)} />
            <Row label="Obligations" value={formatEUR(decision.haushalt.obligations)} />
            <Row label="DTI" value={`${(decision.dti * 100).toFixed(0)}%`} />
            <Row label="Income stability" value={`${(decision.income.stability * 100).toFixed(0)}%`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HiddenPanel() {
  return (
    <div className="flex h-[150px] flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 text-muted-foreground">
      <Lock className="h-5 w-5" />
      <span className="text-xs">Data hidden — consent withdrawn</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ---------------- Transactions ----------------
function TransactionsTab({ decision, personaId, withdrawn }: { decision: DetailProps["decision"]; personaId: string; withdrawn: boolean }) {
  const [txns, setTxns] = useState<CategorisedTransaction[]>(decision.transactions);
  const [source, setSource] = useState<CategoriserSource>(decision.categoriserSource);
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<string>("all");

  const sorted = useMemo(
    () => [...txns].sort((a, b) => (a.bookingDate < b.bookingDate ? 1 : -1)),
    [txns],
  );
  const shown = filter === "all" ? sorted : sorted.filter((t) => t.categorisation.category === filter);
  const cats = useMemo(() => [...new Set(txns.map((t) => t.categorisation.category))], [txns]);

  function recategorise() {
    start(async () => {
      const res = await recategoriseAction({ personaId });
      if (res.ok) {
        setTxns(res.transactions as CategorisedTransaction[]);
        setSource(res.source);
        if (res.fellBack) toast.warning("Fell back to rules baseline", { description: res.error ?? "Live model unavailable — using the deterministic categoriser." });
        else toast.success("Re-categorised with live Gemini", { description: `${res.transactions.length} transactions relabelled.` });
      } else {
        toast.error("Re-categorisation failed");
      }
    });
  }

  if (withdrawn) return <div className="rounded-xl border bg-card p-4"><HiddenPanel /></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Categoriser:</span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", source === "gemini" ? "bg-brand-muted text-brand ring-brand/25" : "bg-muted text-muted-foreground ring-border")}>
            {source === "gemini" ? "Gemini 2.5 Flash (live)" : source === "rules" ? "Rules baseline" : "Pre-computed"}
          </span>
          <span className="text-xs text-muted-foreground">{txns.length} lines</span>
        </div>
        <Button size="sm" variant="outline" onClick={recategorise} disabled={pending}>
          <Wand2 className={cn("h-3.5 w-3.5", pending && "animate-pulse")} /> {pending ? "Categorising…" : "Re-categorise (live Gemini)"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>All</FilterChip>
        {cats.map((c) => (
          <FilterChip key={c} active={filter === c} onClick={() => setFilter(c)}>{CATEGORY_META[c].label}</FilterChip>
        ))}
      </div>

      <div className="max-h-[560px] overflow-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/60 backdrop-blur">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Confidence</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.id} className="border-t transition-colors hover:bg-muted/30">
                <td className="whitespace-nowrap px-3 py-2 text-xs tabular-nums text-muted-foreground">{formatDate(t.bookingDate)}</td>
                <td className="max-w-[260px] truncate px-3 py-2">{t.description}</td>
                <td className="px-3 py-2"><CategoryBadge category={t.categorisation.category} /></td>
                <td className="hidden px-3 py-2 sm:table-cell"><ConfidenceBar value={t.categorisation.confidence} /></td>
                <td className={cn("px-3 py-2 text-right font-mono text-xs tabular-nums", t.amount >= 0 ? "text-success-foreground" : "text-foreground")}>{formatSigned(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-full px-2.5 py-1 text-xs font-medium transition-colors", active ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}

// ---------------- Income ----------------
function IncomeTab({ decision }: { decision: DetailProps["decision"] }) {
  const inc = decision.income;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-sm font-semibold">Monthly net income</h3>
          <span className="text-xs text-muted-foreground">{inc.cadence === "monthly" ? "Regular monthly" : "Irregular"}</span>
        </div>
        <IncomeChart data={inc.monthly} />
        <p className="mt-3 text-xs text-muted-foreground">
          Detected from{" "}
          <Explain ids={inc.txnIds} title="Detected income" description="Transactions classified as income (salary / recurring income).">
            {inc.txnIds.length} income transactions
          </Explain>
          {inc.detectedEmployer ? ` · payer “${inc.detectedEmployer}”` : ""}.
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
          <ScoreRing value={inc.stability} sublabel="stability" />
          <div>
            <div className="font-heading text-lg font-semibold">{inc.stabilityLabel}</div>
            <div className="text-sm text-muted-foreground">{(inc.stability * 100).toFixed(0)}% consistency across {inc.tenureMonths} months</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 text-sm">
          <Row label="Median net / month" value={<Explain ids={inc.txnIds} title="Median monthly income">{formatEUR(inc.monthlyNet)}</Explain>} />
          <div className="my-2 border-t" />
          <Row label="Cadence" value={inc.cadence} />
          <div className="my-2 border-t" />
          <Row label="Statement history" value={`${inc.tenureMonths} months`} />
        </div>
      </div>
    </div>
  );
}

// ---------------- Obligations ----------------
function ObligationsTab({ decision }: { decision: DetailProps["decision"] }) {
  const ob = decision.obligations;
  const items = [
    { label: "Rent", monthly: ob.rentMonthly, txnIds: ob.rentTxnIds, dot: CATEGORY_META.rent.dot },
    ...ob.items.map((i) => ({ label: i.label, monthly: i.monthly, txnIds: i.txnIds, dot: CATEGORY_META[i.category].dot })),
  ].filter((i) => i.monthly > 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading text-sm font-semibold">Monthly commitments</h3>
        <div className="mt-4 space-y-3">
          {items.map((i) => (
            <div key={i.label} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm">
                <span className={cn("h-2 w-2 rounded-full", i.dot)} />
                {i.label}
              </span>
              <Explain ids={i.txnIds} title={i.label} className="font-medium tabular-nums">
                {formatEUR(i.monthly)}
              </Explain>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t pt-3 text-sm font-semibold">
            <span>Total housing + credit</span>
            <span className="tabular-nums">{formatEUR(ob.rentMonthly + ob.totalMonthly)}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Credit obligations counted toward DTI: {formatEUR(ob.totalMonthly)}. Rent is treated as housing in the Haushaltsrechnung.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-heading text-sm font-semibold">Commitment mix</h3>
        <CategoryBars data={items.map((i, idx) => ({ label: i.label, value: i.monthly, color: `var(--chart-${(idx % 5) + 1})` }))} />
      </div>
    </div>
  );
}

// ---------------- Affordability ----------------
function AffordabilityTab({ decision }: { decision: DetailProps["decision"] }) {
  const h = decision.haushalt;
  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading text-sm font-semibold">Haushaltsrechnung (statutory affordability)</h3>
        <p className="mt-1 text-xs text-muted-foreground">Income minus a standard living-cost allowance, rent and existing credit gives the income available for a new instalment. Click any figure to see its source.</p>
        <div className="mt-4 space-y-1.5">
          {h.lines.map((l) => (
            <div key={l.id} className={cn("flex items-center justify-between rounded-lg px-3 py-2.5", l.kind === "result" ? "bg-brand-muted/60" : "hover:bg-muted/40")}>
              <div>
                <Explain ids={l.txnIds} title={l.label} description={l.note} disabled={l.txnIds.length === 0} className={cn("text-sm", l.kind === "result" && "font-semibold")}>
                  {l.label}
                </Explain>
                {l.note && <div className="text-[11px] text-muted-foreground">{l.note}</div>}
              </div>
              <span className={cn("font-mono text-sm tabular-nums", l.kind === "result" ? "font-semibold text-brand" : l.amount < 0 ? "text-foreground" : "text-success-foreground")}>
                {formatSigned(l.amount)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4 text-sm">
          <MiniStat label="Proposed instalment" value={formatEUR(decision.instalment)} />
          <MiniStat label="Buffer required" value={`${decision.product.affordabilityBuffer}×`} />
          <MiniStat label="Stressed instalment" value={formatEUR(decision.stressedInstalment)} hint={`@ +${(decision.product.stressRateDelta * 100).toFixed(0)}% APR`} />
          <MiniStat label="DTI" value={`${(decision.dti * 100).toFixed(0)}%`} hint={`max ${(decision.product.maxDti * 100).toFixed(0)}%`} />
        </div>
      </div>

      {/* Rules */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading text-sm font-semibold">Decision rules</h3>
        <p className="mt-1 text-xs text-muted-foreground">Every rule shows its inputs and a pass / refer / fail outcome. The decision is the deterministic combination of these — no model in the loop.</p>
        <div className="mt-4 space-y-3">
          {decision.rules.map((r) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.label}</span>
                    <RuleStatusPill status={r.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.description}</p>
                </div>
                <Explain ids={r.txnIds} title={r.label} className="shrink-0 text-right text-sm font-semibold tabular-nums" disabled={r.txnIds.length === 0}>
                  {r.valueLabel}
                </Explain>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                {r.inputs.map((inp) => (
                  <span key={inp.label} className="text-muted-foreground">
                    {inp.label}: <span className="font-medium text-foreground tabular-nums">{inp.value}</span>
                  </span>
                ))}
                <span className="text-muted-foreground">Threshold: <span className="font-medium text-foreground">{r.thresholdLabel}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-base font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

// ---------------- Decision ----------------
function DecisionTab(props: DetailProps) {
  const { decision, meta, officerDecision } = props;
  const router = useRouter();
  const [rationale, setRationale] = useState(props.initialRationale);
  const [rationaleSource, setRationaleSource] = useState<"gemini" | "rules">("rules");
  const [genPending, startGen] = useTransition();
  const [outcome, setOutcome] = useState<DecisionOutcome>(decision.outcome);
  const [note, setNote] = useState("");
  const [recPending, startRec] = useTransition();

  function regenerate() {
    startGen(async () => {
      const res = await regenerateRationaleAction({ personaId: meta.personaId, amount: decision.request.amount, termMonths: decision.request.termMonths, purpose: decision.request.purpose });
      if (res.ok) {
        setRationale(res.rationale);
        setRationaleSource(res.source);
        if (res.fellBack || res.source === "rules") toast.message("Rationale generated (deterministic)", { description: "Live model unavailable — used the grounded template." });
        else toast.success("Rationale regenerated with Gemini");
      }
    });
  }

  function record() {
    startRec(async () => {
      const label = outcome === "approve" ? "Approve" : outcome === "refer" ? "Refer to underwriter" : "Decline";
      const res = await recordOfficerDecision({ applicationId: meta.appId, outcome, outcomeLabel: label, recommendedLimit: decision.recommendedLimit, note: note || undefined });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Decision recorded", { description: "Written to the append-only audit log." });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <OutcomeBadge outcome={decision.outcome} label={decision.outcomeLabel} size="lg" />
            {decision.recommendedLimit != null && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Recommended limit</div>
                <div className="font-heading text-xl font-semibold tabular-nums">{formatEUR(decision.recommendedLimit, false)}</div>
              </div>
            )}
          </div>
          {decision.conditions.length > 0 && (
            <div className="mt-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-warning-foreground">Conditions</span>
              {decision.conditions.map((c, i) => (
                <p key={i} className="rounded-lg bg-warning-muted/60 p-2.5 text-xs text-warning-foreground">{c}</p>
              ))}
            </div>
          )}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grounded rationale</span>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset", rationaleSource === "gemini" ? "bg-brand-muted text-brand ring-brand/25" : "bg-muted text-muted-foreground ring-border")}>
                  {rationaleSource === "gemini" ? "Gemini" : "Deterministic"}
                </span>
                <Button size="sm" variant="ghost" onClick={regenerate} disabled={genPending}>
                  <RefreshCw className={cn("h-3.5 w-3.5", genPending && "animate-spin")} /> Regenerate
                </Button>
              </div>
            </div>
            <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed">{rationale}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">The rationale is grounded strictly in the computed figures. The decision itself is deterministic code — the model never decides.</p>
          </div>
        </div>
      </div>

      {/* Officer panel */}
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold">Officer decision</h3>
          {meta.isSeed ? (
            <p className="mt-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              This is a seeded portfolio application and is read-only. Run your own application from the applicant journey to record an override here.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(["approve", "refer", "decline"] as DecisionOutcome[]).map((o) => (
                  <button key={o} onClick={() => setOutcome(o)} className={cn("rounded-lg border px-2 py-2 text-xs font-medium capitalize transition-all", outcome === o ? "border-brand bg-brand-muted/60 text-brand" : "hover:border-brand/30")}>
                    {o}
                  </button>
                ))}
              </div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add an override note (optional)…" rows={3} className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30" />
              <Button className="w-full" onClick={record} disabled={recPending}>
                {recPending ? "Recording…" : "Record decision"}
              </Button>
              {officerDecision && (
                <p className="text-[11px] text-muted-foreground">
                  Last officer action: {officerDecision.outcomeLabel} · {formatDateTime(officerDecision.createdAt)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
