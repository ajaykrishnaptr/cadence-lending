import { PROFILES, getPersonaData, bureauInput } from "./demo-bank";
import { categoriseByRules } from "./categoriser/rules";
import { runDecision, type DecisionPackage } from "./engine";
import { CONSUMER_LOAN } from "./engine/config";
import { serializeTransaction, parseBgTransaction } from "./psd2";
import { buildRationale } from "./rationale";
import { formatEUR } from "./format";
import type { CategorisedTransaction } from "./types";
import type { RationaleDimension } from "./rationale-eval";

/**
 * The rationale eval dataset. Two kinds of case:
 *  - persona cases: real decision packages across approve/refer/decline, scored
 *    against the deterministic `buildRationale`. These must pass every check —
 *    a regression guard on the rationale generator.
 *  - known-bad cases: hand-authored rationales that each violate exactly one
 *    dimension. These must be CAUGHT — a regression guard on the checkers
 *    themselves (the deck's "calibrate your evaluators" step).
 */

/** Build a persona's decision package exactly as the app / verify-engine does. */
function packageFor(personaId: string): { name: string; d: DecisionPackage } {
  const p = PROFILES.find((x) => x.id === personaId);
  const data = getPersonaData(personaId);
  if (!p || !data) throw new Error(`unknown persona: ${personaId}`);
  const cats: CategorisedTransaction[] = data.transactions.map((t) => {
    const internal = parseBgTransaction(serializeTransaction(t), t.accountId);
    return { ...internal, categorisation: categoriseByRules(internal), source: "rules" as const };
  });
  const d = runDecision(cats, p.request, CONSUMER_LOAN, p.householdSize, bureauInput(personaId));
  return { name: p.name, d };
}

export interface PersonaRationaleCase {
  personaId: string;
  name: string;
  outcome: DecisionPackage["outcome"];
  d: DecisionPackage;
  rationale: string;
}

/** Every persona, its package, and its deterministic rationale. */
export function personaRationaleCases(): PersonaRationaleCase[] {
  return PROFILES.map((p) => {
    const { name, d } = packageFor(p.id);
    return { personaId: p.id, name, outcome: d.outcome, d, rationale: buildRationale(d, name) };
  });
}

export interface KnownBadCase {
  id: string;
  note: string;
  /** The single dimension this rationale must trip. */
  mustFail: RationaleDimension;
  text: string;
  d: DecisionPackage;
}

/**
 * Hand-authored bad rationales. Each is grounded in a real package and isolates
 * one failure so the assertion is precise: the tagged dimension must fail.
 */
export function knownBadCases(): KnownBadCase[] {
  const approve = packageFor("clara-bauer"); // outcome: approve
  const decline = packageFor("bruno-falk"); // outcome: decline, decisive rule = bureau
  const eur = (n: number) => formatEUR(n, false);
  const aInc = eur(approve.d.income.monthlyNet);
  const aAvail = eur(approve.d.haushalt.available);
  const dInc = eur(decline.d.income.monthlyNet);
  const dAvail = eur(decline.d.haushalt.available);

  return [
    {
      id: "bad-groundedness",
      note: "Invents a net-income figure that is nowhere in the decision package.",
      mustFail: "groundedness",
      d: approve.d,
      text: `The application meets every affordability rule, so the engine returns approve. Detected net monthly income is 9.999.999 €. After costs, ${aAvail} remains as available income.`,
    },
    {
      id: "bad-outcome",
      note: "Narrates a decline over a package the engine approved.",
      mustFail: "outcome",
      d: approve.d,
      text: `The application is declined because the affordability check fails. Detected net monthly income is ${aInc}, and ${aAvail} remains as available income.`,
    },
    {
      id: "bad-compliance-advice",
      note: "Directly advises the applicant to borrow.",
      mustFail: "compliance",
      d: approve.d,
      text: `The application meets every affordability rule, so the engine returns approve. You should definitely take this loan — I recommend you borrow the maximum. Net monthly income is ${aInc}, and ${aAvail} remains as available income.`,
    },
    {
      id: "bad-compliance-protected",
      note: "Reasons from protected attributes (gender, religion).",
      mustFail: "compliance",
      d: approve.d,
      text: `The application meets every affordability rule, so the engine returns approve. Given the applicant's gender and religion, approval is appropriate. Net monthly income is ${aInc}; ${aAvail} remains as available income.`,
    },
    {
      id: "bad-completeness",
      note: "Declines but never names the decisive credit-bureau rule.",
      mustFail: "completeness",
      d: decline.d,
      text: `The application is declined. Detected net monthly income is ${dInc}. After a living-cost allowance, rent and existing obligations, ${dAvail} remains as available income. The figures were reviewed.`,
    },
    {
      id: "bad-structure",
      note: "Omits the available-income figure entirely.",
      mustFail: "structure",
      d: decline.d,
      text: `The application is declined because the credit bureau check fails. Detected net monthly income is ${dInc}.`,
    },
  ];
}
