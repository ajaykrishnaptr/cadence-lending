/** Fixed-locale formatters so server and client always agree (no hydration drift). */

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eur0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatEUR(amount: number, decimals = true): string {
  return (decimals ? eur : eur0).format(amount);
}

/** Signed amount with explicit +/− for transaction rows. */
export function formatSigned(amount: number): string {
  const s = eur.format(Math.abs(amount));
  return amount < 0 ? `−${s}` : `+${s}`;
}

export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "14 Mar 2026" from an ISO YYYY-MM-DD string (parsed as UTC, no TZ drift). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "Mar 2026" for a YYYY-MM key. */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${MONTHS[m - 1]} ${y}`;
}

export function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const date = `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  const hh = String(dt.getUTCHours()).padStart(2, "0");
  const mm = String(dt.getUTCMinutes()).padStart(2, "0");
  const ss = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${date}, ${hh}:${mm}:${ss} UTC`;
}

/** "DE89 •••• •••• •••• 3000" — show the country/check digits and last 4. */
export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "");
  if (clean.length < 8) return iban;
  return `${clean.slice(0, 4)} •••• •••• •••• ${clean.slice(-4)}`;
}

/** Days between now and an ISO instant (positive = in the future). */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(iso).getTime();
  return Math.ceil((target - from.getTime()) / (1000 * 60 * 60 * 24));
}
