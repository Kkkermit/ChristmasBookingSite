import { describe, expect, it } from 'vitest';
import { COURSES, SKIP, choiceLabel, findDish, isValidChoice } from '../shared/menu.js';
import { LIMITS, cleanText, isPdfSafe, nameKey, validateDetails, validateOrderInput } from '../shared/validation.js';

describe('menu', () => {
  it('matches the restaurant booking form: 4 starters, 5 mains, 4 desserts', () => {
    expect(COURSES.map((c) => [c.id, c.dishes.length])).toEqual([
      ['starter', 4],
      ['main', 5],
      ['dessert', 4],
    ]);
  });

  it('has unique dish ids', () => {
    const ids = COURSES.flatMap((c) => c.dishes.map((d) => d.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('labels choices', () => {
    expect(choiceLabel('main', 'seabass')).toBe('Seabass');
    expect(choiceLabel('starter', SKIP)).toBe('No starter');
    expect(findDish('dessert', 'trillionaires_tart')?.name).toBe("Trillionaire's Tart");
  });

  it('only lets starters and desserts be skipped', () => {
    expect(isValidChoice('starter', SKIP)).toBe(true);
    expect(isValidChoice('dessert', SKIP)).toBe(true);
    expect(isValidChoice('main', SKIP)).toBe(false);
    expect(isValidChoice('main', 'seabass')).toBe(true);
    expect(isValidChoice('main', 'shrimp_cocktail')).toBe(false);
  });
});

describe('validateOrderInput', () => {
  const valid = { name: 'Josh', starter: 'shrimp_cocktail', main: 'seabass', dessert: SKIP, notes: '' };

  it('accepts a valid order and tidies whitespace', () => {
    const result = validateOrderInput({ ...valid, name: '  Mary   Christmas\n', notes: ' no\tnuts ' });
    expect(result).toEqual({ ok: true, value: { ...valid, name: 'Mary Christmas', notes: 'no nuts' } });
  });

  it('requires a name and all three choices', () => {
    const result = validateOrderInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['dessert', 'main', 'name', 'starter']);
  });

  it('rejects dishes from the wrong course or not on the menu', () => {
    const result = validateOrderInput({ ...valid, starter: 'seabass', main: 'roast_reindeer' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['main', 'starter']);
  });

  it('rejects non-string values', () => {
    expect(validateOrderInput({ ...valid, main: ['seabass'] }).ok).toBe(false);
    expect(validateOrderInput({ ...valid, name: { first: 'Josh' } }).ok).toBe(false);
    expect(validateOrderInput(null).ok).toBe(false);
  });

  it('enforces length limits', () => {
    expect(validateOrderInput({ ...valid, name: 'x'.repeat(LIMITS.name) }).ok).toBe(true);
    expect(validateOrderInput({ ...valid, name: 'x'.repeat(LIMITS.name + 1) }).ok).toBe(false);
    expect(validateOrderInput({ ...valid, notes: 'x'.repeat(LIMITS.notes + 1) }).ok).toBe(false);
  });

  it('rejects emoji (the PDF font cannot print them) but allows accents and smart quotes', () => {
    expect(validateOrderInput({ ...valid, name: 'Santa 🎅' }).ok).toBe(false);
    expect(validateOrderInput({ ...valid, name: 'Zoë O’Brien-Müller' }).ok).toBe(true);
  });
});

describe('validateDetails', () => {
  it('accepts empty details', () => {
    expect(validateDetails({}).ok).toBe(true);
  });

  it('checks email format and lengths, and drops unknown keys', () => {
    expect(validateDetails({ email: 'nope' }).ok).toBe(false);
    expect(validateDetails({ address: 'x'.repeat(LIMITS.detail + 1) }).ok).toBe(false);
    const result = validateDetails({ email: ' a@b.co ', rogue: 'x' });
    expect(result.ok && result.value.email).toBe('a@b.co');
    expect(result.ok && 'rogue' in result.value).toBe(false);
  });
});

describe('text helpers', () => {
  it('cleans text', () => {
    expect(cleanText('  a \n\n b\u0007c  ')).toBe('a b c');
    expect(cleanText(42)).toBe('');
  });

  it('normalises names for duplicate detection', () => {
    expect(nameKey('  ZOË   smith ')).toBe(nameKey('zoe Smith'));
    expect(nameKey('Ben')).not.toBe(nameKey('Bena'));
  });

  it('knows which characters the PDF can print', () => {
    expect(isPdfSafe('Café “quotes” – £5 €6')).toBe(true);
    expect(isPdfSafe('🎄')).toBe(false);
    expect(isPdfSafe('日本')).toBe(false);
  });
});
