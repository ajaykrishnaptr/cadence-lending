"use client";

import { useState, useTransition } from "react";
import { Play, AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { EvalView } from "@/lib/eval";
import { CATEGORY_META, categoryLabel } from "@/lib/categories";
import { runLiveEvalAction } from "@/lib/actions";
import { ScoreRing } from "@/components/brand/score-ring";
import { Stat } from "@/components/brand/stat";
import { CategoryBadge } from "@/components/brand/badges";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function EvalReport({
  initial,
  prompt,
  fewshot,
  schema,
  llmConfigured,
}: {
  initial: EvalView;
  prompt: string;
  fewshot: string;
  schema: string;
  llmConfigured: boolean;
}) {
  const [view, setView] = useState(initial);
  const [source, setSource] = useState<"rules" | "gemini">("rules");
  const [modelLabel, setModelLabel] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function runLive() {
    start(async () => {
      const res = await runLiveEvalAction();
      setView(res.view);
      setSource(res.source);
      setModelLabel(res.model ?? null);
      if (res.fellBack || res.source === "rules") {
        const rateLimited = /quota|rate.?limit|429|resource.?exhausted/i.test(res.error ?? "");
        const description = !llmConfigured
          ? "No GEMINI_API_KEY configured — showing the deterministic baseline."
          : rateLimited
            ? "Gemini rate limit reached (the free tier allows only a few requests per minute). Showing the deterministic baseline — try again in a minute."
            : `The live model call failed${res.error ? ` (${res.error.slice(0, 120)})` : ""}. Showing the deterministic baseline.`;
        toast.warning("Ran the rules baseline", { description });
      } else {
        const c = res.cache;
        const who = res.model ?? "The live model";
        const cacheNote = c ? (c.misses === 0 ? " (all from cache — no model calls)" : ` (${c.hits} cached, ${c.misses} live)`) : "";
        const desc = res.sampled
          ? `${who} scored a ${res.view.total}-transaction sample of ${res.totalAvailable} labelled lines${cacheNote}.`
          : `${who} categorised ${res.view.total} labelled transactions${cacheNote}.`;
        toast.success("Live evaluation complete", { description: desc });
      }
    });
  }

  const hardMisses = view.misclassified.filter((m) => m.isHard);

  return (
    <div className="space-y-6">
      {/* Controls + headline */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <ScoreRing value={view.accuracy} size={84} tone="brand" sublabel="accuracy" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-semibold">Categoriser accuracy</h2>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", source === "gemini" ? "bg-brand-muted text-brand ring-brand/25" : "bg-muted text-muted-foreground ring-border")}>
                {source === "gemini" ? (modelLabel ?? "Live model") : "Rules baseline"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {view.correct} / {view.total} labelled transactions correct across {view.labels.length} categories.
            </p>
          </div>
        </div>
        <Button onClick={runLive} disabled={pending} size="lg">
          {pending ? <><Sparkles className="h-4 w-4 animate-pulse" /> Running…</> : <><Play className="h-4 w-4" /> Run evaluation (live model)</>}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Overall accuracy" value={`${(view.accuracy * 100).toFixed(1)}%`} tone="brand" />
        <Stat label="Labelled lines" value={view.total} hint="generator + hard cases" />
        <Stat label="Hard-case accuracy" value={`${(view.hardAccuracy * 100).toFixed(0)}%`} hint={`${view.hardCorrect}/${view.hardTotal} ambiguous`} tone="warning" />
        <Stat label="Categories" value={view.labels.length} hint="of 16 in the taxonomy" />
      </div>

      {/* Per-category metrics */}
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-heading text-sm font-semibold">Per-category precision &amp; recall</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 text-right font-medium">Support</th>
                <th className="px-2 py-2 text-right font-medium">Precision</th>
                <th className="px-2 py-2 text-right font-medium">Recall</th>
                <th className="px-2 py-2 text-right font-medium">F1</th>
              </tr>
            </thead>
            <tbody>
              {view.perCategory.filter((m) => m.support > 0).map((m) => (
                <tr key={m.category} className="border-b last:border-0">
                  <td className="px-2 py-2"><CategoryBadge category={m.category} /></td>
                  <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{m.support}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{pct(m.precision)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{pct(m.recall)}</td>
                  <td className="px-2 py-2 text-right"><MetricBar value={m.f1} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confusion matrix */}
      <ConfusionMatrix view={view} />

      {/* Hard-case panel */}
      <div className="rounded-2xl border border-warning/30 bg-warning-muted/30 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="font-heading text-sm font-semibold">Hard cases, shown failing honestly</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Hand-authored ambiguous transactions where categorisation is genuinely hard. {hardMisses.length} of {view.hardTotal} are misclassified by the current path — we show them rather than hide them.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {hardMisses.map((m) => (
            <div key={m.id} className="rounded-xl border bg-card p-3">
              <div className="text-sm font-medium">{m.description}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">truth</span>
                <CategoryBadge category={m.truth} withDot={false} />
                <span className="text-muted-foreground">→ predicted</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-muted px-2 py-0.5 text-xs font-medium text-danger-foreground ring-1 ring-inset ring-danger/30">
                  {categoryLabel(m.predicted)}
                </span>
              </div>
              {m.note && <p className="mt-2 text-xs text-muted-foreground">{m.note}</p>}
            </div>
          ))}
          {hardMisses.length === 0 && <p className="text-sm text-muted-foreground">No hard-case misclassifications in this run.</p>}
        </div>
      </div>

      {/* Prompt + schema */}
      <Collapsible className="rounded-2xl border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between p-5 text-left">
          <div>
            <h3 className="font-heading text-sm font-semibold">The prompt &amp; schema</h3>
            <p className="text-xs text-muted-foreground">Exactly what the model is asked, and the Zod schema it must satisfy.</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t p-5">
            <Code title="System prompt">{prompt}</Code>
            <Code title="Few-shot examples">{fewshot}</Code>
            <Code title="Output schema (per transaction)">{schema}</Code>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Owned limitation */}
      <div className="rounded-2xl border bg-muted/30 p-5">
        <h3 className="font-heading text-sm font-semibold">The limitation we own</h3>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Ground-truth labels here come from the Demo Bank generator and a hand-authored hard-case set — they are
          independent of the categoriser, which keeps the score from being circular, but they measure
          <span className="font-medium text-foreground"> consistency against a known synthetic standard, not absolute truth</span>.
          A real evaluation needs human-reviewed labels with measured inter-rater agreement, a representative sample of
          live data, and per-category cost weighting (mislabelling a loan repayment matters more than a café). The number
          on this page is a development signal, not a production claim.
        </p>
      </div>
    </div>
  );
}

function pct(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

function MetricBar({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span className={cn("block h-full rounded-full", value >= 0.8 ? "bg-success" : value >= 0.5 ? "bg-warning" : "bg-danger")} style={{ width: `${value * 100}%` }} />
      </span>
      <span className="w-9 text-right tabular-nums">{pct(value)}</span>
    </span>
  );
}

function ConfusionMatrix({ view }: { view: EvalView }) {
  const labels = view.labels;
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="font-heading text-sm font-semibold">Confusion matrix</h3>
      <p className="mt-1 text-xs text-muted-foreground">Rows = true category, columns = predicted. The diagonal is correct.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="border-separate border-spacing-0.5 text-[10px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card p-1" />
              {labels.map((c) => (
                <th key={c} className="p-1">
                  <span className={cn("inline-block h-2 w-2 rounded-full", CATEGORY_META[c].dot)} title={categoryLabel(c)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((row) => {
              const rowTotal = labels.reduce((s, col) => s + view.confusion[row][col], 0);
              return (
                <tr key={row}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-card pr-2 text-right text-[10px] text-muted-foreground">{categoryLabel(row)}</td>
                  {labels.map((col) => {
                    const v = view.confusion[row][col];
                    const intensity = rowTotal ? v / rowTotal : 0;
                    const correct = row === col;
                    return (
                      <td key={col} className="p-0">
                        <div
                          className={cn("flex h-6 w-6 items-center justify-center rounded tabular-nums", v === 0 && "text-transparent")}
                          style={{
                            background: v === 0 ? "var(--muted)" : correct
                              ? `color-mix(in oklch, var(--success) ${20 + intensity * 70}%, transparent)`
                              : `color-mix(in oklch, var(--danger) ${25 + intensity * 65}%, transparent)`,
                          }}
                          title={`${categoryLabel(row)} → ${categoryLabel(col)}: ${v}`}
                        >
                          {v || ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Code({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</div>
      <pre className="overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">{children}</pre>
    </div>
  );
}
