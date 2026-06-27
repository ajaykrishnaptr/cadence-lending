/**
 * The ASPSPs (banks) Cadence can aggregate over. Both are fictional. A real TPP
 * fans out across every institution the applicant banks with — aggregating that
 * data into one picture is the point of open banking, and the substance of the
 * affordability assessment.
 */
export interface Aspsp {
  id: string;
  name: string;
  shortName: string;
  bic: string;
  country: string;
}

export const BANKS: Record<string, Aspsp> = {
  "demo-bank": {
    id: "demo-bank",
    name: "Demo Bank",
    shortName: "Demo",
    bic: "DEMODEFFXXX",
    country: "DE",
  },
  "civic-bank": {
    id: "civic-bank",
    name: "Civic Bank",
    shortName: "Civic",
    bic: "CIVCDEFFXXX",
    country: "DE",
  },
};

export const BANK_LIST = Object.values(BANKS);

export const PRIMARY_BANK = "demo-bank";

export function getBank(id: string): Aspsp | undefined {
  return BANKS[id];
}

export function bankName(id: string): string {
  return BANKS[id]?.name ?? id;
}
