export function ymdLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const isActiveOn = (
  c: { startDate: string; endDate?: string | null },
  t: string,
) => c.startDate <= t && (!c.endDate || c.endDate >= t);

export const endsOn = (c: { endDate?: string | null }, t: string) =>
  !!c.endDate && c.endDate === t;

export const isScheduledAfter = (c: { startDate: string }, t: string) =>
  c.startDate > t;
