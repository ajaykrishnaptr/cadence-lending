import { getDb } from "@/db";
import { MemoryStore } from "./memory";
import { NeonStore } from "./neon";
import type { Store } from "./types";

export * from "./types";

let cached: Store | undefined;

/** Picks Neon when DATABASE_URL is configured, otherwise an in-memory store. */
export function getStore(): Store {
  if (cached) return cached;
  const db = getDb();
  cached = db ? new NeonStore(db) : new MemoryStore();
  return cached;
}

export function storeKind(): "neon" | "memory" {
  return getDb() ? "neon" : "memory";
}
