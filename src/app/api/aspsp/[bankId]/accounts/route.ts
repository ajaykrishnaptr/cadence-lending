import { NextResponse } from "next/server";
import { bankExists, getBgAccounts, personaExists } from "@/lib/demo-bank";
import type { BgAccountsResponse } from "@/lib/psd2";

/**
 * Mock ASPSP — Berlin Group NextGenPSD2 "Read Account List", parametrised by
 * bank so Cadence can aggregate across several institutions.
 *   GET /api/aspsp/{bankId}/accounts?psu={accountHolder}&withBalance=true
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ bankId: string }> },
) {
  const { bankId } = await params;
  const url = new URL(req.url);
  const psu = url.searchParams.get("psu") ?? "";
  const withBalance = url.searchParams.get("withBalance") === "true";

  if (!bankExists(bankId) || !personaExists(psu)) {
    return NextResponse.json(
      { tppMessages: [{ category: "ERROR", code: "RESOURCE_UNKNOWN" }] },
      { status: 404 },
    );
  }

  const body: BgAccountsResponse = {
    accounts: getBgAccounts(bankId, psu, withBalance) ?? [],
  };
  return NextResponse.json(body);
}
