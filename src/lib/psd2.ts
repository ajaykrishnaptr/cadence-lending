/**
 * Berlin Group NextGenPSD2 (XS2A) AIS wire format.
 *
 * This is the contract Demo Bank (the mock ASPSP) exposes and Cadence (the TPP)
 * consumes. Keeping it faithful matters: it is the literal boundary an account-
 * information provider sits on, and the work of turning these raw, sign-embedded,
 * loosely-labelled booking lines into a decision is exactly Cadence's value-add.
 *
 * Conventions per the standard:
 *  - amounts are STRINGS with the sign embedded (debits negative); no separate
 *    credit/debit indicator.
 *  - dates are ISO YYYY-MM-DD; lastChangeDateTime is a full ISO datetime.
 *  - the counterparty is creditor* for outflows, debtor* for inflows.
 */

import type { Account, Transaction } from "./types";
import type { SeededTransaction } from "./demo-bank/generator";

export interface BgAmount {
  amount: string;
  currency: string;
}

export interface BgAccountReference {
  iban: string;
}

export interface BgBalance {
  balanceType:
    | "closingBooked"
    | "expected"
    | "interimAvailable"
    | "openingBooked";
  balanceAmount: BgAmount;
  referenceDate?: string;
  lastChangeDateTime?: string;
}

export interface BgAccount {
  resourceId: string;
  iban: string;
  currency: string;
  name: string;
  product?: string;
  cashAccountType?: string; // ISO 20022 ExternalCashAccountType (CACC, SVGS)
  status?: string;
  bic?: string;
  ownerName?: string;
  balances?: BgBalance[];
  _links?: Record<string, { href: string }>;
}

export interface BgTransaction {
  transactionId?: string;
  entryReference?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: BgAmount;
  creditorName?: string;
  creditorAccount?: BgAccountReference;
  debtorName?: string;
  debtorAccount?: BgAccountReference;
  remittanceInformationUnstructured?: string;
  bankTransactionCode?: string;
  proprietaryBankTransactionCode?: string;
  balanceAfterTransaction?: BgAmount;
}

export interface BgAccountsResponse {
  accounts: BgAccount[];
}

export interface BgBalancesResponse {
  account: BgAccountReference;
  balances: BgBalance[];
}

export interface BgTransactionsResponse {
  account: BgAccountReference;
  transactions: {
    booked: BgTransaction[];
    pending: BgTransaction[];
    _links?: Record<string, { href: string }>;
  };
}

const CASH_TYPE: Record<Account["type"], string> = {
  checking: "CACC",
  savings: "SVGS",
};

function bgAmount(n: number): BgAmount {
  return { amount: n.toFixed(2), currency: "EUR" };
}

// ---- serialise internal → Berlin Group (Demo Bank's job) ----

export function serializeAccount(
  acc: Account,
  ownerName: string,
  opts: { bic: string; basePath: string },
): BgAccount {
  return {
    resourceId: acc.id,
    iban: acc.iban,
    currency: acc.currency,
    name: acc.name,
    product: acc.type === "checking" ? "Girokonto" : "Tagesgeldkonto",
    cashAccountType: CASH_TYPE[acc.type],
    status: "enabled",
    bic: opts.bic,
    ownerName,
    _links: {
      balances: { href: `${opts.basePath}/accounts/${acc.id}/balances` },
      transactions: { href: `${opts.basePath}/accounts/${acc.id}/transactions` },
    },
  };
}

export function serializeBalances(acc: Account, referenceDate: string): BgBalance[] {
  return [
    {
      balanceType: "closingBooked",
      balanceAmount: bgAmount(acc.balance),
      referenceDate,
    },
    {
      balanceType: "interimAvailable",
      balanceAmount: bgAmount(acc.balance),
      referenceDate,
    },
  ];
}

export function serializeTransaction(t: SeededTransaction): BgTransaction {
  const isCredit = t.amount >= 0;
  const counterparty = t.counterparty;
  return {
    transactionId: t.id,
    entryReference: t.id,
    bookingDate: t.bookingDate,
    valueDate: t.bookingDate,
    transactionAmount: bgAmount(t.amount),
    // counterparty side depends on flow direction
    ...(isCredit
      ? { debtorName: counterparty }
      : { creditorName: counterparty }),
    remittanceInformationUnstructured: t.description,
    proprietaryBankTransactionCode: isCredit ? "CRDT" : "DBIT",
    balanceAfterTransaction: bgAmount(t.balance),
  };
}

// ---- parse Berlin Group → internal (Cadence's AIS adapter) ----

export function parseBgAccount(bg: BgAccount, bankId: string): Account {
  const type: Account["type"] =
    bg.cashAccountType === "SVGS" ? "savings" : "checking";
  const closing = bg.balances?.find((b) => b.balanceType === "closingBooked");
  return {
    id: bg.resourceId,
    bankId,
    type,
    name: bg.name,
    iban: bg.iban,
    balance: closing ? Number(closing.balanceAmount.amount) : 0,
    currency: "EUR",
  };
}

export function parseBgTransaction(
  bg: BgTransaction,
  accountId: string,
  bankId?: string,
): Transaction & { balanceAfter?: number } {
  const amount = Number(bg.transactionAmount.amount);
  const counterparty = bg.creditorName || bg.debtorName || undefined;
  const remittance = bg.remittanceInformationUnstructured ?? "";
  // Cadence reconstructs the working description from the raw fields it received.
  const description = remittance || counterparty || "Transaction";
  return {
    id: bg.transactionId ?? bg.entryReference ?? `${accountId}-${bg.bookingDate}`,
    accountId,
    bookingDate: bg.bookingDate ?? "",
    amount,
    currency: "EUR",
    description,
    counterparty,
    direction: amount >= 0 ? "credit" : "debit",
    bankId,
    balanceAfter: bg.balanceAfterTransaction
      ? Number(bg.balanceAfterTransaction.amount)
      : undefined,
  };
}
