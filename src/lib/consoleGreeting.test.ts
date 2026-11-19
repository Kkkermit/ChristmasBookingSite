import { describe, expect, it, vi } from 'vitest';
import { GREETING, showConsoleGreeting } from './consoleGreeting';

describe('console greeting', () => {
  it('greets Connor in bold text on a red highlight', () => {
    const log = vi.fn();
    showConsoleGreeting(log);
    expect(log).toHaveBeenCalledTimes(1);
    const [text, style] = log.mock.calls[0] as [string, string];
    expect(text).toBe(`%c${GREETING}`);
    expect(GREETING).toBe('Hello there Connor, how are you today :)');
    expect(style).toContain('background: #e11d48');
    expect(style).toContain('font-weight: 800');
  });
});
