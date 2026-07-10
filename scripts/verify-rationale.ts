/**
 * Rationale eval gate. Deterministic and key-free by default:
 *   npx tsx scripts/verify-rationale.ts   (or: npm run verify:rationale)
 *
 * Asserts, on every run:
 *   1. every persona's deterministic buildRationale passes all five programmatic
 *      checks — a regression guard on the rationale generator; and
 *   2. every hand-authored known-bad rationale is CAUGHT by the dimension it was
 *      built to trip — a regression guard on the checkers themselves.
 * Exits non-zero on any breach.
 *
 * The LLM-as-judge (relevance/balance/tone) runs only when GROQ_API_KEY or
 * GEMINI_API_KEY is present, and is informational — never part of the gate.
 */
import {
  runChecks,
  RATIONALE_CRITERIA,
  type RationaleDimension,
} from "../src/lib/rationale-eval";
import {
  personaRationaleCases,
  knownBadCases,
} from "../src/lib/rationale-eval-cases";

const DIMS: RationaleDimension[] = [
  "groundedness",
  "outcome",
  "compliance",
  "completeness",
  "structure",
];

async function main() {
  let fail = 0;

  console.log("Deciding metrics (evals as the spec):");
  for (const c of RATIONALE_CRITERIA) {
    console.log(`  ${c.dimension.padEnd(13)} ${c.method.padEnd(10)} ${c.gate.padEnd(13)} ${c.what}`);
  }

  // 1. persona cases — deterministic rationale must pass every check.
  const personas = personaRationaleCases();
  console.log("\nPersona cases — deterministic rationale must pass all checks:\n");
  const perDim: Record<string, { pass: number; total: number }> = {};
  for (const d of DIMS) perDim[d] = { pass: 0, total: 0 };

  for (const c of personas) {
    const checks = runChecks(c.rationale, c.d);
    const ok = checks.every((x) => x.pass);
    if (!ok) fail++;
    for (const ch of checks) {
      perDim[ch.dimension].total++;
      if (ch.pass) perDim[ch.dimension].pass++;
    }
    console.log(`  ${ok ? "✓" : "✗"} ${c.name.padEnd(16)} ${c.outcome}`);
    for (const ch of checks) if (!ch.pass) console.log(`        ✗ ${ch.dimension}: ${ch.detail}`);
  }

  console.log("\nPer-dimension pass rate (personas):");
  for (const d of DIMS) console.log(`  ${d.padEnd(14)} ${perDim[d].pass}/${perDim[d].total}`);

  // 2. known-bad cases — the tagged dimension must be caught.
  const bad = knownBadCases();
  console.log("\nKnown-bad cases — the tagged dimension must be caught:\n");
  let caught = 0;
  for (const b of bad) {
    const checks = runChecks(b.text, b.d);
    const target = checks.find((x) => x.dimension === b.mustFail);
    const ok = Boolean(target && !target.pass);
    if (ok) caught++;
    else fail++;
    console.log(`  ${ok ? "✓" : "✗"} ${b.id.padEnd(26)} must fail ${b.mustFail}${ok ? "" : "  — NOT CAUGHT"}`);
  }
  console.log(`\n${caught}/${bad.length} known-bad cases caught.`);

  // 3. optional LLM-as-judge — informational, never gates.
  if (process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY) {
    try {
      const { judgeRationale } = await import("../src/lib/llm");
      console.log("\nLLM-as-judge (informational) — sampling 3 personas:");
      for (const c of personas.slice(0, 3)) {
        const s = await judgeRationale(c.rationale, c.d);
        console.log(
          s
            ? `  ${c.name.padEnd(16)} rel ${s.relevance} · bal ${s.balance} · tone ${s.tone} · ${s.pass ? "pass" : "FLAG"} — ${s.remark}`
            : `  ${c.name.padEnd(16)} judge unavailable`,
        );
      }
    } catch (e) {
      console.log("  judge skipped:", e instanceof Error ? e.message : String(e));
    }
  } else {
    console.log("\nLLM-as-judge: skipped (no GROQ_API_KEY / GEMINI_API_KEY) — deterministic checks are the gate.");
  }

  console.log(fail === 0 ? "\n✓ rationale eval green" : `\n✗ ${fail} rationale eval failure(s)`);
  if (fail) process.exit(1);
}

main();
