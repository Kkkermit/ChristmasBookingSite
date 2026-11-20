import { LOGIN_TREE } from '../components/ascii/tree';

export const GREETING = 'Hello there Connor, how are you today :)';

export const GREETING_STYLE = [
  'background: #e11d48',
  'color: #ffffff',
  'font-weight: 800',
  'font-size: 18px',
  'padding: 6px 12px',
  'border-radius: 6px',
].join(';');

const KEY_COLOURS: Record<string, string> = {
  g: '#1f9a52',
  G: '#2fc46b',
  l: '#7ff0a8',
  y: '#ffdf7e',
  Y: '#ffdf7e',
  b: '#b0773c',
  r: '#ff2b46',
  w: '#ffffff',
};
const LIGHTS = ['#ff2b46', '#ffffff', '#ffdf7e'];
const BASE = 'background:#000;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.15;font-weight:700';

/** The ASCII tree as a console format string plus one style per %c. */
export function asciiTreeForConsole(): { text: string; styles: string[] } {
  let text = '';
  const styles: string[] = [];
  let lights = 0;
  LOGIN_TREE.lines.forEach((line, row) => {
    const mask = LOGIN_TREE.mask[row];
    let colour = '';
    // Pad each line so the black background forms a neat block.
    const padded = `  ${line}  `;
    const paddedMask = `  ${mask}  `;
    for (let i = 0; i < padded.length; i++) {
      const key = paddedMask[i];
      const next = key === '*' ? LIGHTS[lights++ % LIGHTS.length] : (KEY_COLOURS[key] ?? '#000');
      if (next !== colour || key === '*') {
        text += '%c';
        styles.push(`${BASE};color:${next}`);
        colour = key === '*' ? '' : next;
      }
      text += padded[i];
    }
    text += '\n';
  });
  return { text, styles };
}

/** Prints a coloured ASCII tree and the greeting (bold text on a red highlight) to the browser console. */
export function showConsoleGreeting(log: (...args: unknown[]) => void = console.log) {
  const tree = asciiTreeForConsole();
  log(`${tree.text}\n%c${GREETING}`, ...tree.styles, GREETING_STYLE);
}
