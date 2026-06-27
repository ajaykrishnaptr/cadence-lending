import { NextResponse } from "next/server";
import { getBgAccounts, personaExists } from "@/lib/demo-bank";
import type { BgAccountsResponse } from "@/lib/psd2";

/**
 * Demo Bank (mock ASPSP) — Berlin Group NextGenPSD2 "Read Account List".
 *   GET /api/demo-bank/accounts?psu={accountHolder}&withBalance=true
 * Cadence reaches this only via the AIS provider interface (lib/ais.ts),
 * mirroring a real TPP → ASPSP call. No ground-truth labels are exposed.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const psu = url.searchParams.get("psu") ?? "";
  const withBalance = url.searchParams.get("withBalance") === "true";

  if (!personaExists(psu)) {
    return NextResponse.json(
      { tppMessages: [{ category: "ERROR", code: "RESOURCE_UNKNOWN" }] },
      { status: 404 },
    );
  }

  const body: BgAccountsResponse = { accounts: getBgAccounts(psu, withBalance)! };
  return NextResponse.json(body);
}
