import Link from "next/link";
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  UserRound,
  Building2,
  Workflow,
  ClipboardCheck,
  ScrollText,
  LineChart,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { Waveform } from "@/components/brand/waveform";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Take the 60-second tour · Cadence",
};

const STOPS = [
  {
    icon: Sparkles,
    title: "Start on the golden path",
    desc: "The landing page frames the thesis: account access is a commodity, and the categorisation and decisioning layer is the work.",
    href: "/",
    cta: "View the landing page",
  },
  {
    icon: UserRound,
    title: "Walk the applicant journey",
    desc: "Arrive from a comparison-portal lead, choose an amount and term, and grant time-boxed account-information consent with simulated authentication.",
    href: "/apply",
    cta: "Run an application",
  },
  {
    icon: Building2,
    title: "Pull Demo Bank account data",
    desc: "With consent in place, the engine retrieves accounts and several months of transactions over a Berlin Group account-information interface.",
    href: "/apply",
    cta: "See the data pull",
  },
  {
    icon: Workflow,
    title: "Inspect the categorisation",
    desc: "Every transaction is labelled into one of sixteen categories with income, recurrence and obligation flags — and a grounded rationale per line.",
    href: "/console/applications",
    cta: "Open an application",
  },
  {
    icon: ClipboardCheck,
    title: "Read the Haushaltsrechnung",
    desc: "Follow the affordability budget — income, allowance, rent, obligations, available income — with every figure clickable down to the transactions behind it.",
    href: "/console/applications",
    cta: "Explore affordability",
  },
  {
    icon: ScrollText,
    title: "Trace the decision & audit",
    desc: "See approve, refer or decline with the exact rule outcomes, then replay the append-only audit log that records every input and threshold.",
    href: "/console",
    cta: "Enter the console",
  },
  {
    icon: LineChart,
    title: "Check the model eval",
    desc: "Run the categoriser over a labelled set: accuracy, per-category precision and recall, a confusion matrix, and the hard cases shown failing honestly.",
    href: "/eval",
    cta: "See the model eval",
  },
];

export default function TourPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="hero-glow pointer-events-none absolute inset-0" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.4]" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <PlayCircle className="h-4 w-4 text-brand" />
            Guided walkthrough
          </span>
          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Take the 60-second tour
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Seven stops trace one applicant from a comparison-portal lead to an
            explainable, audited decision. Follow them in order, or jump straight to
            whichever stage is most relevant.
          </p>
          <div className="mt-8 h-16 max-w-md">
            <Waveform bars={40} animate />
          </div>
        </div>
      </section>

      {/* Stops */}
      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6">
        <ol className="space-y-4">
          {STOPS.map((stop, i) => (
            <li
              key={stop.title}
              className="group flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-all hover:border-brand/40 hover:shadow-md sm:flex-row sm:items-center"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-muted font-heading text-lg font-semibold tabular-nums text-brand">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <stop.icon className="h-4 w-4 text-brand" />
                  <h2 className="font-heading text-lg font-semibold tracking-tight">
                    {stop.title}
                  </h2>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{stop.desc}</p>
              </div>
              <div className="shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={stop.href}>
                    {stop.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Closing CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Ready to see it for real?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Run a fresh application end to end, or step into the officer console and
            work the existing portfolio.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/apply">
                Run an application <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/console">Open the console</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            All brands are fictional placeholders. Synthetic data only. No real
            institution is represented.
          </p>
          <p>
            Prototype by{" "}
            <a
              href="https://www.linkedin.com/in/ajaykrishna1/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline underline-offset-4 hover:text-brand"
            >
              Ajay Krishna
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
