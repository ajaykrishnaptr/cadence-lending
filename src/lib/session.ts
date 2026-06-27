import { cookies } from "next/headers";
import { SESSION_COOKIE, ROLE_COOKIE } from "@/middleware";
import { getStore } from "./store";

export type Role = "officer" | "applicant" | null;

/** The current visitor's sessionId (set by middleware). Ensures the row exists. */
export async function getSessionId(): Promise<string> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value ?? "anonymous";
  await getStore().ensureSession(sid);
  return sid;
}

/** sessionId without the ensure round-trip (read-only contexts). */
export async function peekSessionId(): Promise<string> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? "anonymous";
}

export async function getRole(): Promise<Role> {
  const jar = await cookies();
  const r = jar.get(ROLE_COOKIE)?.value;
  return r === "officer" || r === "applicant" ? r : null;
}
