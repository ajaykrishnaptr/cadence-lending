import { NextResponse } from "next/server";
import { getBgBalances, personaForAccount } from "@/lib/demo-bank";
import type { BgBalancesResponse } from "@/lib/psd2";

/**
 * Demo Bank (mock ASPSP) — Berlin Group "Read Balance".
 *   GET /api/demo-bank/accounts/{accountId}/balances
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  const persona = personaForAccount(accountId);
  const result = persona ? getBgBalances(persona, accountId) : undefined;
  if (!result) {
    return NextResponse.json(
      { tppMessages: [{ category: "ERROR", code: "RESOURCE_UNKNOWN" }] },
      { status: 404 },
    );
  }
  const body: BgBalancesResponse = {
    account: { iban: result.iban },
    balances: result.balances,
  };
  return NextResponse.json(body);
}
