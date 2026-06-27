/**
 * The ASPSP directory Cadence can connect to. In real open banking a TPP holds
 * a directory of every licensed ASPSP (from regulatory registers and open-
 * banking directories) and the customer picks which ones they bank with — there
 * is no central lookup of "who banks where". Only Demo Bank and Civic Bank carry
 * generated data here; the rest populate the picker so it reads like a real
 * institution list. Every brand is fictional.
 *
 * `bankCode` is the 8-digit national bank code embedded in a German IBAN
 * (DEkk BBBBBBBB CCCCCCCCCC), so the bank a counterparty IBAN belongs to can be
 * derived — which is exactly how the "connect your other bank" nudge works.
 */
export interface Aspsp {
  id: string;
  name: string;
  shortName: string;
  bic: string;
  bankCode: string;
  country: string;
  /** Whether the demo holds account data for this ASPSP. */
  hasData: boolean;
  /** Short descriptor shown in the picker. */
  kind: string;
}

export const BANKS: Record<string, Aspsp> = {
  "demo-bank": { id: "demo-bank", name: "Demo Bank", shortName: "Demo", bic: "DEMODEFFXXX", bankCode: "10010010", country: "DE", hasData: true, kind: "Retail bank" },
  "civic-bank": { id: "civic-bank", name: "Civic Bank", shortName: "Civic", bic: "CIVCDEFFXXX", bankCode: "20020020", country: "DE", hasData: true, kind: "Retail bank" },
  "nordhaven-bank": { id: "nordhaven-bank", name: "Nordhaven Bank", shortName: "Nordhaven", bic: "NRDHDEFFXXX", bankCode: "30030030", country: "DE", hasData: false, kind: "Retail bank" },
  "meridian-bank": { id: "meridian-bank", name: "Meridian Bank", shortName: "Meridian", bic: "MERIDEFFXXX", bankCode: "44044044", country: "DE", hasData: false, kind: "Private bank" },
  "aurora-direkt": { id: "aurora-direkt", name: "Aurora Direkt", shortName: "Aurora", bic: "AURODEFFXXX", bankCode: "50050050", country: "DE", hasData: false, kind: "Direct bank" },
  "hanse-sparbank": { id: "hanse-sparbank", name: "Hanse Sparbank", shortName: "Hanse", bic: "HNSEDEFFXXX", bankCode: "60060060", country: "DE", hasData: false, kind: "Savings bank" },
};

export const BANK_LIST = Object.values(BANKS);
/** The whole picker directory, alphabetical. */
export const BANK_DIRECTORY = [...BANK_LIST].sort((a, b) => a.name.localeCompare(b.name));

export const PRIMARY_BANK = "demo-bank";

export function getBank(id: string): Aspsp | undefined {
  return BANKS[id];
}

export function bankName(id: string): string {
  return BANKS[id]?.name ?? id;
}

/** Extract the 8-digit bank code from a German IBAN. */
export function ibanBankCode(iban: string): string {
  return iban.replace(/\s+/g, "").slice(4, 12);
}

/** Which ASPSP a (counterparty) IBAN belongs to, if any in the directory. */
export function bankForIban(iban: string): Aspsp | undefined {
  const code = ibanBankCode(iban);
  return BANK_LIST.find((b) => b.bankCode === code);
}
