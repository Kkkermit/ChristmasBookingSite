export const GREETING = 'Hello there Connor, how are you today :)';

const STYLE = [
  'background: #e11d48',
  'color: #ffffff',
  'font-weight: 800',
  'font-size: 18px',
  'padding: 6px 12px',
  'border-radius: 6px',
].join(';');

/** Prints the greeting (bold text on a red highlight) to the browser console. */
export function showConsoleGreeting(log: (...args: unknown[]) => void = console.log) {
  log(`%c${GREETING}`, STYLE);
}
