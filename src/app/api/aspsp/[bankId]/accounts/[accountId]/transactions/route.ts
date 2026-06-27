import { NextResponse } from "next/server";
import { bankExists, getBgTransactions, personaForAccount } from "@/lib/demo-bank";
import type { BgTransactionsResponse } from "@/lib/psd2";

/** Mock ASPSP — Berlin Group "Read Transaction List". */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bankId: string; accountId: string }> },
) {
  const { bankId, accountId } = await params;
  const persona = personaForAccount(accountId);
  const result = bankExists(bankId) && persona ? getBgTransactions(persona, accountId) : undefined;
  if (!result) {
    return NextResponse.json(
      { tppMessages: [{ category: "ERROR", code: "RESOURCE_UNKNOWN" }] },
      { status: 404 },
    );
  }
  const body: BgTransactionsResponse = {
    account: { iban: result.iban },
    transactions: {
      booked: result.booked,
      pending: result.pending,
      _links: { account: { href: `/api/aspsp/${bankId}/accounts/${accountId}` } },
    },
  };
  return NextResponse.json(body);
}
