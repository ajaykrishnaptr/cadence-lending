import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "cadence_sid";
export const ROLE_COOKIE = "cadence_role";

/**
 * Two jobs:
 *  1. Guarantee every visitor carries a stable sessionId (scopes all writes;
 *     seeded Demo Bank data is global read-only and never keyed by it).
 *  2. Mock route guards: the console is officer-only, the applicant journey is
 *     applicant-only. Auth is decorative — credentials are shown on the login
 *     screen — but the guards make the role switch feel real.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  let sid = req.cookies.get(SESSION_COOKIE)?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    res.cookies.set(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  const role = req.cookies.get(ROLE_COOKIE)?.value;
  const { pathname } = req.nextUrl;

  const needsOfficer = pathname.startsWith("/console");
  const needsApplicant = pathname.startsWith("/apply");

  if (needsOfficer && role !== "officer") {
    return redirectToLogin(req, "officer");
  }
  if (needsApplicant && role !== "applicant") {
    return redirectToLogin(req, "applicant");
  }
  return res;
}

function redirectToLogin(req: NextRequest, want: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  url.searchParams.set("role", want);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/demo-bank).*)"],
};
