import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  Building2,
  LineChart,
  ShieldCheck,
  Workflow,
  PlayCircle,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { Waveform } from "@/components/brand/waveform";
import { Button } from "@/components/ui/button";
import { CadenceMark } from "@/components/cadence-logo";

const FLOW = [
  { label: "Consent", desc: "AIS access, 180-day expiry", icon: ShieldCheck },
  { label: "Retrieve", desc: "Berlin Group account data", icon: Building2 },
  { label: "Categorise", desc: "Model labels every line", icon: Workflow },
  { label: "Afford", desc: "Haushaltsrechnung budget", icon: ClipboardCheck },
  { label: "Decide", desc: "Transparent, auditable", icon: LineChart },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.4]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <CadenceMark className="h-5 w-5" animate />
              Open Finance Data · lending decision engine
            </span>
            <h1 className="mt-5 font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Read the rhythm.
              <br />
              <span className="text-brand">Lend with reasons.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Cadence turns a loan applicant&apos;s account data into an explainable
              decision. Account access is a commodity — the categorisation and
              decisioning layer is the work. The credit decision itself is
              deterministic, transparent code an auditor can follow.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/apply">
                  Run an application <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/console">Open the console</Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/eval">See the model eval</Link>
              </Button>
            </div>
            <Link
              href="/tour"
              className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <PlayCircle className="h-4 w-4" />
              Take the 60-second tour
            </Link>
          </div>

          {/* Signature visual */}
          <div className="flex items-center">
            <div className="w-full rounded-2xl border bg-card/70 p-6 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Detected cash-flow rhythm</span>
                <span className="tabular-nums">~6 months · Demo Bank</span>
              </div>
              <div className="mt-4 h-40">
                <Waveform bars={48} animate />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center">
                <div>
                  <div className="font-heading text-lg font-semibold text-brand">Salary</div>
                  <div className="text-xs text-muted-foreground">monthly spike</div>
                </div>
                <div>
                  <div className="font-heading text-lg font-semibold">Recurring</div>
                  <div className="text-xs text-muted-foreground">rent · utilities</div>
                </div>
                <div>
                  <div className="font-heading text-lg font-semibold">Obligations</div>
                  <div className="text-xs text-muted-foreground">loans · BNPL</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flow strip */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {FLOW.map((step, i) => (
              <div key={step.label} className="relative rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <div className="mt-3 font-heading text-sm font-semibold">{step.label}</div>
                <div className="text-xs text-muted-foreground">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three doors */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <DoorCard
            href="/apply"
            eyebrow="Applicant journey"
            title="Run an application"
            body="Arrive from a comparison-portal lead, grant AIS consent, connect Demo Bank with simulated SCA, and submit. Your application lands live in the officer console."
            cta="Start as applicant"
          />
          <DoorCard
            href="/console"
            eyebrow="Loan officer console"
            title="Open the console"
            body="An eight-applicant portfolio with affordability badges, deep clickable explainability, the Haushaltsrechnung breakdown, and an append-only audit log."
            cta="Enter the console"
          />
          <DoorCard
            href="/eval"
            eyebrow="Model evaluation"
            title="See the model eval"
            body="Run the categoriser over a labelled set: accuracy, per-category precision/recall, a confusion matrix, and the hard cases shown failing honestly."
            cta="Open the eval"
          />
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            All brands are fictional placeholders. Synthetic data only. No real
            institution is represented.
          </p>
          <p>Built with Claude Code.</p>
        </div>
      </footer>
    </div>
  );
}

function DoorCard({
  href,
  eyebrow,
  title,
  body,
  cta,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border bg-card p-6 transition-all hover:border-brand/40 hover:shadow-md"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-brand">{eyebrow}</span>
      <h3 className="mt-2 font-heading text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">{body}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
