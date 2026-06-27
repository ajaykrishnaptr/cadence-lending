import { NextResponse } from "next/server";
import { getBgTransactions, personaForAccount } from "@/lib/demo-bank";
import type { BgTransactionsResponse } from "@/lib/psd2";

/**
 * Demo Bank (mock ASPSP) — Berlin Group "Read Transaction List".
 *   GET /api/demo-bank/accounts/{accountId}/transactions
 * Returns raw booked/pending lines only — categorisation is Cadence's job.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  const { accountId } = await params;
  const persona = personaForAccount(accountId);
  const result = persona ? getBgTransactions(persona, accountId) : undefined;
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
      _links: {
        account: { href: `/api/demo-bank/accounts/${accountId}` },
      },
    },
  };
  return NextResponse.json(body);
}
