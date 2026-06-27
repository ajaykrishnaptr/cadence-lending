import type { Category } from "../categories";
import type { PersonaProfile } from "../types";

/**
 * Demo Bank's own world. Every brand here is fictional. These profiles drive an
 * INDEPENDENT rule-based generator (generator.ts) — the categoriser never sees
 * them, which keeps the evaluation non-circular.
 */

export interface RecurringSpec {
  desc: string;
  counterparty?: string;
  /** Positive magnitude in EUR; sign applied by the generator. */
  amount: number;
  /** Day of month (1–28). */
  day: number;
  category: Category;
  /** Random +/- variation applied to amount. */
  jitter?: number;
}

export interface SpendStream {
  merchants: string[];
  perMonth: number;
  avg: number;
  jitter: number;
  category: Category;
}

export interface SalarySpec {
  employer: string;
  amount: number;
  day: number;
  /** Coefficient-of-variation-ish jitter; higher = less stable. */
  jitter: number;
  /** If true, income arrives as irregular transfers (freelance). */
  irregular?: boolean;
  irregularPerMonth?: number;
}

export interface AdverseSpec {
  overdraftPerMonth?: number;
  gamblingPerMonth?: number;
  gamblingMerchants?: string[];
}

export interface SecondBankAccountSpec {
  type: "checking" | "savings";
  name: string;
  /** Savings: the shown balance. Checking: the opening balance. */
  balance: number;
  recurring?: RecurringSpec[];
  spend?: SpendStream[];
}

export interface SecondBankSpec {
  bankId: string;
  accounts: SecondBankAccountSpec[];
}

export interface ProfileSpec extends Omit<PersonaProfile, "banks"> {
  openingBalance: number;
  savingsBalance: number;
  salary: SalarySpec;
  recurring: RecurringSpec[];
  spend: SpendStream[];
  adverse?: AdverseSpec;
  /** A second ASPSP the applicant also banks with (multibanking). */
  secondBank?: SecondBankSpec;
}

const GROCERS = ["Markthalle", "FrischMarkt", "TagesGut", "Korb & Co"];
const FUEL = ["TankPoint", "VoltDrive Charging"];
const TRANSIT = ["CityTransit", "RegioBahn"];
const EATING_OUT = ["Café Ostwind", "Trattoria Lume", "Imbiss 7", "Sushi Nori"];
const SHOPPING = ["Kleiderwerk", "ElektroMarkt", "WohnReich", "BuchEck"];

export const PROFILES: ProfileSpec[] = [
  {
    id: "clara-bauer",
    name: "Clara Bauer",
    tagline: "Salaried teacher, steady finances",
    expected: "approve",
    expectedLabel: "Clean approve",
    age: 34,
    occupation: "Secondary-school teacher",
    city: "Freiburg",
    householdSize: 1,
    tenureMonths: 6,
    request: { amount: 12000, termMonths: 48, purpose: "home-improvement" },
    blurb:
      "Permanent public-sector contract, predictable salary, modest fixed costs and no existing credit. The textbook affordable applicant.",
    openingBalance: 2400,
    savingsBalance: 8600,
    salary: { employer: "Bildungsamt Freiburg", amount: 3200, day: 28, jitter: 0.01 },
    recurring: [
      { desc: "Miete Wohnung", counterparty: "Hausverwaltung Lindenhof", amount: 950, day: 1, category: "rent" },
      { desc: "Stadtwerke Nordlicht Strom", amount: 78, day: 5, category: "utilities" },
      { desc: "NetzKlar Internet", amount: 39, day: 8, category: "utilities" },
      { desc: "MobilEins Mobilfunk", amount: 25, day: 12, category: "utilities" },
      { desc: "SchildVersicherung Hausrat", amount: 18, day: 15, category: "insurance" },
      { desc: "Streamly Abo", amount: 13, day: 18, category: "subscriptions" },
      { desc: "PulsGym Mitgliedschaft", amount: 35, day: 3, category: "subscriptions" },
    ],
    spend: [
      { merchants: GROCERS, perMonth: 9, avg: 47, jitter: 0.45, category: "groceries" },
      { merchants: TRANSIT, perMonth: 2, avg: 59, jitter: 0.2, category: "transport" },
      { merchants: EATING_OUT, perMonth: 3, avg: 28, jitter: 0.5, category: "discretionary" },
    ],
    secondBank: {
      bankId: "civic-bank",
      accounts: [{ type: "savings", name: "Civic Sparen", balance: 6200 }],
    },
  },
  {
    id: "tomas-neuer",
    name: "Tomas Neuer",
    tagline: "Freelance designer, short history",
    expected: "refer",
    expectedLabel: "Thin file / refer",
    age: 27,
    occupation: "Freelance graphic designer",
    city: "Leipzig",
    householdSize: 1,
    tenureMonths: 2,
    request: { amount: 8000, termMonths: 36, purpose: "vehicle" },
    blurb:
      "Only two months of statements and irregular project income. Affordability may be fine, but there is too little history to judge stability — a referral, not an automated yes or no.",
    openingBalance: 1300,
    savingsBalance: 1500,
    salary: {
      employer: "Project clients",
      amount: 2500,
      day: 20,
      jitter: 0.4,
      irregular: true,
      irregularPerMonth: 2,
    },
    recurring: [
      { desc: "Miete Atelier & Wohnung", counterparty: "Vermietung Plagwitz", amount: 720, day: 1, category: "rent" },
      { desc: "VoltHaus Energie", amount: 52, day: 6, category: "utilities" },
      { desc: "FaserNet Internet", amount: 35, day: 9, category: "utilities" },
      { desc: "Tonika Audio Abo", amount: 11, day: 14, category: "subscriptions" },
    ],
    spend: [
      { merchants: GROCERS, perMonth: 8, avg: 38, jitter: 0.5, category: "groceries" },
      { merchants: EATING_OUT, perMonth: 4, avg: 22, jitter: 0.6, category: "discretionary" },
      { merchants: SHOPPING, perMonth: 1, avg: 65, jitter: 0.6, category: "discretionary" },
    ],
  },
  {
    id: "mara-vogel",
    name: "Mara Vogel",
    tagline: "Over-committed on existing credit",
    expected: "decline",
    expectedLabel: "Over-indebted / decline",
    age: 41,
    occupation: "Retail supervisor",
    city: "Dortmund",
    householdSize: 2,
    tenureMonths: 6,
    request: { amount: 6000, termMonths: 24, purpose: "debt-consolidation" },
    blurb:
      "A reasonable salary, but rent plus three existing credit commitments already exceed what the household can carry. Recurring overdraft use confirms the strain.",
    openingBalance: -240,
    savingsBalance: 320,
    salary: { employer: "Kaufhaus Westfalen", amount: 2600, day: 27, jitter: 0.02 },
    recurring: [
      { desc: "Miete", counterparty: "GWG Dortmund", amount: 1100, day: 1, category: "rent" },
      { desc: "KreditWerk Ratenkredit", counterparty: "KreditWerk", amount: 450, day: 4, category: "loan-repayment" },
      { desc: "RatenFlex Rate", counterparty: "RatenFlex", amount: 180, day: 10, category: "bnpl" },
      { desc: "QuickCash Rahmenkredit", counterparty: "QuickCash", amount: 120, day: 16, category: "other-credit" },
      { desc: "Stadtwerke Ruhr Strom", amount: 96, day: 6, category: "utilities" },
      { desc: "MobilEins Mobilfunk", amount: 42, day: 12, category: "utilities" },
      { desc: "Aegis Assur KFZ", amount: 64, day: 14, category: "insurance" },
    ],
    spend: [
      { merchants: GROCERS, perMonth: 11, avg: 52, jitter: 0.4, category: "groceries" },
      { merchants: FUEL, perMonth: 3, avg: 61, jitter: 0.3, category: "transport" },
    ],
    adverse: { overdraftPerMonth: 2 },
    secondBank: {
      bankId: "civic-bank",
      accounts: [
        {
          type: "checking",
          name: "Civic Girokonto",
          balance: -120,
          recurring: [
            { desc: "KreditPlus Rahmenkredit Rate", counterparty: "KreditPlus", amount: 150, day: 9, category: "other-credit" },
          ],
          spend: [{ merchants: GROCERS, perMonth: 3, avg: 41, jitter: 0.4, category: "groceries" }],
        },
      ],
    },
  },
  {
    id: "jonas-frei",
    name: "Jonas Frei",
    tagline: "High earner, large limit headroom",
    expected: "approve",
    expectedLabel: "High-income approve",
    age: 45,
    occupation: "Engineering lead",
    city: "Stuttgart",
    householdSize: 1,
    tenureMonths: 6,
    request: { amount: 25000, termMonths: 60, purpose: "major-purchase" },
    blurb:
      "Senior salary with light obligations. Comfortably affordable across the full requested amount, and a candidate for a higher limit than requested.",
    openingBalance: 9200,
    savingsBalance: 41000,
    salary: { employer: "Brückner Engineering", amount: 6800, day: 26, jitter: 0.015 },
    recurring: [
      { desc: "Miete Loft", counterparty: "City Wohnen GmbH", amount: 1500, day: 1, category: "rent" },
      { desc: "Auto Leasing Rate", counterparty: "FahrLeasing", amount: 300, day: 5, category: "loan-repayment" },
      { desc: "Stadtwerke Süd Strom", amount: 110, day: 7, category: "utilities" },
      { desc: "FaserNet Gigabit", amount: 49, day: 9, category: "utilities" },
      { desc: "Aegis Assur Kranken-Zusatz", amount: 88, day: 13, category: "insurance" },
      { desc: "Kinora Film Abo", amount: 15, day: 17, category: "subscriptions" },
      { desc: "Kraftraum Premium", amount: 69, day: 3, category: "subscriptions" },
    ],
    spend: [
      { merchants: GROCERS, perMonth: 8, avg: 64, jitter: 0.45, category: "groceries" },
      { merchants: EATING_OUT, perMonth: 6, avg: 48, jitter: 0.5, category: "discretionary" },
      { merchants: SHOPPING, perMonth: 2, avg: 140, jitter: 0.6, category: "discretionary" },
      { merchants: FUEL, perMonth: 3, avg: 78, jitter: 0.25, category: "transport" },
    ],
    secondBank: {
      bankId: "civic-bank",
      accounts: [{ type: "savings", name: "Civic Tagesgeld", balance: 38000 }],
    },
  },
  {
    id: "sofia-lindqvist",
    name: "Sofia Lindqvist",
    tagline: "Affordable but only just",
    expected: "refer",
    expectedLabel: "Borderline / refer",
    age: 31,
    occupation: "Hospitality team lead",
    city: "Hamburg",
    householdSize: 2,
    tenureMonths: 6,
    request: { amount: 9000, termMonths: 36, purpose: "major-purchase" },
    blurb:
      "Affordable on the median, but income swings month to month with shift premiums and tips, so the stability check falls short of the automated-decision threshold. Right on the line — a human should look.",
    openingBalance: 1100,
    savingsBalance: 2400,
    salary: { employer: "Hafenblick Gastro", amount: 3520, day: 28, jitter: 0.26 },
    recurring: [
      { desc: "Miete", counterparty: "Elbimmobilien", amount: 1150, day: 1, category: "rent" },
      { desc: "PayLater3 Rate", counterparty: "PayLater3", amount: 230, day: 11, category: "bnpl" },
      { desc: "Stadtwerke Hanse Strom", amount: 84, day: 6, category: "utilities" },
      { desc: "NetzKlar Internet", amount: 39, day: 9, category: "utilities" },
      { desc: "MobilEins Mobilfunk", amount: 29, day: 13, category: "utilities" },
      { desc: "SchildVersicherung Haftpflicht", amount: 14, day: 15, category: "insurance" },
      { desc: "Streamly Abo", amount: 13, day: 18, category: "subscriptions" },
    ],
    spend: [
      { merchants: GROCERS, perMonth: 10, avg: 49, jitter: 0.4, category: "groceries" },
      { merchants: TRANSIT, perMonth: 2, avg: 49, jitter: 0.2, category: "transport" },
      { merchants: EATING_OUT, perMonth: 3, avg: 26, jitter: 0.5, category: "discretionary" },
    ],
  },
  {
    id: "erik-hofer",
    name: "Erik Hofer",
    tagline: "Affordable, with a couple of flags",
    expected: "approve-conditions",
    expectedLabel: "Approve with conditions",
    age: 38,
    occupation: "Self-employed tradesman",
    city: "Nürnberg",
    householdSize: 3,
    tenureMonths: 6,
    request: { amount: 7000, termMonths: 36, purpose: "vehicle" },
    blurb:
      "Comfortably affordable on the numbers, but occasional overdraft days and a few betting transactions mean the engine attaches conditions rather than a clean yes.",
    openingBalance: 1700,
    savingsBalance: 5200,
    salary: { employer: "Hofer Handwerk", amount: 3400, day: 25, jitter: 0.05 },
    recurring: [
      { desc: "Miete Reihenhaus", counterparty: "Privat Vermieter", amount: 1050, day: 1, category: "rent" },
      { desc: "Werkzeug Finanzierung", counterparty: "HandwerkKredit", amount: 250, day: 8, category: "loan-repayment" },
      { desc: "Stadtwerke Franken Strom & Gas", amount: 142, day: 6, category: "utilities" },
      { desc: "FaserNet Internet", amount: 39, day: 10, category: "utilities" },
      { desc: "Aegis Assur Familie", amount: 96, day: 14, category: "insurance" },
      { desc: "MobilEins Family", amount: 55, day: 12, category: "utilities" },
    ],
    spend: [
      { merchants: GROCERS, perMonth: 12, avg: 58, jitter: 0.4, category: "groceries" },
      { merchants: FUEL, perMonth: 4, avg: 72, jitter: 0.3, category: "transport" },
      { merchants: EATING_OUT, perMonth: 2, avg: 31, jitter: 0.5, category: "discretionary" },
    ],
    adverse: { overdraftPerMonth: 1, gamblingPerMonth: 2, gamblingMerchants: ["LuckySpin", "BetParadies"] },
  },
  {
    id: "lena-brandt",
    name: "Lena Brandt",
    tagline: "Clean at one bank, stretched across two",
    expected: "refer",
    expectedLabel: "Refer — hidden debt at a 2nd bank",
    age: 33,
    occupation: "Marketing manager",
    city: "Köln",
    householdSize: 1,
    tenureMonths: 6,
    request: { amount: 10000, termMonths: 36, purpose: "major-purchase" },
    blurb:
      "Her Demo Bank account looks comfortably affordable — connect only that and she is a clean approve. But a recurring transfer points to a second bank carrying a personal loan and a BNPL plan. Aggregate both and her available income falls inside the affordability buffer: a referral. The case for capturing every bank an applicant uses.",
    openingBalance: 1900,
    savingsBalance: 2600,
    salary: { employer: "Rheinmedia Agentur", amount: 2600, day: 28, jitter: 0.02 },
    recurring: [
      { desc: "Miete Wohnung", counterparty: "Wohnbau Köln", amount: 800, day: 1, category: "rent" },
      { desc: "Stadtwerke Rheinlicht Strom", amount: 72, day: 6, category: "utilities" },
      { desc: "NetzKlar Internet", amount: 35, day: 9, category: "utilities" },
      { desc: "MobilEins Mobilfunk", amount: 25, day: 12, category: "utilities" },
      { desc: "Streamly Abo", amount: 13, day: 16, category: "subscriptions" },
    ],
    spend: [
      { merchants: GROCERS, perMonth: 9, avg: 46, jitter: 0.4, category: "groceries" },
      { merchants: EATING_OUT, perMonth: 3, avg: 27, jitter: 0.5, category: "discretionary" },
      { merchants: TRANSIT, perMonth: 2, avg: 49, jitter: 0.2, category: "transport" },
    ],
    secondBank: {
      bankId: "civic-bank",
      accounts: [
        {
          type: "checking",
          name: "Civic Girokonto",
          balance: 320,
          recurring: [
            { desc: "Konsumkredit Rate", counterparty: "KreditWerk", amount: 340, day: 5, category: "loan-repayment" },
            { desc: "PayLater3 Rate", counterparty: "PayLater3", amount: 150, day: 11, category: "bnpl" },
          ],
        },
      ],
    },
  },
];

export function getProfile(id: string): ProfileSpec | undefined {
  return PROFILES.find((p) => p.id === id);
}

/** Public persona metadata (no generation internals) for UI lists. */
export function listPersonas(): PersonaProfile[] {
  return PROFILES.map(
    ({ openingBalance: _o, savingsBalance: _s, salary: _sal, recurring: _r, spend: _sp, adverse: _a, secondBank, ...meta }) => ({
      ...meta,
      banks: ["demo-bank", ...(secondBank ? [secondBank.bankId] : [])],
    }),
  );
}

/** ASPSP ids a persona banks with. */
export function banksForPersona(personaId: string): string[] {
  const p = getProfile(personaId);
  if (!p) return [];
  return ["demo-bank", ...(p.secondBank ? [p.secondBank.bankId] : [])];
}
