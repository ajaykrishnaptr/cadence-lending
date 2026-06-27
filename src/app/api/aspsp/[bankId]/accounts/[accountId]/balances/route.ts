import { NextResponse } from "next/server";
import { bankExists, getBgBalances, personaForAccount } from "@/lib/demo-bank";
import type { BgBalancesResponse } from "@/lib/psd2";

/** Mock ASPSP — Berlin Group "Read Balance". */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bankId: string; accountId: string }> },
) {
  const { bankId, accountId } = await params;
  const persona = personaForAccount(accountId);
  const result = bankExists(bankId) && persona ? getBgBalances(persona, accountId) : undefined;
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
