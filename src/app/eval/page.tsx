import { PublicHeader } from "@/components/layout/public-header";
import { EvalReport } from "@/components/eval/eval-report";
import { baselineEval, toEvalView } from "@/lib/eval";
import { CATEGORISER_SYSTEM, CATEGORISER_FEWSHOT, CATEGORISER_SCHEMA_TS } from "@/lib/categoriser/prompt";

export const metadata = { title: "Model evaluation — Cadence" };

export default function EvalPage() {
  const view = toEvalView(baselineEval());
  const llmConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-6">
          <span className="text-xs font-medium uppercase tracking-wide text-brand">Model evaluation</span>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">How good is the categoriser?</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The categoriser is run over a labelled synthetic set. Ground truth comes from the Demo Bank generator and a
            hand-authored hard-case set — independent of the model, so the score is not circular. Results below are the
            deterministic baseline; run the live Gemini path to compare.
          </p>
        </div>
        <EvalReport
          initial={view}
          prompt={CATEGORISER_SYSTEM}
          fewshot={CATEGORISER_FEWSHOT}
          schema={CATEGORISER_SCHEMA_TS}
          llmConfigured={llmConfigured}
        />
      </main>
    </div>
  );
}
