import { getRamp } from '../components/ascii/engine/atlas';
import { EMPTY, code, cssColour } from '../components/ascii/engine/palette';
import { LIGHT_HUES, renderTree } from '../components/ascii/engine/treeModel';

export const GREETING = 'Hello there Connor, how are you today :)';

export const GREETING_STYLE = [
  'background: #e11d48',
  'color: #ffffff',
  'font-weight: 800',
  'font-size: 18px',
  'padding: 6px 12px',
  'border-radius: 6px',
].join(';');

const BASE = 'background:#000;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:9px;line-height:1.1;font-weight:700';

/** A detailed ASCII tree (the same renderer as the site) as a console format string plus one style per %c. */
export function asciiTreeForConsole(rows = 30): { text: string; styles: string[] } {
  const tree = renderTree({ rows, aspect: 2, ramp: getRamp(), seed: 25 });
  // Lights shine at full brightness in the console.
  for (const l of tree.lights) tree.colour[l.row * tree.cols + l.col] = code(LIGHT_HUES[l.hue].fam, 1);
  let text = '';
  const styles: string[] = [];
  for (let row = 0; row < tree.rows; row++) {
    let current = -1;
    // Pad each line so the black background forms a neat block.
    for (let col = -2; col < tree.cols + 2; col++) {
      const inside = col >= 0 && col < tree.cols;
      const i = row * tree.cols + col;
      const c = inside ? tree.colour[i] : EMPTY;
      if (c !== current) {
        text += '%c';
        styles.push(`${BASE};color:${c === EMPTY ? '#000' : cssColour(c)}`);
        current = c;
      }
      text += inside && c !== EMPTY ? tree.glyph[i] : ' ';
    }
    text += '\n';
  }
  return { text, styles };
}

/** Prints a coloured ASCII tree and the greeting (bold text on a red highlight) to the browser console. */
export function showConsoleGreeting(log: (...args: unknown[]) => void = console.log) {
  const tree = asciiTreeForConsole();
  log(`${tree.text}\n%c${GREETING}`, ...tree.styles, GREETING_STYLE);
}
