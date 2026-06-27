import {
  serializeAccount,
  serializeBalances,
  serializeTransaction,
  type BgAccount,
  type BgBalance,
  type BgTransaction,
} from "../psd2";
import { getPersonaData, type SeededTransaction } from "./generator";
import { getProfile, listPersonas, PROFILES } from "./personas";

export { listPersonas, PROFILES, getProfile } from "./personas";
export type { SeededTransaction, PersonaData } from "./generator";
export { getPersonaData } from "./generator";

const BASE_PATH = "/api/demo-bank";
/** Reference date for balance snapshots (the demo's "today"). */
const REFERENCE_DATE = "2026-06-27";

function ownerName(personaId: string): string {
  return getProfile(personaId)?.name ?? personaId;
}

/** Demo Bank → Berlin Group accounts (optionally with inline balances). */
export function getBgAccounts(
  personaId: string,
  withBalance = false,
): BgAccount[] | undefined {
  const data = getPersonaData(personaId);
  if (!data) return undefined;
  return data.accounts.map((acc) => {
    const bg = serializeAccount(acc, ownerName(personaId), BASE_PATH);
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
  // statement lines belong to the checking account in this demo
  const lines: SeededTransaction[] =
    acc.type === "checking" ? data.transactions : [];
  return {
    iban: acc.iban,
    booked: lines.map(serializeTransaction),
    pending: [],
  };
}

/** Resolve which persona an account/resourceId belongs to (e.g. clara-bauer-chk). */
export function personaForAccount(accountId: string): string | undefined {
  return PROFILES.map((p) => p.id).find((id) => accountId.startsWith(`${id}-`));
}

export function personaExists(personaId: string): boolean {
  return PROFILES.some((p) => p.id === personaId);
}

export const ALL_PERSONA_IDS = listPersonas().map((p) => p.id);
