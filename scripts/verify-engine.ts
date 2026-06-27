/**
 * Dev sanity check: generate each persona, categorise with the rules baseline,
 * run the decision engine, and confirm outcomes match the intended demo design.
 *   npx tsx scripts/verify-engine.ts
 */
import { PROFILES, getPersonaData, bureauInput } from "../src/lib/demo-bank";
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
  "lena-brandt": "refer",
  "bruno-falk": "decline",
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
  const d = runDecision(cats, p.request, CONSUMER_LOAN, p.householdSize, bureauInput(p.id));
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

// Multibanking teaching case: Lena approves on one bank, refers on two.
const lenaP = PROFILES.find((p) => p.id === "lena-brandt")!;
const lenaData = getPersonaData("lena-brandt")!;
const catOf = (txns: typeof lenaData.transactions): CategorisedTransaction[] =>
  txns.map((t) => {
    const internal = parseBgTransaction(serializeTransaction(t), t.accountId);
    return { ...internal, categorisation: categoriseByRules(internal), source: "rules" as const };
  });
const demoOnly = runDecision(catOf(lenaData.transactions.filter((t) => !t.accountId.includes("civic-bank"))), lenaP.request, CONSUMER_LOAN, lenaP.householdSize);
const both = runDecision(catOf(lenaData.transactions), lenaP.request, CONSUMER_LOAN, lenaP.householdSize);
console.log(`\nMultibanking case — Lena Brandt (request €${lenaP.request.amount}/${lenaP.request.termMonths}mo):`);
console.log(`  Demo Bank only -> ${demoOnly.outcomeLabel.padEnd(22)} avail €${demoOnly.haushalt.available}  oblig €${demoOnly.obligations.totalMonthly}  dti ${(demoOnly.dti * 100).toFixed(0)}%`);
console.log(`  Both banks     -> ${both.outcomeLabel.padEnd(22)} avail €${both.haushalt.available}  oblig €${both.obligations.totalMonthly}  dti ${(both.dti * 100).toFixed(0)}%`);
const flips = demoOnly.outcome === "approve" && both.outcome === "refer";
console.log(flips ? "  ✓ connecting the 2nd bank flips approve -> refer" : "  ✗ expected approve -> refer");

// Bureau knock-out teaching case: Bruno approves on affordability, declines once
// the credit-bureau hard negative is applied.
const brunoP = PROFILES.find((p) => p.id === "bruno-falk")!;
const brunoCats = catOf(getPersonaData("bruno-falk")!.transactions);
const brunoNoBureau = runDecision(brunoCats, brunoP.request, CONSUMER_LOAN, brunoP.householdSize);
const brunoWithBureau = runDecision(brunoCats, brunoP.request, CONSUMER_LOAN, brunoP.householdSize, bureauInput("bruno-falk"));
console.log(`\nBureau case — Bruno Falk (request €${brunoP.request.amount}/${brunoP.request.termMonths}mo):`);
console.log(`  Affordability only -> ${brunoNoBureau.outcomeLabel.padEnd(22)} avail €${brunoNoBureau.haushalt.available}`);
console.log(`  With bureau        -> ${brunoWithBureau.outcomeLabel.padEnd(22)} (score ${bureauInput("bruno-falk").score}, hard negative ${bureauInput("bruno-falk").hardNegative})`);
const bureauFlips = brunoNoBureau.outcome === "approve" && brunoWithBureau.outcome === "decline";
console.log(bureauFlips ? "  ✓ the bureau hard negative flips approve -> decline" : "  ✗ expected approve -> decline");

if (pass !== PROFILES.length || !flips || !bureauFlips) process.exit(1);
