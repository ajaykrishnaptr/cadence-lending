import { CATEGORY_META, type Category } from "../categories";
import type { Account, GroundTruth, Transaction } from "../types";
import { getProfile, type ProfileSpec } from "./personas";

/**
 * Independent, deterministic, rule-based generator. Given a persona profile it
 * emits ~6 months of statement lines, each carrying a ground-truth label
 * assigned by THIS generator's logic — never by the categoriser. That
 * independence is what keeps the evaluation honest rather than circular.
 */

export interface SeededTransaction extends Transaction {
  truth: GroundTruth;
  /** Running account balance after this line, for charts. */
  balance: number;
}

export interface PersonaData {
  accounts: Account[];
  transactions: SeededTransaction[];
}

/** Anchor: statements run back from here (the demo's "today" is 2026-06-26). */
const ANCHOR_YEAR = 2026;
const ANCHOR_MONTH = 6; // June
const LATEST_MONTH_CUTOFF_DAY = 20; // current month is only part-way through

// ---- deterministic PRNG (seeded per persona; no Math.random) ----
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface MonthRef {
  year: number;
  month: number;
  latest: boolean;
}

function monthSequence(tenure: number): MonthRef[] {
  const out: MonthRef[] = [];
  for (let i = tenure - 1; i >= 0; i--) {
    let m = ANCHOR_MONTH - i;
    let y = ANCHOR_YEAR;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    out.push({ year: y, month: m, latest: i === 0 });
  }
  return out;
}

function truthFor(category: Category, overrides?: Partial<GroundTruth>): GroundTruth {
  const meta = CATEGORY_META[category];
  return {
    category,
    isIncome: meta.isIncome,
    isRecurring: false,
    isObligation: meta.isObligation,
    ...overrides,
  };
}

export function generatePersonaData(profile: ProfileSpec): PersonaData {
  const rand = mulberry32(hashStr(profile.id));
  const range = (a: number, b: number) => a + rand() * (b - a);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const jit = (base: number, j: number) => base * (1 + (rand() * 2 - 1) * j);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const checkingId = `${profile.id}-chk`;
  const savingsId = `${profile.id}-sav`;

  type Pending = Omit<SeededTransaction, "balance">;
  const pending: Pending[] = [];
  let seq = 0;
  const add = (
    t: Omit<Pending, "id" | "accountId" | "currency" | "direction">,
  ) => {
    pending.push({
      id: `${profile.id}-${String(seq++).padStart(3, "0")}`,
      accountId: checkingId,
      currency: "EUR",
      direction: t.amount >= 0 ? "credit" : "debit",
      ...t,
    });
  };

  const months = monthSequence(profile.tenureMonths);

  for (const mr of months) {
    const dim = daysInMonth(mr.year, mr.month);
    const cutoff = mr.latest ? LATEST_MONTH_CUTOFF_DAY : dim;
    const clampDay = (d: number) => Math.min(d, dim);

    // --- income ---
    const s = profile.salary;
    if (s.irregular) {
      const n = s.irregularPerMonth ?? 2;
      for (let i = 0; i < n; i++) {
        const day = clampDay(4 + Math.floor(range(0, 22)));
        if (day > cutoff) continue;
        const amt = round2(jit(s.amount / n, s.jitter));
        add({
          bookingDate: iso(mr.year, mr.month, day),
          amount: amt,
          description: `Überweisung Projekt-Honorar ${pick(["Atelier", "Studio Nord", "Designauftrag", "Rechnung"])}`,
          counterparty: s.employer,
          truth: truthFor("salary", { isIncome: true, isRecurring: false }),
        });
      }
    } else {
      const day = clampDay(s.day);
      if (day <= cutoff) {
        add({
          bookingDate: iso(mr.year, mr.month, day),
          amount: round2(jit(s.amount, s.jitter)),
          description: `Lohn/Gehalt ${s.employer}`,
          counterparty: s.employer,
          truth: truthFor("salary", { isIncome: true, isRecurring: true }),
        });
      }
    }

    // --- recurring debits (rent, utilities, insurance, subs, loans, bnpl) ---
    for (const r of profile.recurring) {
      const day = clampDay(r.day);
      if (day > cutoff) continue;
      const amt = round2(-jit(r.amount, r.jitter ?? 0.01));
      add({
        bookingDate: iso(mr.year, mr.month, day),
        amount: amt,
        description: r.desc,
        counterparty: r.counterparty,
        truth: truthFor(r.category, { isRecurring: true }),
      });
    }

    // --- variable spend streams ---
    for (const stream of profile.spend) {
      for (let i = 0; i < stream.perMonth; i++) {
        const day = clampDay(1 + Math.floor(range(0, dim)));
        if (day > cutoff) continue;
        const amt = round2(-jit(stream.avg, stream.jitter));
        const merchant = pick(stream.merchants);
        add({
          bookingDate: iso(mr.year, mr.month, day),
          amount: amt,
          description: `${merchant} ${pick(["", "Kartenzahlung", "EC", "Lastschrift"])}`.trim(),
          counterparty: merchant,
          truth: truthFor(stream.category),
        });
      }
    }

    // --- adverse markers ---
    if (profile.adverse?.overdraftPerMonth) {
      for (let i = 0; i < profile.adverse.overdraftPerMonth; i++) {
        const day = clampDay(2 + Math.floor(range(0, 24)));
        if (day > cutoff) continue;
        add({
          bookingDate: iso(mr.year, mr.month, day),
          amount: round2(-range(7, 16)),
          description: "Sollzinsen / Kontoüberziehung",
          truth: truthFor("fees"),
        });
      }
    }
    if (profile.adverse?.gamblingPerMonth) {
      for (let i = 0; i < profile.adverse.gamblingPerMonth; i++) {
        const day = clampDay(2 + Math.floor(range(0, 24)));
        if (day > cutoff) continue;
        const merchant = pick(profile.adverse.gamblingMerchants ?? ["LuckySpin"]);
        add({
          bookingDate: iso(mr.year, mr.month, day),
          amount: round2(-range(20, 85)),
          description: `${merchant} Einzahlung`,
          counterparty: merchant,
          truth: truthFor("gambling"),
        });
      }
    }

    // --- occasional move to savings (gives the categoriser transfer examples) ---
    if ((profile.savingsBalance > 4000 || profile.id === "clara-bauer") && !mr.latest) {
      const day = clampDay(profile.salary.day + 1);
      if (day <= cutoff) {
        add({
          bookingDate: iso(mr.year, mr.month, day),
          amount: round2(-range(150, 300)),
          description: "Übertrag eigenes Sparkonto",
          counterparty: "Sparkonto",
          truth: truthFor("transfer", { isRecurring: true }),
        });
      }
    }
  }

  // sort chronologically and accrue a running balance from the opening balance
  pending.sort((a, b) =>
    a.bookingDate < b.bookingDate ? -1 : a.bookingDate > b.bookingDate ? 1 : 0,
  );
  let running = round2(profile.openingBalance);
  const transactions: SeededTransaction[] = pending.map((t) => {
    running = round2(running + t.amount);
    return { ...t, balance: running };
  });
  const closingBalance = running;

  const ibanFor = (salt: string) => {
    const digits = String(hashStr(profile.id + salt))
      .padStart(10, "0")
      .repeat(2)
      .slice(0, 18);
    const check = String((hashStr(salt) % 90) + 10);
    return `DE${check}${digits}`;
  };

  const accounts: Account[] = [
    {
      id: checkingId,
      bankId: "demo-bank",
      type: "checking",
      name: "Girokonto",
      iban: ibanFor("chk"),
      balance: closingBalance,
      currency: "EUR",
    },
    {
      id: savingsId,
      bankId: "demo-bank",
      type: "savings",
      name: "Tagesgeld Sparen",
      iban: ibanFor("sav"),
      balance: round2(profile.savingsBalance),
      currency: "EUR",
    },
  ];

  // --- second ASPSP (multibanking) ---
  if (profile.secondBank) {
    const bankId = profile.secondBank.bankId;
    profile.secondBank.accounts.forEach((spec, ai) => {
      const accId = `${profile.id}-${bankId}-${ai}`;
      if (spec.type === "savings") {
        accounts.push({
          id: accId,
          bankId,
          type: "savings",
          name: spec.name,
          iban: ibanFor(`${bankId}-${ai}`),
          balance: round2(spec.balance),
          currency: "EUR",
        });
        return;
      }
      // checking: generate its own transactions (recurring + spend)
      const acctPending: Pending[] = [];
      let aseq = 0;
      for (const mr of months) {
        const dim = daysInMonth(mr.year, mr.month);
        const cutoff = mr.latest ? LATEST_MONTH_CUTOFF_DAY : dim;
        const clampDay = (d: number) => Math.min(d, dim);
        for (const r of spec.recurring ?? []) {
          const day = clampDay(r.day);
          if (day > cutoff) continue;
          acctPending.push({
            id: `${accId}-${String(aseq++).padStart(3, "0")}`,
            accountId: accId,
            currency: "EUR",
            direction: "debit",
            bookingDate: iso(mr.year, mr.month, day),
            amount: round2(-jit(r.amount, r.jitter ?? 0.01)),
            description: r.desc,
            counterparty: r.counterparty,
            truth: truthFor(r.category, { isRecurring: true }),
          });
        }
        for (const stream of spec.spend ?? []) {
          for (let i = 0; i < stream.perMonth; i++) {
            const day = clampDay(1 + Math.floor(range(0, dim)));
            if (day > cutoff) continue;
            const merchant = pick(stream.merchants);
            acctPending.push({
              id: `${accId}-${String(aseq++).padStart(3, "0")}`,
              accountId: accId,
              currency: "EUR",
              direction: "debit",
              bookingDate: iso(mr.year, mr.month, day),
              amount: round2(-jit(stream.avg, stream.jitter)),
              description: `${merchant} ${pick(["", "Kartenzahlung", "EC"])}`.trim(),
              counterparty: merchant,
              truth: truthFor(stream.category),
            });
          }
        }
      }
      acctPending.sort((a, b) => (a.bookingDate < b.bookingDate ? -1 : a.bookingDate > b.bookingDate ? 1 : 0));
      let arun = round2(spec.balance);
      for (const t of acctPending) {
        arun = round2(arun + t.amount);
        transactions.push({ ...t, balance: arun });
      }
      accounts.push({
        id: accId,
        bankId,
        type: "checking",
        name: spec.name,
        iban: ibanFor(`${bankId}-${ai}`),
        balance: arun,
        currency: "EUR",
      });
    });
    transactions.sort((a, b) => (a.bookingDate < b.bookingDate ? -1 : a.bookingDate > b.bookingDate ? 1 : 0));
  }

  return { accounts, transactions };
}

/** Cached per-persona generation (pure + deterministic, so memoising is safe). */
const cache = new Map<string, PersonaData>();

export function getPersonaData(personaId: string): PersonaData | undefined {
  if (cache.has(personaId)) return cache.get(personaId);
  const profile = getProfile(personaId);
  if (!profile) return undefined;
  const data = generatePersonaData(profile);
  cache.set(personaId, data);
  return data;
}
