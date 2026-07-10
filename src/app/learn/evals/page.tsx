import Link from "next/link";
import {
  ShieldCheck,
  Bot,
  Code,
  Scale,
  FlaskConical,
  Ruler,
  Gauge,
  Repeat,
  CircleCheck,
  CircleX,
} from "lucide-react";
import {
  LearnHeader,
  LearnSection,
  LearnCard,
  NextPageLink,
} from "@/components/learn/learn-ui";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "How the AI is evaluated · Learn · Cadence",
};

/** The three ways any single check is run — the method taxonomy. */
const METHODS = [
  {
    key: "code",
    label: "Code",
    icon: <Code className="h-4 w-4" />,
    desc: "Deterministic, cheap, exact. Used where the answer is definitive — a figure that must trace to a source, a banned phrase, a length band. Runs with no model and no API key.",
  },
  {
    key: "judge",
    label: "LLM-as-judge",
    icon: <Bot className="h-4 w-4" />,
    desc: "A separate, more capable model scores the subjective dimensions — relevance, balance, tone — that code cannot. It returns a pass/fail, a 1–5 score, and a written reason.",
  },
  {
    key: "human",
    label: "Human",
    icon: <Scale className="h-4 w-4" />,
    desc: "A subject-matter reviewer for new features, calibration, and the cases the automated layers flag. Costly and slow, so reserved for where judgement genuinely matters.",
  },
];

/**
 * The rationale dimensions. Described as the evaluation *design* — what the
 * rationale is held to — not as a live scoreboard. The categoriser numbers live
 * on the eval page; these define the checks.
 */
const RATIONALE_DIMENSIONS = [
  {
    name: "Groundedness",
    method: "Code",
    gate: "Hard gate",
    desc: "Every figure in the text must trace back to the decision package — allowing for rounding and derived values such as debt-to-income. A fabricated number fails.",
  },
  {
    name: "Outcome faithfulness",
    method: "Code",
    gate: "Hard gate",
    desc: "The outcome the text states must match the outcome the engine computed. A rationale cannot narrate an approval over a decline.",
  },
  {
    name: "Compliance",
    method: "Code + judge",
    gate: "Hard gate",
    desc: "No advice, no recommendation to lend or decline, no reasoning from protected attributes. A curated deny-list gates it; the judge adds a second pass for paraphrased advice.",
  },
  {
    name: "Completeness",
    method: "Code",
    gate: "Gate",
    desc: "The rule that actually drove the outcome has to appear in the explanation — a decline on affordability must say so.",
  },
  {
    name: "Structure",
    method: "Code",
    gate: "Gate",
    desc: "A readable length band, and the core affordability figures — income and what remains after costs — must be present.",
  },
  {
    name: "Relevance · balance · tone",
    method: "LLM-as-judge",
    gate: "Informational",
    desc: "Is it clear, does it weigh both sides fairly, is it professional? Scored 1–5 with a reason. Advisory, not blocking.",
  },
];

export default function LearnEvalsPage() {
  return (
    <>
      <LearnHeader
        eyebrow="Learn"
        title="How the AI is evaluated"
        intro="A language model is non-deterministic: the same prompt can return different answers. In a regulated lending context that is a liability, so the two things the model does — categorise transactions and explain the decision — are each measured against explicit standards before and after release."
      />

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-6 lg:py-16">
        <LearnSection
          eyebrow="Why"
          title="Evaluations are the guardrails, not a nice-to-have"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <LearnCard title="The model is a variable, not a fixture" icon={<Repeat className="h-4 w-4" />}>
              The prompt, the model, and the context are knobs. Evaluations are how
              you turn those knobs with evidence — swapping to a cheaper model, or
              tightening a prompt — instead of guessing and hoping the demo held.
            </LearnCard>
            <LearnCard title="A regulated domain is unforgiving" icon={<ShieldCheck className="h-4 w-4" />}>
              A wrong figure or a stray recommendation is not a cosmetic bug here.
              The checks below exist so that behaviour is enforced and demonstrable,
              not left to the model&apos;s good mood on the day.
            </LearnCard>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Scope"
          title="Two surfaces are evaluated — the decision is not one of them"
          description="The credit decision is deterministic code over the categorised totals. It is not a model output, so it is not evaluated as one. Only the two places a model actually speaks are held to these standards."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <LearnCard title="The categoriser" icon={<FlaskConical className="h-4 w-4" />}>
              Reads each raw transaction and labels it — category, plus income,
              recurrence and obligation flags. This is perception: it turns noisy
              statement text into structured signal the engine can sum.
            </LearnCard>
            <LearnCard title="The rationale" icon={<Ruler className="h-4 w-4" />}>
              Puts the computed decision into plain language for a loan officer.
              Every sentence must follow from figures the engine already produced —
              it explains the decision, it never makes one.
            </LearnCard>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Method"
          title="Three ways to run a check"
          description="Each check is run in the cheapest way that fits it. Definitive things are code; subjective things are a model acting as judge; the hardest calls are human. Most robust systems are a hybrid of all three."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {METHODS.map((m) => (
              <LearnCard key={m.key} title={m.label} icon={m.icon}>
                {m.desc}
              </LearnCard>
            ))}
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Live today"
          title="The categoriser eval, measured against an independent ground truth"
          description="The labelled set is produced by a generator that assigns each transaction its true label at creation time — before the model sees anything. The score is agreement with labels the model had no hand in writing, not the model marking its own work."
        >
          <LearnCard title="What is measured" icon={<Gauge className="h-4 w-4" />}>
            <p>
              The categoriser runs over a synthetic set drawn from eight personas
              plus fourteen hand-authored hard cases — the deliberately ambiguous
              lines where a naïve rule would slip. It is scored on overall accuracy,
              per-category precision and recall, and a full confusion matrix, with a
              deterministic offline harness that fails the build if intended outcomes
              regress.
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/eval">Open the live model eval</Link>
              </Button>
            </div>
          </LearnCard>
        </LearnSection>

        <LearnSection
          eyebrow="By design"
          title="The rationale eval — what the explanation is held to"
          description="These dimensions define the standard the rationale must meet. Compliance, groundedness and outcome-faithfulness are hard gates: a breach blocks release. The judged dimensions are advisory. This is the design the checks implement."
        >
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="hidden gap-4 border-b bg-muted/40 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[12rem_9rem_1fr]">
              <span>Dimension</span>
              <span>Method · gate</span>
              <span>What it checks</span>
            </div>
            <div className="divide-y">
              {RATIONALE_DIMENSIONS.map((d) => (
                <div
                  key={d.name}
                  className="grid gap-1.5 px-6 py-4 sm:grid-cols-[12rem_9rem_1fr] sm:items-baseline sm:gap-4"
                >
                  <span className="text-sm font-medium text-foreground">{d.name}</span>
                  <span className="flex flex-col gap-1 text-xs">
                    <span className="font-mono text-muted-foreground">{d.method}</span>
                    <span
                      className={
                        d.gate === "Informational"
                          ? "text-muted-foreground"
                          : "font-medium text-brand"
                      }
                    >
                      {d.gate}
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">{d.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Cadence"
          title="Offline before release, online after"
          description="Evaluations are not run once. They gate every release and then keep watching production."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <LearnCard title="Offline — the release gate" icon={<CircleCheck className="h-4 w-4" />}>
              Run before a release over the full labelled set. The hard gates block
              deployment on a breach; the rest is a scoreboard the team hill-climbs.
              These evals double as the specification: they state, precisely, how the
              feature is expected to behave.
            </LearnCard>
            <LearnCard title="Online — the standing watch" icon={<Repeat className="h-4 w-4" />}>
              In production a system samples real traffic, tracks latency and
              feedback, and watches for drift as the world moves under the model.
              Failures found here flow back into the labelled set, so the offline gate
              gets stricter over time. This layer is the roadmap, not yet wired here.
            </LearnCard>
          </div>
        </LearnSection>

        <LearnSection eyebrow="Honesty" title="What these numbers do and do not prove">
          <div className="rounded-2xl border border-warning/30 bg-warning-muted/40 p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-muted text-warning-foreground">
                <CircleX className="h-4.5 w-4.5" />
              </span>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Synthetic personas measure{" "}
                  <strong className="text-foreground">consistency against a known generator</strong>,
                  not absolute truth — an easier target than the genuine ambiguity of
                  real statements. A deny-list catches the obvious compliance breaches
                  but is a floor, not a ceiling; paraphrased advice is why a judge sits
                  behind it. And the offline gate proves the deterministic path and the
                  checks themselves are sound — it does not, on its own, certify the
                  live model&apos;s every answer.
                </p>
                <p className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" />
                  <span>
                    A production system would add human-reviewed labels from real data
                    with inter-rater agreement, and the online layer above. This demo
                    is explicit about which of those it does today and which it does
                    not.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </LearnSection>

        <NextPageLink
          href="/learn/affordability"
          label="Next"
          title="The affordability engine"
        />
      </div>
    </>
  );
}
