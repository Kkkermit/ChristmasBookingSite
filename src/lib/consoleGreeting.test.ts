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

  it('draws the tree on black with a gold star, green branches and lights', () => {
    const { text, styles } = asciiTreeForConsole();
    expect(text.replace(/%c/g, '')).toContain('*');
    expect(text.split('\n').length).toBeGreaterThan(10);
    expect(styles.every((s) => s.includes('background:#000'))).toBe(true);
    expect(styles.some((s) => s.includes('#ffdf7e'))).toBe(true);
    expect(styles.some((s) => s.includes('#2fc46b'))).toBe(true);
    expect(styles.some((s) => s.includes('#ff2b46'))).toBe(true);
  });
});
