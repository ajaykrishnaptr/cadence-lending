import { headers } from "next/headers";
import {
  parseBgAccount,
  parseBgTransaction,
  type BgAccountsResponse,
  type BgTransactionsResponse,
} from "./psd2";
import { banksForPersona } from "./demo-bank/personas";
import { PRIMARY_BANK } from "./demo-bank/banks";
import type { Account, Transaction } from "./types";

/**
 * The AIS (Account Information Service) provider interface — the seam a real TPP
 * crosses to reach an ASPSP. Cadence depends ONLY on this interface; the demo
 * wires it to Demo Bank's Berlin Group NextGenPSD2 endpoints over HTTP and maps
 * the raw wire format into Cadence's own domain model. That mapping — turning
 * sign-embedded, loosely-labelled booking lines into clean records ready for
 * categorisation — is precisely the work the thesis is about.
 */
export interface BalancePoint {
  date: string;
  balance: number;
}

export interface AisAccountsResult {
  aspsp: string;
  accountHolder: string;
  accounts: Account[];
}

export interface AisTransactionsResult {
  aspsp: string;
  accountHolder: string;
  accountId: string;
  transactions: Transaction[];
  balanceSeries: BalancePoint[];
}

export interface AisProvider {
  readonly name: string;
  getAccounts(accountHolder: string): Promise<AisAccountsResult>;
  getTransactions(accountHolder: string): Promise<AisTransactionsResult>;
}

async function resolveBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // Prefer the actual request host (the public alias the visitor is on). The
  // deployment-specific VERCEL_URL can sit behind deployment protection and
  // return an HTML auth page, which would break the JSON self-call.
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const isLocal = /^(localhost|127\.)/.test(host);
      const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* not in a request scope */
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
}

/**
 * Aggregates across every ASPSP the applicant banks with. For each connected
 * bank it performs a real Berlin Group call, then merges the results into one
 * cross-institution picture for the categoriser and engine — which is the whole
 * value of open banking.
 */
class AggregatingAisProvider implements AisProvider {
  readonly name = "Cadence AIS aggregator · Berlin Group NextGenPSD2";

  private async fetchBankAccounts(
    base: string,
    bankId: string,
    accountHolder: string,
    withBalance: boolean,
  ): Promise<BgAccountsResponse> {
    const res = await fetch(
      `${base}/api/aspsp/${bankId}/accounts?psu=${encodeURIComponent(accountHolder)}${withBalance ? "&withBalance=true" : ""}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`AIS getAccounts(${bankId}) failed: ${res.status}`);
    return res.json();
  }

  async getAccounts(accountHolder: string): Promise<AisAccountsResult> {
    const base = await resolveBaseUrl();
    const banks = banksForPersona(accountHolder);
    const accounts: Account[] = [];
    await Promise.all(
      banks.map(async (bankId) => {
        const body = await this.fetchBankAccounts(base, bankId, accountHolder, true);
        for (const bg of body.accounts) accounts.push(parseBgAccount(bg, bankId));
      }),
    );
    return { aspsp: "Cadence aggregator", accountHolder, accounts };
  }

  async getTransactions(accountHolder: string): Promise<AisTransactionsResult> {
    const base = await resolveBaseUrl();
    const banks = banksForPersona(accountHolder);

    const transactions: Transaction[] = [];
    let balanceSeries: BalancePoint[] = [];
    let primaryAccountId = "";

    await Promise.all(
      banks.map(async (bankId) => {
        const accBody = await this.fetchBankAccounts(base, bankId, accountHolder, false);
        // statement lines live on current accounts (CACC)
        const checking = accBody.accounts.filter((a) => a.cashAccountType === "CACC");
        await Promise.all(
          checking.map(async (acc) => {
            const href =
              acc._links?.transactions?.href ??
              `/api/aspsp/${bankId}/accounts/${acc.resourceId}/transactions`;
            const txRes = await fetch(`${base}${href}`, { cache: "no-store" });
            if (!txRes.ok) throw new Error(`AIS getTransactions(${bankId}) failed: ${txRes.status}`);
            const txBody = (await txRes.json()) as BgTransactionsResponse;
            const parsed = txBody.transactions.booked.map((t) =>
              parseBgTransaction(t, acc.resourceId, bankId),
            );
            for (const { balanceAfter: _b, ...t } of parsed) transactions.push(t);
            // the primary bank's main account drives the balance trend chart
            if (bankId === PRIMARY_BANK && !primaryAccountId) {
              primaryAccountId = acc.resourceId;
              balanceSeries = parsed
                .filter((t) => t.balanceAfter !== undefined)
                .map((t) => ({ date: t.bookingDate, balance: t.balanceAfter as number }));
            }
          }),
        );
      }),
    );

    transactions.sort((a, b) => (a.bookingDate < b.bookingDate ? -1 : 1));
    return {
      aspsp: "Cadence aggregator",
      accountHolder,
      accountId: primaryAccountId,
      transactions,
      balanceSeries,
    };
  }
}

export const ais: AisProvider = new AggregatingAisProvider();
