const LONDON = 'Europe/London';

export interface TimeLeft {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function timeLeft(target: Date, now: Date): TimeLeft {
  const totalMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/** e.g. "Tuesday 8 December 2026" (UK time). */
export function formatLongDate(iso: string): string {
  // Built from parts so every browser renders it identically (some add a comma).
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: LONDON,
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}`;
}

/** e.g. "8 Dec" (UK time). */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: LONDON }).format(new Date(iso));
}

function londonDay(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LONDON,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return Date.UTC(Number(parts.slice(0, 4)), Number(parts.slice(5, 7)) - 1, Number(parts.slice(8, 10)));
}

/** Number of nights until Christmas Day (0 on the day itself). */
export function sleepsUntilChristmas(now: Date): number {
  const today = londonDay(now);
  const year = new Date(today).getUTCFullYear();
  let christmas = Date.UTC(year, 11, 25);
  if (today > christmas) christmas = Date.UTC(year + 1, 11, 25);
  return Math.round((christmas - today) / 86_400_000);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : '';
  return (first + last).toUpperCase();
}

const PALETTE = ['#f43f5e', '#22c55e', '#f59e0b', '#38bdf8', '#a855f7', '#ec4899', '#14b8a6', '#ef4444'];

/** Stable festive colour per name. */
export function colourFor(name: string): string {
  let hash = 0;
  for (const ch of name.toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
