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
} from "lucide-react";
import { toast } from "sonner";
import type { PersonaProfile, LoanPurpose, ConsentScope } from "@/lib/types";
import { CONSUMER_LOAN, monthlyInstalment } from "@/lib/engine/config";
import { formatEUR } from "@/lib/format";
import { purposeLabel, PURPOSE_LABELS } from "@/lib/labels";
import { submitApplication, loginAs } from "@/lib/actions";
import { CadenceMark } from "@/components/cadence-logo";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STEPS = ["Offer", "Consent", "Connect", "Done"];
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

  const [connectState, setConnectState] = useState<"login" | "sca" | "pulling">("login");
  const [resultAppId, setResultAppId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choosePersona(id: string) {
    const p = personas.find((x) => x.id === id)!;
    setPersonaId(id);
    setAmount(p.request.amount);
    setTerm(p.request.termMonths);
    setPurpose(p.request.purpose);
  }

  const instalment = useMemo(() => monthlyInstalment(amount, CONSUMER_LOAN.apr, term), [amount, term]);
  const expiry = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 180);
    return d;
  }, []);

  function submit() {
    start(async () => {
      const res = await submitApplication({ personaId, amount, termMonths: term, purpose, scope });
      if (!res.ok) {
        toast.error(res.error ?? "Submission failed");
        setConnectState("login");
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
        <ConsentStep
          scope={scope}
          setScope={setScope}
          expiry={expiry}
          onBack={() => setStep(1)}
          onGrant={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <ConnectStep
          persona={persona}
          state={connectState}
          setState={setConnectState}
          pending={pending}
          onAuthorise={submit}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <DoneStep persona={persona} amount={amount} term={term} purpose={purpose} onConsole={openConsole} pending={pending} />
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
        <p className="mt-1 text-sm text-muted-foreground">Pick a synthetic applicant to embody for the demo. Their Demo Bank history drives the decision.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {props.personas.map((p) => (
            <button key={p.id} onClick={() => props.choosePersona(p.id)} className={cn("rounded-xl border p-3 text-left transition-all", props.personaId === p.id ? "border-warm bg-warm-muted/40 ring-1 ring-warm/30" : "hover:border-warm/30")}>
              <div className="text-sm font-medium">{p.name}</div>
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
          Continue to consent <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
}

// ---- Step 2: Consent ----
function ConsentStep({ scope, setScope, expiry, onBack, onGrant }: { scope: ConsentScope; setScope: (s: ConsentScope) => void; expiry: Date; onBack: () => void; onGrant: () => void }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const expiryStr = `${expiry.getUTCDate()} ${months[expiry.getUTCMonth()]} ${expiry.getUTCFullYear()}`;
  const anyScope = Object.values(scope).some(Boolean);

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-brand"><ShieldCheck className="h-5 w-5" /></span>
        <div>
          <h2 className="font-heading text-lg font-semibold">Account information consent</h2>
          <p className="text-sm text-muted-foreground">Cadence is requesting read-only access to your Demo Bank accounts.</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border bg-muted/30 p-3 text-sm">
        <div className="flex items-center gap-2"><CadenceMark className="h-6 w-6" /> <span className="font-medium">Cadence</span></div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground/80 text-background"><Building2 className="h-3.5 w-3.5" /></span> <span className="font-medium">Demo Bank</span></div>
      </div>

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
        <Info icon={<CalendarClock className="h-4 w-4" />} title="Retention & expiry" body={`Consent lasts 180 days, expiring ${expiryStr}. You can withdraw it at any time.`} />
        <Info icon={<Lock className="h-4 w-4" />} title="Purpose" body="A one-off creditworthiness assessment for this loan application. Read-only — no payments can be made." />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">In this demo, consent is recorded for realism. It does not truly gate the underlying synthetic data, and withdrawing it flips the console to a “data hidden” state.</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="sm:w-32" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button variant="ghost" className="sm:flex-1" onClick={() => toast.message("Consent declined", { description: "Without account access, no data-driven decision can be made." })}>Decline</Button>
        <Button className="sm:flex-1" disabled={!anyScope} onClick={onGrant}>Grant access <ShieldCheck className="h-4 w-4" /></Button>
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

// ---- Step 3: Connect (Demo Bank) ----
function ConnectStep({ persona, state, setState, pending, onAuthorise, onBack }: { persona: PersonaProfile; state: "login" | "sca" | "pulling"; setState: (s: "login" | "sca" | "pulling") => void; pending: boolean; onAuthorise: () => void; onBack: () => void }) {
  return (
    <Card className="border-foreground/15 bg-gradient-to-b from-foreground/[0.03] to-transparent">
      <div className="flex items-center gap-3 border-b pb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background"><Building2 className="h-5 w-5" /></span>
        <div>
          <h2 className="font-heading text-lg font-semibold">Demo Bank — secure sign-in</h2>
          <p className="text-xs text-muted-foreground">You have been redirected to your bank to authorise access. Cadence never sees your credentials.</p>
        </div>
      </div>

      {state === "login" && (
        <div className="mt-5 space-y-4">
          <Field label="Online banking ID" value={persona.name.toLowerCase().replace(/\s+/g, ".") + "@demo.bank"} />
          <Field label="PIN" value="••••••" mono />
          <p className="text-xs text-muted-foreground">Synthetic credentials, pre-filled for the demo.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="w-28" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button className="flex-1" onClick={() => setState("sca")}>Log in to Demo Bank <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {state === "sca" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-medium">Strong customer authentication</p>
            <p className="mt-1 text-xs text-muted-foreground">A push notification was sent to your Demo Bank app. Enter the 6-digit code to confirm.</p>
            <div className="mt-3 flex gap-2">
              {"123456".split("").map((d, i) => (
                <div key={i} className="flex h-10 w-9 items-center justify-center rounded-lg border bg-card font-mono text-lg tabular-nums">{d}</div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="w-28" onClick={() => setState("login")}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button className="flex-1" onClick={() => { setState("pulling"); onAuthorise(); }} disabled={pending}>Confirm &amp; authorise <ShieldCheck className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {state === "pulling" && (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm font-medium">Retrieving your account data…</p>
          <p className="max-w-xs text-xs text-muted-foreground">Cadence is calling Demo Bank&apos;s Berlin Group AIS endpoints, then categorising ~6 months of transactions.</p>
        </div>
      )}
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className={cn("mt-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm", mono && "font-mono")}>{value}</div>
    </div>
  );
}

// ---- Step 4: Done ----
function DoneStep({ persona, amount, term, purpose, onConsole, pending }: { persona: PersonaProfile; amount: number; term: number; purpose: LoanPurpose; onConsole: () => void; pending: boolean }) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-muted text-success-foreground">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-heading text-2xl font-semibold">Application submitted</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Thanks, {persona.name.split(" ")[0]}. Your request for {formatEUR(amount, false)} over {term} months ({purposeLabel(purpose)}) is now a pending application in the loan officer console, with consent recorded and the full data pull logged to the audit trail.
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
