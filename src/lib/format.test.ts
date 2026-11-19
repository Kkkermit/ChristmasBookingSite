import { describe, expect, it } from 'vitest';
import { colourFor, formatLongDate, initials, sleepsUntilChristmas, timeLeft } from './format';

describe('timeLeft', () => {
  it('breaks the remaining time into days/hours/minutes/seconds', () => {
    const now = new Date('2026-11-19T12:00:00Z');
    expect(timeLeft(new Date('2026-12-08T23:59:59Z'), now)).toMatchObject({ days: 19, hours: 11, minutes: 59, seconds: 59 });
  });

  it('never goes negative', () => {
    expect(timeLeft(new Date('2026-01-01'), new Date('2026-12-01'))).toMatchObject({ totalMs: 0, days: 0, seconds: 0 });
  });
});

describe('sleepsUntilChristmas', () => {
  it('counts nights until the 25th (UK time)', () => {
    expect(sleepsUntilChristmas(new Date('2026-12-24T10:00:00Z'))).toBe(1);
    expect(sleepsUntilChristmas(new Date('2026-12-25T23:30:00Z'))).toBe(0);
    expect(sleepsUntilChristmas(new Date('2026-12-26T09:00:00Z'))).toBe(364);
  });
});

describe('formatting helpers', () => {
  it('formats the deadline in UK style', () => {
    expect(formatLongDate('2026-12-08T23:59:59Z')).toBe('Tuesday 8 December 2026');
  });

  it('makes initials', () => {
    expect(initials('William Brocklehurst')).toBe('WB');
    expect(initials('josh')).toBe('J');
    expect(initials('Zoë van der Berg')).toBe('ZB');
    expect(initials('  ')).toBe('?');
  });

  it('gives each name a stable colour', () => {
    expect(colourFor('Josh')).toBe(colourFor('josh'));
    expect(colourFor('Josh')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
