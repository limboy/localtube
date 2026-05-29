const UNITS: Record<string, number> = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

export function parseRelativeTime(text: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return undefined;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const ms = UNITS[unit];
  if (!ms) return undefined;
  return Date.now() - amount * ms;
}
