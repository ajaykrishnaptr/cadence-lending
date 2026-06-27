import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "cadence_sid";
export const ROLE_COOKIE = "cadence_role";

const COOKIE_OPTS = { sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30 };

/**
 * Two jobs:
 *  1. Guarantee every visitor carries a stable sessionId (scopes all writes;
 *     seeded Demo Bank data is global read-only and never keyed by it).
 *  2. Decorative role handling. The console is the officer area and the
 *     applicant journey is the applicant area; on first visit to either, the
 *     matching role is granted in place so the golden path never dead-ends at a
 *     sign-in wall. The login screen stays available from the header for the
 *     credentials demo and for explicitly switching roles.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  let sid = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    res.cookies.set(SESSION_COOKIE, sid, { httpOnly: true, ...COOKIE_OPTS });
  }

  const role = req.cookies.get(ROLE_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/console") && role !== "officer") {
    res.cookies.set(ROLE_COOKIE, "officer", COOKIE_OPTS);
  } else if (pathname.startsWith("/apply") && role !== "applicant") {
    res.cookies.set(ROLE_COOKIE, "applicant", COOKIE_OPTS);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/aspsp).*)"],
};
