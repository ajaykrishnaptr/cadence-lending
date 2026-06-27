import { headers } from "next/headers";
import {
  parseBgAccount,
  parseBgTransaction,
  type BgAccountsResponse,
  type BgTransactionsResponse,
} from "./psd2";
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

class DemoBankAisProvider implements AisProvider {
  readonly name = "Demo Bank (mock ASPSP) · Berlin Group NextGenPSD2";

  async getAccounts(accountHolder: string): Promise<AisAccountsResult> {
    const base = await resolveBaseUrl();
    const res = await fetch(
      `${base}/api/demo-bank/accounts?psu=${encodeURIComponent(accountHolder)}&withBalance=true`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`AIS getAccounts failed: ${res.status}`);
    const body = (await res.json()) as BgAccountsResponse;
    return {
      aspsp: "Demo Bank",
      accountHolder,
      accounts: body.accounts.map(parseBgAccount),
    };
  }

  async getTransactions(accountHolder: string): Promise<AisTransactionsResult> {
    const base = await resolveBaseUrl();

    // 1. discover accounts, then follow the checking account's transactions link
    const accRes = await fetch(
      `${base}/api/demo-bank/accounts?psu=${encodeURIComponent(accountHolder)}`,
      { cache: "no-store" },
    );
    if (!accRes.ok) throw new Error(`AIS getAccounts failed: ${accRes.status}`);
    const accBody = (await accRes.json()) as BgAccountsResponse;
    const checking =
      accBody.accounts.find((a) => a.cashAccountType === "CACC") ??
      accBody.accounts[0];
    if (!checking) {
      return { aspsp: "Demo Bank", accountHolder, accountId: "", transactions: [], balanceSeries: [] };
    }

    const href = checking._links?.transactions?.href ??
      `/api/demo-bank/accounts/${checking.resourceId}/transactions`;
    const txRes = await fetch(`${base}${href}`, { cache: "no-store" });
    if (!txRes.ok) throw new Error(`AIS getTransactions failed: ${txRes.status}`);
    const txBody = (await txRes.json()) as BgTransactionsResponse;

    const parsed = txBody.transactions.booked.map((t) =>
      parseBgTransaction(t, checking.resourceId),
    );
    const transactions: Transaction[] = parsed.map(({ balanceAfter: _b, ...t }) => t);
    const balanceSeries: BalancePoint[] = parsed
      .filter((t) => t.balanceAfter !== undefined)
      .map((t) => ({ date: t.bookingDate, balance: t.balanceAfter as number }));

    return {
      aspsp: "Demo Bank",
      accountHolder,
      accountId: checking.resourceId,
      transactions,
      balanceSeries,
    };
  }
}

export const ais: AisProvider = new DemoBankAisProvider();
