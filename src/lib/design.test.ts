import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN, getDesign, parseDesign, resetDesignForTests, setDesign } from './design';

afterEach(() => {
  resetDesignForTests();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('backdrop design choice', () => {
  it('understands numbers and names', () => {
    expect(parseDesign('1')).toBe('classic');
    expect(parseDesign('2')).toBe('spiral');
    expect(parseDesign(' RAIN ')).toBe('rain');
    expect(parseDesign('7')).toBeNull();
    expect(parseDesign(null)).toBeNull();
  });

  it('defaults to the classic tree', () => {
    expect(getDesign()).toBe(DEFAULT_DESIGN);
    expect(DEFAULT_DESIGN).toBe('classic');
  });

  it('is remembered on this device', () => {
    setDesign('rain');
    expect(window.localStorage.getItem('xmas-backdrop')).toBe('rain');
    resetDesignForTests();
    expect(getDesign()).toBe('rain');
  });

  it('can be picked with ?tree= in the URL', () => {
    window.history.replaceState(null, '', '/?tree=2');
    expect(getDesign()).toBe('spiral');
    expect(window.localStorage.getItem('xmas-backdrop')).toBe('spiral');
  });
});
