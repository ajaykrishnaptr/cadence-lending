import {
  serializeAccount,
  serializeBalances,
  serializeTransaction,
  type BgAccount,
  type BgBalance,
  type BgTransaction,
} from "../psd2";
import { BANKS, getBank, bankForIban } from "./banks";
import { getPersonaData, type SeededTransaction } from "./generator";
import { getProfile, listPersonas, PROFILES, banksForPersona } from "./personas";

export { listPersonas, PROFILES, getProfile, banksForPersona } from "./personas";
export { queryCreditRegistry, registryBanks } from "./registry";
export type { RegistryDisclosure } from "./registry";
export { BANKS, BANK_LIST, BANK_DIRECTORY, getBank, bankName, PRIMARY_BANK } from "./banks";
export type { Aspsp } from "./banks";
export type { SeededTransaction, PersonaData } from "./generator";
export { getPersonaData } from "./generator";

/** Reference date for balance snapshots (the demo's "today"). */
const REFERENCE_DATE = "2026-06-27";

function ownerName(personaId: string): string {
  return getProfile(personaId)?.name ?? personaId;
}

function basePath(bankId: string): string {
  return `/api/aspsp/${bankId}`;
}

/** A single ASPSP's accounts for a PSU → Berlin Group (optionally with balances). */
export function getBgAccounts(
  bankId: string,
  personaId: string,
  withBalance = false,
): BgAccount[] | undefined {
  const bank = getBank(bankId);
  const data = getPersonaData(personaId);
  if (!bank || !data) return undefined;
  return data.accounts
    .filter((a) => a.bankId === bankId)
    .map((acc) => {
      const bg = serializeAccount(acc, ownerName(personaId), {
        bic: bank.bic,
        basePath: basePath(bankId),
      });
      if (withBalance) bg.balances = serializeBalances(acc, REFERENCE_DATE);
      return bg;
    });
}

export function getBgBalances(
  personaId: string,
  accountId: string,
): { iban: string; balances: BgBalance[] } | undefined {
  const data = getPersonaData(personaId);
  const acc = data?.accounts.find((a) => a.id === accountId);
  if (!acc) return undefined;
  return { iban: acc.iban, balances: serializeBalances(acc, REFERENCE_DATE) };
}

export function getBgTransactions(
  personaId: string,
  accountId: string,
): { iban: string; booked: BgTransaction[]; pending: BgTransaction[] } | undefined {
  const data = getPersonaData(personaId);
  const acc = data?.accounts.find((a) => a.id === accountId);
  if (!data || !acc) return undefined;
  const lines: SeededTransaction[] = data.transactions.filter(
    (t) => t.accountId === accountId,
  );
  return { iban: acc.iban, booked: lines.map(serializeTransaction), pending: [] };
}

/** Resolve which persona an account/resourceId belongs to (id starts with persona id). */
export function personaForAccount(accountId: string): string | undefined {
  return PROFILES.map((p) => p.id).find((id) => accountId.startsWith(`${id}-`));
}

export function personaExists(personaId: string): boolean {
  return PROFILES.some((p) => p.id === personaId);
}

export function bankExists(bankId: string): boolean {
  return Boolean(BANKS[bankId]);
}

export interface BankSuggestion {
  bankId: string;
  count: number;
  sampleIban: string;
}

/**
 * The "connect your other bank" nudge. Scans the transactions of the ALREADY-
 * connected banks for counterparty IBANs that resolve to another directory bank
 * the applicant holds data at but has not connected — exactly how an aggregator
 * infers a likely additional bank from a transfer's destination IBAN.
 */
export function detectConnectableBanks(
  personaId: string,
  connectedBankIds: string[],
): BankSuggestion[] {
  const data = getPersonaData(personaId);
  if (!data) return [];
  const accountBank = new Map(data.accounts.map((a) => [a.id, a.bankId]));
  const personaBanks = banksForPersona(personaId);
  const found = new Map<string, { count: number; sampleIban: string }>();

  for (const t of data.transactions) {
    if (!t.counterpartyIban) continue;
    if (!connectedBankIds.includes(accountBank.get(t.accountId) ?? "")) continue;
    const target = bankForIban(t.counterpartyIban);
    if (!target || !target.hasData) continue;
    if (connectedBankIds.includes(target.id)) continue;
    if (!personaBanks.includes(target.id)) continue;
    const e = found.get(target.id) ?? { count: 0, sampleIban: t.counterpartyIban };
    e.count += 1;
    found.set(target.id, e);
  }
  return [...found.entries()].map(([bankId, e]) => ({ bankId, ...e }));
}

export const ALL_PERSONA_IDS = listPersonas().map((p) => p.id);
