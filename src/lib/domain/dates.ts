/** Date helpers for the domain layer — everything is a plain YYYY-MM-DD string. */

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole days between two ISO dates, positive when `dateISO` is later. */
export function dayIndexFor(dateISO: string, startISO: string): number {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  const date = Date.parse(`${dateISO}T00:00:00Z`);
  return Math.round((date - start) / 86_400_000);
}
