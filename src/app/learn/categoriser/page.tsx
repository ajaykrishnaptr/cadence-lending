import Link from "next/link";
import {
  Tags,
  ShieldAlert,
  FlaskConical,
  Braces,
  CircleCheck,
  CircleX,
} from "lucide-react";
import {
  LearnHeader,
  LearnSection,
  LearnCard,
  NextPageLink,
} from "@/components/learn/learn-ui";
import { CategoryBadge } from "@/components/brand/badges";
import { Button } from "@/components/ui/button";
import { CATEGORY_LIST } from "@/lib/categories";

export const metadata = {
  title: "The categoriser & evaluation · Learn · Cadence",
};

const SCHEMA_FIELDS = [
  { name: "category", type: "enum (16)", desc: "One of the sixteen taxonomy labels." },
  { name: "subcategory", type: "string", desc: "Free-form refinement of the category." },
  { name: "confidence", type: "number 0–1", desc: "The model's self-reported certainty." },
  { name: "isIncome", type: "boolean", desc: "Whether the line is incoming funds." },
  { name: "isRecurring", type: "boolean", desc: "Whether it repeats on a regular cadence." },
  { name: "isObligation", type: "boolean", desc: "Whether it is a contractual debt." },
];

export default function LearnCategoriserPage() {
  return (
    <>
      <LearnHeader
        eyebrow="Learn"
        title="The categoriser & how it is evaluated"
        intro="A language model reads the statement and labels what each transaction is. It produces structured categories and grounded rationale — it never produces the lending decision. Its quality is then measured against an independent labelled set."
      />

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 sm:px-6 lg:py-16">
        <LearnSection
          eyebrow="Scope"
          title="What the model does, and what it does not"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <LearnCard title="It categorises and explains" icon={<Tags className="h-4 w-4" />}>
              The model maps each raw transaction — a counterparty, an amount, a date,
              a terse reference string — to a category and a short rationale grounded
              in that line&apos;s own evidence. Recurrence and obligation flags turn noisy
              text into structured signal the affordability engine can sum.
            </LearnCard>
            <LearnCard title="It never decides" icon={<ShieldAlert className="h-4 w-4" />}>
              The model has no view on approve, refer or decline. Those follow from
              deterministic rules over the categorised totals. Confining the model to
              perception keeps the decision auditable and keeps model error contained
              to a single, measurable stage.
            </LearnCard>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Taxonomy"
          title="Sixteen categories"
          description="Every transaction resolves to exactly one of these. The same fixed taxonomy is shared by the data generator's ground-truth labels and the model's output, which makes the two directly comparable."
        >
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_LIST.map((c) => (
                <CategoryBadge key={c.key} category={c.key} />
              ))}
            </div>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Contract"
          title="A validated output schema"
          description="The model is constrained to a typed schema, validated on the way out. A response that does not parse is rejected rather than trusted, so malformed or hallucinated structure never reaches the engine."
        >
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-center gap-2.5 border-b bg-muted/40 px-6 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                <Braces className="h-4 w-4" />
              </span>
              <span className="font-mono text-sm font-medium">
                CategorisationResult
              </span>
            </div>
            <div className="divide-y">
              {SCHEMA_FIELDS.map((f) => (
                <div
                  key={f.name}
                  className="grid gap-1 px-6 py-3.5 sm:grid-cols-[10rem_8rem_1fr] sm:items-baseline sm:gap-4"
                >
                  <span className="font-mono text-sm text-brand">{f.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {f.type}
                  </span>
                  <span className="text-sm text-muted-foreground">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </LearnSection>

        <LearnSection
          eyebrow="Evaluation"
          title="Measured against an independent ground truth"
          description="The categoriser is run over a labelled synthetic set and scored on accuracy, per-category precision and recall, and a confusion matrix."
        >
          <LearnCard title="Why the measurement is non-circular" icon={<FlaskConical className="h-4 w-4" />}>
            <p>
              The labelled set is produced by a generator that assigns each
              transaction its true category at creation time — before the model sees
              anything. Ground truth therefore comes from a source entirely
              independent of the categoriser. The model is graded against labels it
              had no hand in writing, so a high score reflects agreement with the
              generator rather than the model marking its own work.
            </p>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/eval">Open the model eval</Link>
              </Button>
            </div>
          </LearnCard>
        </LearnSection>

        <LearnSection
          eyebrow="Honesty"
          title="The limitation, owned plainly"
        >
          <div className="rounded-2xl border border-warning/30 bg-warning-muted/40 p-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning-muted text-warning-foreground">
                <CircleX className="h-4.5 w-4.5" />
              </span>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Synthetic labels measure <strong className="text-foreground">consistency against a known generator</strong>,
                  not absolute truth. A model that perfectly matches the generator
                  has learned to agree with the generator&apos;s conventions — which is a
                  far easier target than the genuine ambiguity of real statements,
                  where an ambiguous transfer or an unlabelled standing order has no
                  single objectively correct answer.
                </p>
                <p className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-foreground" />
                  <span>
                    A production system would be evaluated on human-reviewed labels
                    drawn from real data, with inter-rater agreement reported so the
                    irreducible disagreement between expert annotators is visible
                    alongside the model&apos;s score. This demo is explicit that it
                    measures the former, not the latter.
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
