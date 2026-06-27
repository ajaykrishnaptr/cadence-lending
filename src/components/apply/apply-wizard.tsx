"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  ShieldCheck,
  Building2,
  Check,
  ArrowRight,
  ArrowLeft,
  Lock,
  Loader2,
  CalendarClock,
  CheckCircle2,
  Landmark,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { PersonaProfile, LoanPurpose, ConsentScope } from "@/lib/types";
import type { BankSuggestion } from "@/lib/demo-bank";
import { BANK_DIRECTORY, bankName, getBank } from "@/lib/demo-bank/banks";
import { CONSUMER_LOAN, monthlyInstalment } from "@/lib/engine/config";
import { formatEUR, maskIban } from "@/lib/format";
import { purposeLabel, PURPOSE_LABELS } from "@/lib/labels";
import { submitApplication, loginAs, suggestBanksAction } from "@/lib/actions";
import { CadenceMark } from "@/components/cadence-logo";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STEPS = ["Offer", "Banks", "Consent", "Done"];
const PURPOSES = Object.keys(PURPOSE_LABELS) as LoanPurpose[];
const SCOPE_LABELS: Record<keyof ConsentScope, string> = {
  accounts: "Account list & details",
  balances: "Balances",
  transactions: "Transaction history (≈6 months)",
  standingOrders: "Standing orders & direct debits",
};

export function ApplyWizard({ personas }: { personas: PersonaProfile[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [personaId, setPersonaId] = useState(personas[0].id);
  const persona = personas.find((p) => p.id === personaId)!;

  const [amount, setAmount] = useState(persona.request.amount);
  const [term, setTerm] = useState(persona.request.termMonths);
  const [purpose, setPurpose] = useState<LoanPurpose>(persona.request.purpose);
  const [scope, setScope] = useState<ConsentScope>({ accounts: true, balances: true, transactions: true, standingOrders: true });
  const [connected, setConnected] = useState<string[]>([]);
  const [resultAppId, setResultAppId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choosePersona(id: string) {
    const p = personas.find((x) => x.id === id)!;
    setPersonaId(id);
    setAmount(p.request.amount);
    setTerm(p.request.termMonths);
    setPurpose(p.request.purpose);
    setConnected([]);
  }

  const instalment = useMemo(() => monthlyInstalment(amount, CONSUMER_LOAN.apr, term), [amount, term]);
  const expiry = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 180);
    return d;
  }, []);

  function submit() {
    start(async () => {
      const res = await submitApplication({ personaId, amount, termMonths: term, purpose, scope, connectedBanks: connected });
      if (!res.ok) {
        toast.error(res.error ?? "Submission failed");
        return;
      }
      setResultAppId(res.applicationId);
      setStep(4);
    });
  }

  function openConsole() {
    start(async () => {
      await loginAs("officer");
      router.push(resultAppId ? `/console/applications/${resultAppId}` : "/console");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <StepIndicator step={step} />

      {step === 1 && (
        <OfferStep
          personas={personas}
          personaId={personaId}
          choosePersona={choosePersona}
          amount={amount}
          setAmount={setAmount}
          term={term}
          setTerm={setTerm}
          purpose={purpose}
          setPurpose={setPurpose}
          instalment={instalment}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <BanksStep
          persona={persona}
          connected={connected}
          setConnected={setConnected}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <ConsentStep
          scope={scope}
          setScope={setScope}
          expiry={expiry}
          banks={connected}
          pending={pending}
          onBack={() => setStep(2)}
          onGrant={submit}
        />
      )}

      {step === 4 && (
        <DoneStep persona={persona} amount={amount} term={term} purpose={purpose} banks={connected} onConsole={openConsole} pending={pending} />
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn("flex h-7 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors", active ? "bg-warm text-warm-foreground" : done ? "bg-success-muted text-success-foreground" : "bg-muted text-muted-foreground")}>
              {done ? <Check className="h-3.5 w-3.5" /> : <span className="tabular-nums">{n}</span>}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {n < STEPS.length && <div className={cn("h-px w-4 sm:w-8", step > n ? "bg-success" : "bg-border")} />}
          </div>
        );
      })}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border bg-card p-6 shadow-sm", className)}>{children}</div>;
}

// ---- Step 1: Offer ----
function OfferStep(props: {
  personas: PersonaProfile[];
  personaId: string;
  choosePersona: (id: string) => void;
  amount: number;
  setAmount: (n: number) => void;
  term: number;
  setTerm: (n: number) => void;
  purpose: LoanPurpose;
  setPurpose: (p: LoanPurpose) => void;
  instalment: number;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-warm/30 bg-warm-muted/50 p-4">
        <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-warm" />
        <div>
          <p className="text-sm font-medium">You arrived from a comparison-portal lead</p>
          <p className="text-xs text-muted-foreground">Pre-qualified for a consumer instalment loan. Adjust your request below, then connect your bank for an instant, explainable decision.</p>
        </div>
      </div>

      <Card>
        <h2 className="font-heading text-lg font-semibold">Who are you applying as?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick a synthetic applicant to embody for the demo. Their bank history drives the decision.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {props.personas.map((p) => (
            <button key={p.id} onClick={() => props.choosePersona(p.id)} className={cn("rounded-xl border p-3 text-left transition-all", props.personaId === p.id ? "border-warm bg-warm-muted/40 ring-1 ring-warm/30" : "hover:border-warm/30")}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{p.name}</div>
                {p.banks.length > 1 && <span className="rounded-full bg-brand-muted px-1.5 py-0.5 text-[10px] font-medium text-brand">{p.banks.length} banks</span>}
              </div>
              <div className="text-xs text-muted-foreground">{p.tagline}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-heading text-lg font-semibold">Your loan request</h2>
        <div className="mt-5 space-y-6">
          <div>
            <div className="flex items-end justify-between">
              <label className="text-sm font-medium">Amount</label>
              <span className="font-heading text-xl font-semibold tabular-nums">{formatEUR(props.amount, false)}</span>
            </div>
            <Slider className="mt-3" min={CONSUMER_LOAN.amountRange.min} max={CONSUMER_LOAN.amountRange.max} step={CONSUMER_LOAN.amountRange.step} value={[props.amount]} onValueChange={(v) => props.setAmount(Array.isArray(v) ? v[0] : v)} />
          </div>
          <div>
            <div className="flex items-end justify-between">
              <label className="text-sm font-medium">Term</label>
              <span className="font-heading text-xl font-semibold tabular-nums">{props.term} months</span>
            </div>
            <Slider className="mt-3" min={CONSUMER_LOAN.termRange.min} max={CONSUMER_LOAN.termRange.max} step={CONSUMER_LOAN.termRange.step} value={[props.term]} onValueChange={(v) => props.setTerm(Array.isArray(v) ? v[0] : v)} />
          </div>
          <div>
            <label className="text-sm font-medium">Purpose</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PURPOSES.map((p) => (
                <button key={p} onClick={() => props.setPurpose(p)} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", props.purpose === p ? "bg-warm text-warm-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  {purposeLabel(p)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Estimated monthly instalment</div>
              <div className="font-heading text-2xl font-semibold tabular-nums">{formatEUR(props.instalment)}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">{(CONSUMER_LOAN.apr * 100).toFixed(1)}% demo APR<br />fixed rate</div>
          </div>
        </div>
        <Button className="mt-6 w-full" size="lg" onClick={props.onNext}>
          Continue to bank connection <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}

// ---- Step 2: Banks (picker + per-bank connect + IBAN nudge) ----
function BanksStep({ persona, connected, setConnected, onBack, onNext }: {
  persona: PersonaProfile;
  connected: string[];
  setConnected: (b: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [authorising, setAuthorising] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<BankSuggestion[]>([]);
  const [showDir, setShowDir] = useState(false);
  const [query, setQuery] = useState("");
  const [, startSuggest] = useTransition();
  const primary = persona.banks[0];

  function refreshSuggestions(conn: string[]) {
    startSuggest(async () => {
      const res = await suggestBanksAction({ personaId: persona.id, connectedBanks: conn });
      setSuggestions(res.suggestions);
    });
  }

  function connectBank(bankId: string) {
    if (connected.includes(bankId) || authorising) return;
    setAuthorising(bankId);
    // simulated redirect + SCA
    setTimeout(() => {
      const next = [...connected, bankId];
      setConnected(next);
      setAuthorising(null);
      setShowDir(false);
      setQuery("");
      refreshSuggestions(next);
    }, 950);
  }

  const directory = BANK_DIRECTORY.filter(
    (b) => !connected.includes(b.id) && b.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-brand"><Landmark className="h-5 w-5" /></span>
        <div>
          <h2 className="font-heading text-lg font-semibold">Connect your banks</h2>
          <p className="text-sm text-muted-foreground">Cadence aggregates across every bank you connect. There&apos;s no central lookup of where you bank — you choose.</p>
        </div>
      </div>

      {/* Primary bank (from the lead) */}
      {!connected.includes(primary) && (
        <div className="mt-5 flex items-center justify-between rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background"><Building2 className="h-4 w-4" /></span>
            <div>
              <div className="text-sm font-medium">{bankName(primary)}</div>
              <div className="text-xs text-muted-foreground">Your application came through this bank</div>
            </div>
          </div>
          <Button size="sm" onClick={() => connectBank(primary)} disabled={!!authorising}>
            {authorising === primary ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Authorising…</> : "Connect"}
          </Button>
        </div>
      )}

      {/* Connected banks */}
      {connected.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Connected</p>
          <div className="mt-2 space-y-2">
            {connected.map((b) => {
              const bank = getBank(b);
              const hasData = bank?.hasData ?? false;
              return (
                <div key={b} className="flex items-center justify-between rounded-xl border border-success/30 bg-success-muted/40 p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-success text-success-foreground"><Check className="h-4 w-4" /></span>
                    <div>
                      <div className="text-sm font-medium">{bankName(b)}</div>
                      <div className="text-[11px] text-muted-foreground">{hasData ? "Accounts retrieved · SCA confirmed" : "No accounts found at this bank"}</div>
                    </div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-success" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* IBAN-based nudge */}
      {suggestions.map((s) => (
        <div key={s.bankId} className="mt-4 rounded-xl border border-brand/30 bg-brand-muted/40 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            <div className="flex-1">
              <p className="text-sm font-medium">We spotted another bank in your transactions</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {s.count} regular payment{s.count > 1 ? "s" : ""} to an account at <span className="font-medium text-foreground">{bankName(s.bankId)}</span> ({maskIban(s.sampleIban)}). Connect it for a complete affordability picture.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => connectBank(s.bankId)} disabled={!!authorising}>
                  {authorising === s.bankId ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Authorising…</> : <>Connect {bankName(s.bankId)}</>}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSuggestions((prev) => prev.filter((x) => x.bankId !== s.bankId))}>Not now</Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Manual add from the directory */}
      {connected.length > 0 && (
        <div className="mt-4">
          {!showDir ? (
            <Button variant="outline" size="sm" onClick={() => setShowDir(true)} disabled={!!authorising}>
              <Plus className="h-3.5 w-3.5" /> Add another bank
            </Button>
          ) : (
            <div className="rounded-xl border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the bank directory…" className="pl-8" />
              </div>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {directory.map((b) => (
                  <button key={b.id} onClick={() => connectBank(b.id)} disabled={!!authorising} className="flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors hover:bg-muted disabled:opacity-50">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Landmark className="h-3.5 w-3.5" /></span>
                      <div>
                        <div className="text-sm font-medium">{b.name}</div>
                        <div className="text-[11px] text-muted-foreground">{b.kind} · {b.bic}</div>
                      </div>
                    </div>
                    {authorising === b.id ? <Loader2 className="h-4 w-4 animate-spin text-brand" /> : <Plus className="h-4 w-4 text-muted-foreground" />}
                  </button>
                ))}
                {directory.length === 0 && <p className="p-2 text-xs text-muted-foreground">No banks match.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">Each bank authorises independently with its own SCA and consent. Connecting more banks gives a fuller, more accurate affordability assessment.</p>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="w-28" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button className="flex-1" disabled={connected.length === 0 || !!authorising} onClick={onNext}>
          Continue to consent <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

// ---- Step 3: Consent ----
function ConsentStep({ scope, setScope, expiry, banks, pending, onBack, onGrant }: { scope: ConsentScope; setScope: (s: ConsentScope) => void; expiry: Date; banks: string[]; pending: boolean; onBack: () => void; onGrant: () => void }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const expiryStr = `${expiry.getUTCDate()} ${months[expiry.getUTCMonth()]} ${expiry.getUTCFullYear()}`;
  const anyScope = Object.values(scope).some(Boolean);
  const multi = banks.length > 1;

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-brand"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h2 className="font-heading text-lg font-semibold">Account information consent</h2>
          <p className="text-sm text-muted-foreground">Grant Cadence read-only access at {banks.map(bankName).join(" and ")}. One consent per bank.</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border bg-muted/30 p-3 text-sm">
        <div className="flex items-center gap-2"><CadenceMark className="h-6 w-6" /> <span className="font-medium">Cadence</span></div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex flex-wrap items-center justify-end gap-2">
          {banks.map((b) => (
            <span key={b} className="flex items-center gap-1.5 rounded-md bg-card px-2 py-1 ring-1 ring-inset ring-border">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-foreground/80 text-background"><Building2 className="h-3 w-3" /></span>
              <span className="font-medium">{bankName(b)}</span>
            </span>
          ))}
        </div>
      </div>
      {multi && (
        <p className="mt-2 text-xs text-brand">Multibanking: a separate 180-day consent is recorded for each of your {banks.length} banks.</p>
      )}

      <div className="mt-5 space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Data you share</p>
        {(Object.keys(SCOPE_LABELS) as (keyof ConsentScope)[]).map((k) => (
          <div key={k} className="flex items-center justify-between border-b py-2.5 last:border-0">
            <span className="text-sm">{SCOPE_LABELS[k]}</span>
            <Switch checked={scope[k]} onCheckedChange={(v) => setScope({ ...scope, [k]: v })} />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info icon={<CalendarClock className="h-4 w-4" />} title="Retention & expiry" body={`Each consent lasts 180 days, expiring ${expiryStr}. You can withdraw any bank at any time.`} />
        <Info icon={<Lock className="h-4 w-4" />} title="Purpose" body="A one-off creditworthiness assessment for this loan application. Read-only — no payments can be made." />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">In this demo, consent is recorded for realism. It does not truly gate the underlying synthetic data, and withdrawing a bank flips that bank to a “data hidden” state.</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="sm:w-32" onClick={onBack} disabled={pending}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button variant="ghost" className="sm:flex-1" disabled={pending} onClick={() => toast.message("Consent declined", { description: "Without account access, no data-driven decision can be made." })}>Decline</Button>
        <Button className="sm:flex-1" disabled={!anyScope || pending} onClick={onGrant}>
          {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Granting & retrieving…</> : <>Grant access &amp; submit <ShieldCheck className="h-4 w-4" /></>}
        </Button>
      </div>
    </Card>
  );
}

function Info({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center gap-2 text-sm font-medium"><span className="text-brand">{icon}</span> {title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

// ---- Step 4: Done ----
function DoneStep({ persona, amount, term, purpose, banks, onConsole, pending }: { persona: PersonaProfile; amount: number; term: number; purpose: LoanPurpose; banks: string[]; onConsole: () => void; pending: boolean }) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-muted text-success-foreground">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-heading text-2xl font-semibold">Application submitted</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Thanks, {persona.name.split(" ")[0]}. Your request for {formatEUR(amount, false)} over {term} months ({purposeLabel(purpose)}) is now a pending application, aggregated across {banks.length} connected bank{banks.length > 1 ? "s" : ""} ({banks.map(bankName).join(", ")}), with per-bank consent recorded and the full data pull logged to the audit trail.
      </p>
      <div className="mx-auto mt-5 max-w-sm rounded-xl border bg-muted/30 p-4 text-left text-sm">
        <p className="font-medium">What happens next</p>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li>· The affordability engine has already produced a recommendation.</li>
          <li>· A loan officer reviews the explainable assessment and confirms or overrides.</li>
          <li>· Every step is in the append-only audit log.</li>
        </ul>
      </div>
      <Button className="mt-6" size="lg" onClick={onConsole} disabled={pending}>
        {pending ? "Opening…" : <>Open the officer console <ArrowRight className="h-4 w-4" /></>}
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">This switches your role to loan officer to close the loop.</p>
    </Card>
  );
}
