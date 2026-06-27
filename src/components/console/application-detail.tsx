"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  RefreshCw,
  Wand2,
  Building2,
  PiggyBank,
  Lock,
  Fingerprint,
  Scale,
  Gavel,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { DecisionPackage } from "@/lib/engine";
import type { Account, CategorisedTransaction, CategoriserSource, DecisionOutcome } from "@/lib/types";
import type { ConsentView } from "@/lib/cadence/applications";
import type { OriginationChecks, OriginationCheck } from "@/lib/origination";
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
import { bankName } from "@/lib/demo-bank/banks";
import { Landmark } from "lucide-react";
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
  consents: ConsentView[];
  officerDecision: DecisionRec | null;
  initialRationale: string;
  checks: OriginationChecks;
  humanReviewRequested: boolean;
}

export function ApplicationDetail(props: DetailProps) {
  const { meta, decision } = props;
  const router = useRouter();
  const [pending, startRevoke] = useTransition();
  const [tab, setTab] = useState("overview");
  const [withdrawn, setWithdrawn] = useState<Set<string>>(
    () => new Set(props.consents.filter((c) => c.status === "withdrawn").map((c) => c.bankId)),
  );

  function revokeBank(c: ConsentView) {
    startRevoke(async () => {
      if (c.source === "session" && c.id) {
        const res = await withdrawConsentAction({ consentId: c.id, applicationId: meta.appId });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        router.refresh();
      }
      setWithdrawn((prev) => new Set(prev).add(c.bankId));
      toast.success(`Consent withdrawn — ${bankName(c.bankId)}`, { description: "That bank's account data is now hidden in the console." });
    });
  }

  return (
    <ExplainProvider transactions={decision.transactions}>
      <div className="space-y-6">
        <Header meta={meta} consents={props.consents} withdrawn={withdrawn} />
        <SummaryBand decision={decision} meta={meta} />
        <DecisionCta decision={decision} officerDecision={props.officerDecision} humanReviewRequested={props.humanReviewRequested} onRecord={() => setTab("decision")} />
        <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="obligations">Obligations</TabsTrigger>
            <TabsTrigger value="affordability">Affordability</TabsTrigger>
            <TabsTrigger value="checks">Checks &amp; governance</TabsTrigger>
            <TabsTrigger value="decision">Decision</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-5">
            <OverviewTab
              accounts={props.accounts}
              balanceSeries={props.balanceSeries}
              consents={props.consents}
              decision={decision}
              withdrawn={withdrawn}
              revokeBank={revokeBank}
              pending={pending}
            />
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
          <TabsContent value="checks" className="mt-5">
            <ChecksTab checks={props.checks} decision={decision} humanReviewRequested={props.humanReviewRequested} />
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
function Header({ meta, consents, withdrawn }: { meta: DetailMeta; consents: ConsentView[]; withdrawn: Set<string> }) {
  const total = consents.length;
  const active = consents.filter((c) => !withdrawn.has(c.bankId));
  const allWithdrawn = total > 0 && active.length === 0;
  const minDays = active.length ? Math.min(...active.map((c) => daysUntil(c.expiresAt))) : 0;
  const label = allWithdrawn
    ? "Consent withdrawn"
    : total > 1
      ? `Consent · ${active.length}/${total} banks active`
      : `Consent active · ${minDays}d to expiry`;
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
        {total > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
              allWithdrawn
                ? "bg-danger-muted text-danger-foreground ring-danger/30"
                : "bg-success-muted text-success-foreground ring-success/30",
            )}
          >
            {allWithdrawn ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------- Summary band ----------------
function SummaryBand({ decision, meta }: { decision: DetailProps["decision"]; meta: DetailMeta }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="rounded-xl border bg-card p-4">
        <span className="text-xs font-medium text-muted-foreground">Engine decision</span>
        <div className="mt-2">
          <OutcomeBadge outcome={decision.outcome} label={decision.outcomeLabel} size="lg" />
        </div>
        {decision.dataCoverage && (
          <p className={cn("mt-2 text-[11px] font-medium tabular-nums", decision.dataCoverage.complete ? "text-muted-foreground" : "text-warm-foreground")}>
            {decision.dataCoverage.connectedCount}/{decision.dataCoverage.knownCount} banks · {decision.dataCoverage.percent}% data coverage
            {!decision.dataCoverage.complete && decision.dataCoverage.missingBankNames.length > 0 && (
              <span className="font-normal"> · {decision.dataCoverage.missingBankNames.join(", ")} not connected</span>
            )}
          </p>
        )}
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

// ---------------- Awaiting-decision CTA ----------------
function DecisionCta({ decision, officerDecision, humanReviewRequested, onRecord }: {
  decision: DetailProps["decision"];
  officerDecision: DecisionRec | null;
  humanReviewRequested: boolean;
  onRecord: () => void;
}) {
  if (officerDecision) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium">Officer decision recorded — {officerDecision.outcomeLabel}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(officerDecision.createdAt)}{officerDecision.note ? ` · ${officerDecision.note}` : ""}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={onRecord}>Review / change</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warm/40 bg-warm-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-warm" />
        <div>
          <p className="text-sm font-medium">Awaiting officer decision{humanReviewRequested && <span className="ml-2 rounded-full bg-warm px-1.5 py-0.5 text-[10px] font-medium text-warm-foreground">human review requested</span>}</p>
          <p className="text-xs text-muted-foreground">The engine recommends <span className="font-medium text-foreground">{decision.outcomeLabel}</span>. Review the explainable assessment and confirm or override.</p>
        </div>
      </div>
      <Button size="sm" onClick={onRecord}>Record decision <ArrowRight className="h-4 w-4" /></Button>
    </div>
  );
}

// ---------------- Overview ----------------
function OverviewTab({ accounts, balanceSeries, consents, decision, withdrawn, revokeBank, pending }: {
  accounts: Account[];
  balanceSeries: { date: string; balance: number }[];
  consents: ConsentView[];
  decision: DetailProps["decision"];
  withdrawn: Set<string>;
  revokeBank: (c: ConsentView) => void;
  pending: boolean;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        {/* Accounts grouped by ASPSP (multibanking) */}
        <AccountsByBank accounts={accounts} withdrawnBanks={withdrawn} />
        {/* Balance chart */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Checking balance · last 6 months</div>
          {withdrawn.has("demo-bank") ? <HiddenPanel /> : <BalanceChart data={balanceSeries} />}
        </div>
      </div>

      {/* Consent panel */}
      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-heading text-sm font-semibold">Consent (AIS)</h3>
          {consents.length > 1 && (
            <p className="mt-0.5 text-xs text-muted-foreground">One consent per bank — each can be revoked independently.</p>
          )}
          <div className="mt-3 space-y-2.5">
            {consents.map((c) => {
              const wd = withdrawn.has(c.bankId);
              return (
                <div key={c.bankId} className={cn("rounded-lg border p-3", wd && "border-danger/30 bg-danger-muted/30")}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium"><Landmark className="h-3.5 w-3.5 text-brand" /> {bankName(c.bankId)}</span>
                    {wd ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-muted px-2 py-0.5 text-[11px] font-medium text-danger-foreground ring-1 ring-inset ring-danger/30"><ShieldOff className="h-3 w-3" /> Withdrawn</span>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => revokeBank(c)} disabled={pending}><ShieldOff className="h-3.5 w-3.5" /> Revoke</Button>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Granted</span><span className="tabular-nums text-foreground">{formatDate(c.grantedAt.slice(0, 10))}</span></div>
                    <div className="flex justify-between"><span>Expires (180d)</span><span className="tabular-nums text-foreground">{formatDate(c.expiresAt.slice(0, 10))} · {daysUntil(c.expiresAt)}d</span></div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(c.scope).map(([k, v]) => (
                      <span key={k} className={cn("rounded px-1.5 py-0.5 text-[10px] ring-1 ring-inset", v ? "bg-brand-muted text-brand ring-brand/20" : "bg-muted text-muted-foreground ring-border line-through")}>{k}</span>
                    ))}
                  </div>
                </div>
              );
            })}
            {consents.length === 0 && <p className="text-sm text-muted-foreground">No consent record for this application.</p>}
          </div>
          {withdrawn.size > 0 && (
            <p className="mt-3 rounded-lg bg-danger-muted/60 p-2 text-xs text-danger-foreground">Withdrawn banks&apos; account data is hidden from the console. This is a visual state; the demo does not truly gate the underlying data.</p>
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

function AccountsByBank({ accounts, withdrawnBanks }: { accounts: Account[]; withdrawnBanks: Set<string> }) {
  const banks = [...new Set(accounts.map((a) => a.bankId))];
  return (
    <div className="space-y-4">
      {banks.length > 1 && (
        <div className="flex items-center gap-2 rounded-lg border border-brand/25 bg-brand-muted/40 px-3 py-2 text-xs font-medium text-brand">
          <Landmark className="h-3.5 w-3.5 shrink-0" />
          Aggregated across {banks.length} banks via open banking — {banks.map(bankName).join(" + ")}
        </div>
      )}
      {banks.map((bankId) => {
        const wd = withdrawnBanks.has(bankId);
        return (
          <div key={bankId}>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Landmark className="h-3.5 w-3.5" /> {bankName(bankId)}
              {wd && <span className="rounded bg-danger-muted px-1.5 py-0.5 text-[9px] font-semibold text-danger-foreground">consent withdrawn</span>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.filter((a) => a.bankId === bankId).map((a) => (
                <div key={a.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                      {a.type === "checking" ? <Building2 className="h-4 w-4" /> : <PiggyBank className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{wd ? "•••• hidden" : maskIban(a.iban)}</div>
                    </div>
                  </div>
                  <div className="mt-3 font-heading text-xl font-semibold tabular-nums">
                    {wd ? "—" : formatEUR(a.balance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
function TransactionsTab({ decision, personaId, withdrawn }: { decision: DetailProps["decision"]; personaId: string; withdrawn: Set<string> }) {
  const [txns, setTxns] = useState<CategorisedTransaction[]>(decision.transactions);
  const [source, setSource] = useState<CategoriserSource>(decision.categoriserSource);
  const [liveModel, setLiveModel] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<string>("all");

  const sorted = useMemo(
    () => [...txns].sort((a, b) => (a.bookingDate < b.bookingDate ? 1 : -1)),
    [txns],
  );
  const visible = useMemo(() => sorted.filter((t) => !withdrawn.has(t.bankId ?? "")), [sorted, withdrawn]);
  const shown = filter === "all" ? visible : visible.filter((t) => t.categorisation.category === filter);
  const cats = useMemo(() => [...new Set(txns.map((t) => t.categorisation.category))], [txns]);
  const multiBank = useMemo(() => new Set(txns.map((t) => t.bankId).filter(Boolean)).size > 1, [txns]);

  function recategorise() {
    start(async () => {
      const res = await recategoriseAction({ personaId });
      if (res.ok) {
        setTxns(res.transactions as CategorisedTransaction[]);
        setSource(res.source);
        setLiveModel(res.model ?? null);
        if (res.fellBack) toast.warning("Fell back to rules baseline", { description: res.error ?? "No live model available — using the deterministic categoriser." });
        else {
          const c = res.cache;
          const via = res.model ? ` via ${res.model}` : "";
          const desc = c
            ? c.misses === 0
              ? `All ${res.transactions.length} lines served from the ${c.store} cache — zero model calls.`
              : `${res.transactions.length} relabelled · ${c.hits} from cache, ${c.misses} live model call${c.misses > 1 ? "s" : ""}${via}.`
            : `${res.transactions.length} transactions relabelled${via}.`;
          toast.success(`Re-categorised${res.model ? ` with ${res.model}` : " live"}`, { description: desc });
        }
      } else {
        toast.error("Re-categorisation failed");
      }
    });
  }

  if (withdrawn.size > 0 && visible.length === 0) return <div className="rounded-xl border bg-card p-4"><HiddenPanel /></div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Categoriser:</span>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", source === "gemini" ? "bg-brand-muted text-brand ring-brand/25" : "bg-muted text-muted-foreground ring-border")}>
            {source === "gemini" ? `${liveModel ?? "Live model"} (live)` : source === "rules" ? "Rules baseline" : "Pre-computed"}
          </span>
          <span className="text-xs text-muted-foreground">{txns.length} lines</span>
        </div>
        <Button size="sm" variant="outline" onClick={recategorise} disabled={pending}>
          <Wand2 className={cn("h-3.5 w-3.5", pending && "animate-pulse")} /> {pending ? "Categorising…" : "Re-categorise (live model)"}
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
                <td className="max-w-[260px] px-3 py-2">
                  <div className="truncate">{t.description}</div>
                  {multiBank && t.bankId && (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Landmark className="h-2.5 w-2.5" /> {bankName(t.bankId)}
                    </span>
                  )}
                </td>
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

// ---------------- Checks & governance ----------------
function CheckIcon({ id }: { id: string }) {
  const cls = "h-4 w-4";
  if (id === "identity") return <Fingerprint className={cls} />;
  if (id === "sanctions") return <Scale className={cls} />;
  if (id === "aml") return <ShieldCheck className={cls} />;
  if (id === "fraud") return <Lock className={cls} />;
  return <UserCheck className={cls} />; // income
}

function CheckStatusPill({ status }: { status: OriginationCheck["status"] }) {
  const map = {
    pass: { label: "Pass", cls: "bg-success-muted text-success-foreground ring-success/30", Icon: CheckCircle2 },
    review: { label: "Review", cls: "bg-warning-muted text-warning-foreground ring-warning/30", Icon: AlertTriangle },
    fail: { label: "Fail", cls: "bg-danger-muted text-danger-foreground ring-danger/30", Icon: AlertTriangle },
  }[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", map.cls)}>
      <map.Icon className="h-3 w-3" /> {map.label}
    </span>
  );
}

function ChecksTab({ checks, decision, humanReviewRequested }: { checks: OriginationChecks; decision: DetailProps["decision"]; humanReviewRequested: boolean }) {
  return (
    <div className="space-y-6">
      {/* Onboarding / compliance checks */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold">Onboarding &amp; compliance checks</h3>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", checks.allClear ? "bg-success-muted text-success-foreground ring-success/30" : "bg-warning-muted text-warning-foreground ring-warning/30")}>
            {checks.allClear ? "All gates clear" : "Attention needed"}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Prerequisites and corroboration around the scored decision — KYC/AML, fraud and income verification. These gate origination but are not inputs to the affordability engine. Synthetic in this demo.</p>
        <div className="mt-4 space-y-2">
          {checks.checks.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><CheckIcon id={c.id} /></span>
                <div>
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
              </div>
              <CheckStatusPill status={c.status} />
            </div>
          ))}
        </div>
      </div>

      {/* GDPR Art. 22 governance */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand"><Gavel className="h-4 w-4" /></span>
          <h3 className="font-heading text-sm font-semibold">Automated decision — GDPR Art. 22</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          This recommendation (<span className="font-medium text-foreground">{decision.outcomeLabel}</span>) was produced by a fully automated process — the deterministic affordability engine plus the credit-bureau rule, with no human in the loop. That makes it a decision under <span className="font-medium text-foreground">GDPR Art. 22</span>.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <GovCard title="Legal basis" body="Art. 22(2)(a) — necessary for entering into / performing the loan contract the applicant requested." />
          <GovCard title="§31 BDSG (scoring)" body={`The bureau score (${decision.bureau ? `${decision.bureau.score}/100` : "n/a"}) is one input among bank-statement affordability evidence — not the sole basis, as §31 BDSG requires.`} />
          <GovCard title="Safeguards — Art. 22(3)" body="The applicant has the right to obtain human intervention, to express their point of view, and to contest the decision." />
          <GovCard title="Explainability" body="Every rule exposes its inputs and threshold on the Decision tab; the rationale is grounded strictly in those figures." />
        </div>
        <div className={cn("mt-4 flex items-start gap-2.5 rounded-lg border p-3", humanReviewRequested ? "border-warm/40 bg-warm-muted/30" : "bg-muted/40")}>
          {humanReviewRequested ? <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-warm" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="text-xs">
            <div className="font-medium">{humanReviewRequested ? "Human review requested by the applicant" : "Human-review path available"}</div>
            <p className="mt-0.5 text-muted-foreground">{humanReviewRequested ? "The applicant exercised their Art. 22(3) right — this application was escalated to an underwriter (status: referred). An officer must record the final decision below." : "If the applicant requests it, the case is escalated to an underwriter. An officer can also override the engine on the Decision tab at any time."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GovCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs font-medium">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
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
          <div className="mt-3 space-y-3">
            {meta.isSeed && (
              <p className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                Seeded portfolio application — your decision is recorded for this session only and does not change the shared demo data.
              </p>
            )}
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
        </div>
      </div>
    </div>
  );
}
