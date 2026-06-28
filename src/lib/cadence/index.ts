import { ais, type BalancePoint } from "../ais";
import { getProfile, bureauInput, banksForPersona, bankName, queryCreditRegistry } from "../demo-bank";
import { CONSUMER_LOAN, runDecision, type DecisionPackage, type ProductConfig } from "../engine";
import type { Account, CategoriserSource, LoanRequest } from "../types";
import { categorise, type CategoriseResult } from "./categorise";

export * from "./categorise";

interface AccountData {
  accounts: Account[];
  balanceSeries: BalancePoint[];
  accountId: string;
}

const accountCache = new Map<string, AccountData>();
const categoriseCache = new Map<string, CategoriseResult>();
const decisionCache = new Map<string, DecisionPackage>();

const banksKey = (banks?: string[]) => (banks ? [...banks].sort().join("+") : "all");

/** Pull a persona's accounts + statement via the AIS provider (memoised). */
export async function getAccountData(personaId: string, banks?: string[]): Promise<AccountData> {
  const key = `${personaId}:${banksKey(banks)}`;
  const hit = accountCache.get(key);
  if (hit) return hit;
  const [accRes, txRes] = await Promise.all([
    ais.getAccounts(personaId, banks),
    ais.getTransactions(personaId, banks),
  ]);
  const data: AccountData = {
    accounts: accRes.accounts,
    balanceSeries: txRes.balanceSeries,
    accountId: txRes.accountId,
  };
  accountCache.set(key, data);
  return data;
}

/** Categorise a persona's statement. Seed/rules are cached; gemini runs fresh. */
export async function getCategorised(
  personaId: string,
  source: CategoriserSource = "seed",
  banks?: string[],
  opts?: { force?: boolean },
): Promise<CategoriseResult> {
  const key = `${personaId}:${source}:${banksKey(banks)}`;
  if (source !== "gemini") {
    const hit = categoriseCache.get(key);
    if (hit) return hit;
  }
  const tx = await ais.getTransactions(personaId, banks);
  const result = await categorise(tx.transactions, source, opts);
  if (source !== "gemini") categoriseCache.set(key, result);
  return result;
}

/** Full decision package for a persona at a given request (memoised per key). */
export async function getDecision(
  personaId: string,
  request: LoanRequest,
  source: CategoriserSource = "seed",
  product: ProductConfig = CONSUMER_LOAN,
  banks?: string[],
): Promise<DecisionPackage & { categoriserSource: CategoriserSource; categoriserFellBack?: boolean }> {
  const profile = getProfile(personaId);
  if (!profile) throw new Error(`Unknown persona: ${personaId}`);

  const key = `${personaId}:${product.id}:${request.amount}:${request.termMonths}:${request.purpose}:${source}:${banksKey(banks)}`;
  if (source !== "gemini" && decisionCache.has(key)) {
    const cached = decisionCache.get(key)!;
    return Object.assign(cached, { categoriserSource: source });
  }

  const cat = await getCategorised(personaId, source, banks);

  // Data-coverage: which of the persona's known banks were actually connected.
  // (banks undefined → the default seeded run, where all banks are connected.)
  const knownBanks = banksForPersona(personaId);
  const connectedBanks =
    banks && banks.length ? banks.filter((b) => knownBanks.includes(b)) : knownBanks;
  const missingIds = knownBanks.filter((b) => !connectedBanks.includes(b));
  const disclosures = queryCreditRegistry(personaId);
  const coverage = {
    connectedCount: connectedBanks.length,
    knownCount: knownBanks.length,
    missingBankNames: missingIds.map((b) => bankName(b)),
    missingCreditCount: disclosures.filter((d) => d.isCredit && missingIds.includes(d.bankId)).length,
  };

  const pkg = runDecision(cat.transactions, request, product, profile.householdSize, bureauInput(personaId), coverage);
  const enriched = Object.assign(pkg, {
    categoriserSource: cat.source,
    categoriserFellBack: cat.fellBack,
  });
  if (source !== "gemini") decisionCache.set(key, enriched);
  return enriched;
}

/** Default-request decision for a seeded persona (drives list/dashboard status). */
export async function getSeededDecision(personaId: string) {
  const profile = getProfile(personaId);
  if (!profile) throw new Error(`Unknown persona: ${personaId}`);
  return getDecision(personaId, profile.request, "seed");
}
