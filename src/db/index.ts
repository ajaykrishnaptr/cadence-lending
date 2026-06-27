import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Db = NeonHttpDatabase<typeof schema>;

let cached: Db | null | undefined;

/** Returns a Drizzle/Neon client, or null when no DATABASE_URL is configured. */
export function getDb(): Db | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    cached = null;
    return cached;
  }
  const sql = neon(url);
  cached = drizzle(sql, { schema });
  return cached;
}

export const isPersistenceConfigured = () => Boolean(process.env.DATABASE_URL);

export { schema };
