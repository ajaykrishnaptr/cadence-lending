/**
 * Dev sanity check: generate each persona, categorise with the rules baseline,
 * run the decision engine, and confirm outcomes match the intended demo design.
 *   npx tsx scripts/verify-engine.ts
 */
import { PROFILES, getPersonaData } from "../src/lib/demo-bank";
import { categoriseByRules } from "../src/lib/categoriser/rules";
import { runDecision } from "../src/lib/engine";
import { CONSUMER_LOAN } from "../src/lib/engine/config";
import { serializeTransaction, parseBgTransaction } from "../src/lib/psd2";
import type { CategorisedTransaction } from "../src/lib/types";

const EXPECT: Record<string, string> = {
  "clara-bauer": "approve",
  "tomas-neuer": "refer",
  "mara-vogel": "decline",
  "jonas-frei": "approve",
  "sofia-lindqvist": "refer",
  "erik-hofer": "approve",
};

let pass = 0;
for (const p of PROFILES) {
  const data = getPersonaData(p.id)!;
  // Round-trip every line through the Berlin Group wire format, exactly as the
  // live app does (Demo Bank serialises → AIS adapter parses), then decide.
  const cats: CategorisedTransaction[] = data.transactions.map((t) => {
    const bg = serializeTransaction(t);
    const internal = parseBgTransaction(bg, t.accountId);
    return {
      ...internal,
      categorisation: categoriseByRules(internal),
      source: "rules" as const,
    };
  });
  const d = runDecision(cats, p.request, CONSUMER_LOAN, p.householdSize);
  const ok = d.outcome === EXPECT[p.id];
  if (ok) pass++;
  console.log(
    `${ok ? "✓" : "✗"} ${p.name.padEnd(16)} → ${d.outcomeLabel.padEnd(22)} (want ${EXPECT[p.id]})`,
  );
  console.log(
    `    income €${d.income.monthlyNet}  rent €${d.haushalt.rent}  oblig €${d.obligations.totalMonthly}  ` +
      `avail €${d.haushalt.available}  instal €${d.instalment}  dti ${(d.dti * 100).toFixed(1)}%  ` +
      `stab ${(d.income.stability * 100).toFixed(0)}%  tenure ${d.income.tenureMonths}mo  txns ${cats.length}`,
  );
  console.log(
    `    rules: ${d.rules.map((r) => `${r.id}:${r.status}`).join("  ")}` +
      (d.conditions.length ? `  | conditions: ${d.conditions.length}` : ""),
  );
}
console.log(`\n${pass}/${PROFILES.length} outcomes match intended design.`);
if (pass !== PROFILES.length) process.exit(1);
