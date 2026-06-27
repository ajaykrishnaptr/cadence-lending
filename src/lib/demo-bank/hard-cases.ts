import type { Category } from "../categories";

/**
 * Hand-authored hard / ambiguous cases for the evaluation. Each is a real
 * failure mode of statement categorisation: salary that arrives as a personal
 * transfer, BNPL dressed as a subscription, rent paid to a private landlord
 * without the word "Miete". The rules baseline misses several of these on
 * purpose — the eval shows that honestly rather than hiding it. The `truth`
 * here is the considered human label, which is itself the limitation we own:
 * synthetic labels measure consistency, not absolute ground truth.
 */
export interface HardCase {
  id: string;
  description: string;
  counterparty?: string;
  amount: number;
  bookingDate: string;
  truth: Category;
  note: string;
}

export const HARD_CASES: HardCase[] = [
  {
    id: "hard-01",
    description: "Überweisung M. Schmidt Privat",
    counterparty: "M. Schmidt",
    amount: 2350,
    bookingDate: "2026-06-02",
    truth: "salary",
    note: "Irregular salary paid as a personal transfer — no 'Gehalt' keyword to anchor on.",
  },
  {
    id: "hard-02",
    description: "SplitPay Abo-Rate Mai",
    counterparty: "SplitPay",
    amount: -42,
    bookingDate: "2026-06-04",
    truth: "bnpl",
    note: "A BNPL instalment that calls itself an 'Abo' — reads like a subscription.",
  },
  {
    id: "hard-03",
    description: "Übertrag Rückzahlung an Familie",
    amount: -250,
    bookingDate: "2026-06-05",
    truth: "loan-repayment",
    note: "An informal loan repaid to a family member — looks like an ordinary transfer.",
  },
  {
    id: "hard-04",
    description: "Lohn/Gehalt Kontor und Co",
    counterparty: "Kontor und Co",
    amount: 3100,
    bookingDate: "2026-06-01",
    truth: "salary",
    note: "Clear salary — included to confirm the baseline still nails the easy ones.",
  },
  {
    id: "hard-05",
    description: "Freizeitwelt Entertainment Card",
    counterparty: "Freizeitwelt",
    amount: -60,
    bookingDate: "2026-06-08",
    truth: "gambling",
    note: "Gambling top-up behind a generic 'entertainment' merchant name.",
  },
  {
    id: "hard-06",
    description: "Monatsbeitrag Mitgliedschaft Rechtsschutz",
    counterparty: "Rechtsschutz Verein",
    amount: -19,
    bookingDate: "2026-06-15",
    truth: "insurance",
    note: "Legal-protection insurance billed as a 'membership' — overlaps with subscriptions.",
  },
  {
    id: "hard-07",
    description: "Dauerauftrag Wohnung Vermietung Sieglinde",
    counterparty: "Vermietung Sieglinde",
    amount: -870,
    bookingDate: "2026-06-01",
    truth: "rent",
    note: "Rent to a private landlord via standing order, without the word 'Miete'.",
  },
  {
    id: "hard-08",
    description: "Stadtwerke Abschlag Strom",
    counterparty: "Stadtwerke",
    amount: -88,
    bookingDate: "2026-06-06",
    truth: "utilities",
    note: "Straightforward utilities — a control case the baseline should get right.",
  },
  {
    id: "hard-09",
    description: "Übertrag eigenes Sparkonto",
    counterparty: "Sparkonto",
    amount: -300,
    bookingDate: "2026-06-29",
    truth: "transfer",
    note: "Genuine internal savings move — must NOT be read as an obligation.",
  },
  {
    id: "hard-10",
    description: "Markthalle Bistro Mittagstisch",
    counterparty: "Markthalle Bistro",
    amount: -16,
    bookingDate: "2026-06-11",
    truth: "discretionary",
    note: "A café inside a supermarket brand — eating out, not groceries.",
  },
  {
    id: "hard-11",
    description: "Honorar Projektarbeit Webdesign",
    counterparty: "Designauftrag",
    amount: 750,
    bookingDate: "2026-06-09",
    truth: "salary",
    note: "Freelance income — correctly income, but easy to mistake for a transfer.",
  },
  {
    id: "hard-12",
    description: "RatenFlex Monatsrate",
    counterparty: "RatenFlex",
    amount: -55,
    bookingDate: "2026-06-10",
    truth: "bnpl",
    note: "A clearly-named BNPL instalment — a control case.",
  },
  {
    id: "hard-13",
    description: "Kontoführungsgebühr Quartal",
    amount: -12,
    bookingDate: "2026-06-30",
    truth: "fees",
    note: "Account-keeping fee — should land as fees, not 'other'.",
  },
  {
    id: "hard-14",
    description: "Gutschrift Rückerstattung Kaution",
    counterparty: "Hausverwaltung",
    amount: 900,
    bookingDate: "2026-06-03",
    truth: "transfer",
    note: "A returned rental deposit — a credit, but NOT income.",
  },
];
