import { describe, expect, it, vi } from 'vitest';
import { GREETING, asciiTreeForConsole, showConsoleGreeting } from './consoleGreeting';

describe('console greeting', () => {
  it('prints a coloured ASCII tree, then greets Connor in bold text on a red highlight', () => {
    const log = vi.fn();
    showConsoleGreeting(log);
    expect(log).toHaveBeenCalledTimes(1);
    const [format, ...styles] = log.mock.calls[0] as [string, ...string[]];
    expect(GREETING).toBe('Hello there Connor, how are you today :)');
    expect(format.endsWith(`%c${GREETING}`)).toBe(true);
    // One style per %c placeholder, the last one being the greeting's.
    expect(format.match(/%c/g)).toHaveLength(styles.length);
    const greetingStyle = styles[styles.length - 1];
    expect(greetingStyle).toContain('background: #e11d48');
    expect(greetingStyle).toContain('font-weight: 800');
  });

  it('draws the detailed tree on black, in colour', () => {
    const { text, styles } = asciiTreeForConsole();
    expect(text.replace(/%c/g, '')).toContain('*');
    expect(text.split('\n').length).toBeGreaterThan(10);
    expect(styles.every((s) => s.includes('background:#000'))).toBe(true);
    // Greens for the branches, and warm/red tones for the star, lights and baubles.
    expect(styles.some((s) => /color:rgb\((\d+),(\d+),(\d+)\)/.test(s) && Number(s.match(/rgb\((\d+),(\d+)/)![2]) > Number(s.match(/rgb\((\d+)/)![1]) + 40)).toBe(true);
    expect(styles.some((s) => /color:rgb\((2[0-5]\d),/.test(s))).toBe(true);
  });
});
