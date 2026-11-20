import { rampChar } from './atlas';
import { hash2, noise2 } from './noise';
import { EMPTY, FAM, code } from './palette';
import { renderTree, tone } from './treeModel';
import type { Light, TreeScene } from './treeModel';

/** A block of coloured characters (plus any twinkling lights in it). */
export interface CellArt {
  cols: number;
  rows: number;
  glyph: string[];
  colour: Uint8Array;
  lights: Light[];
}

export function blank(cols: number, rows: number): CellArt {
  return { cols, rows, glyph: new Array(cols * rows).fill(''), colour: new Uint8Array(cols * rows).fill(EMPTY), lights: [] };
}

/** Colour keys used when painting hand-drawn art. */
const KEYS: Record<string, [number, number]> = {
  g: [FAM.green, 0.45],
  G: [FAM.green, 0.7],
  r: [FAM.red, 0.6],
  R: [FAM.red, 0.85],
  w: [FAM.white, 0.85],
  W: [FAM.white, 1],
  s: [FAM.snow, 0.8],
  k: [FAM.snow, 0.45],
  d: [FAM.white, 0.4],
  y: [FAM.gold, 0.8],
  Y: [FAM.gold, 1],
  b: [FAM.bark, 0.6],
  B: [FAM.bark, 0.85],
  o: [FAM.warm, 0.85],
  p: [FAM.pink, 0.8],
};

/**
 * Turns hand-drawn lines into CellArt, colouring each character with
 * `paint(char, row, col)` -> a key above, or '*' for a twinkling light.
 */
export function paintArt(lines: string[], paint: (ch: string, row: number, col: number) => string): CellArt {
  const rows = lines.length;
  const cols = Math.max(...lines.map((l) => l.length));
  const art = blank(cols, rows);
  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === ' ') continue;
      const key = paint(ch, row, col);
      const i = row * cols + col;
      if (key === '*') {
        art.glyph[i] = 'o';
        art.colour[i] = code(FAM.warm, 0.5);
        art.lights.push({ col, row, y: 0, hue: 2, phase: hash2(col, row) * 6.3, speed: 0.4 + hash2(row, col) * 0.6 });
        continue;
      }
      const [fam, lum] = KEYS[key] ?? KEYS.w;
      art.glyph[i] = ch;
      art.colour[i] = code(fam, lum);
    }
  });
  return art;
}

/** Copies `src` into `dst` with its top-left at (col, row); empty cells don't overwrite. */
export function stamp(dst: CellArt, src: CellArt | TreeScene, col: number, row: number) {
  for (let r = 0; r < src.rows; r++) {
    const dr = row + r;
    if (dr < 0 || dr >= dst.rows) continue;
    for (let c = 0; c < src.cols; c++) {
      const dc = col + c;
      if (dc < 0 || dc >= dst.cols) continue;
      const si = r * src.cols + c;
      if (src.colour[si] === EMPTY) continue;
      const di = dr * dst.cols + dc;
      dst.glyph[di] = src.glyph[si];
      dst.colour[di] = src.colour[si];
    }
  }
  for (const l of src.lights) {
    const lc = col + l.col;
    const lr = row + l.row;
    if (lc >= 0 && lc < dst.cols && lr >= 0 && lr < dst.rows) dst.lights.push({ ...l, col: lc, row: lr });
  }
}

/** Rolling snow drifts along the bottom `depth` rows of an art block. */
export function snowGround(art: CellArt, depth: number, seed = 5) {
  for (let col = 0; col < art.cols; col++) {
    const surface = art.rows - depth + Math.round(1.2 * Math.sin(col * 0.11 + 1) + 0.8 * Math.sin(col * 0.37));
    for (let row = Math.max(0, surface); row < art.rows; row++) {
      const i = row * art.cols + col;
      if (art.colour[i] !== EMPTY && row > surface) continue;
      const deep = row - surface;
      if (deep === 0) {
        art.glyph[i] = hash2(col, row, seed) > 0.7 ? '~' : '_';
        art.colour[i] = code(FAM.snow, 0.85);
      } else {
        const n = noise2(col * 0.3, row * 0.8, seed);
        art.glyph[i] = hash2(col, row, seed + 1) > 0.97 ? '*' : n > 0.62 ? ':' : n > 0.38 ? '.' : "'";
        art.colour[i] = code(FAM.snow, Math.max(0.25, 0.75 - deep * 0.12));
      }
    }
  }
}

/* ------------------------------------------------------------- the pieces */

/** A snowy cottage with lit windows, a red door and a smoking chimney (built row by row so it lines up). */
function cottageLines(): string[] {
  const W = 45;
  const rows: string[][] = [];
  const row = () => {
    const r = Array.from({ length: W }, () => ' ');
    rows.push(r);
    return r;
  };
  const put = (r: string[], at: number, text: string) => {
    for (let i = 0; i < text.length; i++) if (text[i] !== ' ') r[at + i] = text[i];
  };
  put(row(), 15, '( )');
  put(row(), 14, '(   )');
  put(row(), 15, '( )');
  // Roof: ridge, two rows of snow, two rows of shingles, eaves.
  const ridge = row();
  put(ridge, 9, '_'.repeat(28));
  put(ridge, 15, '[==]');
  for (let k = 1; k <= 5; k++) {
    const r = row();
    const left = 9 - k;
    const right = 36 + k;
    const fill = k <= 2 ? ':' : k <= 4 ? '\\' : '_';
    for (let c = left + 1; c < right; c++) r[c] = fill;
    r[left] = '/';
    r[right] = '\\';
    if (k <= 1) put(r, 15, '[==]');
  }
  // Walls with two windows and a door.
  const window = ['_________', '|###|###|', '|###|###|', '|---+---|', '|###|###|', '|___|___|'];
  const door = ['________', '|  __  |', '| |  | |', '| |  | |', '| |  | |', '| |o | |', '| |  | |', '|_|__|_|'];
  for (let k = 0; k < 8; k++) {
    const r = row();
    r[5] = '|';
    r[40] = '|';
    if (k === 7) for (let c = 6; c < 40; c++) r[c] = '_';
    if (k < window.length) {
      put(r, 7, window[k]);
      put(r, 30, window[k]);
    }
    put(r, 19, door[k]);
  }
  return rows.map((r) => r.join(''));
}

export const cottage = () =>
  paintArt(cottageLines(), (ch, row, col) => {
    if (row <= 2) return 'd';
    if (ch === '[' || ch === ']' || ch === '=') return 'r';
    if (row <= 5) return ch === ':' ? 's' : 'w';
    if (row <= 8) return ch === '\\' ? (row === 6 ? 's' : 'r') : 'w';
    if (ch === '#') return 'o';
    if (ch === 'o') return 'Y';
    if (col >= 19 && col <= 26) return 'R';
    return 'B';
  });

const SNOWMAN = [
  '      _____',
  '     |     |',
  '     |_____|',
  '   ===========',
  '     /     \\',
  '    | o   o |',
  '    |   >   |',
  '     \\ \\_/ /',
  '  \\__/~~~~~\\__/',
  '    |~~~|   *  |',
  '   /    *      \\',
  '  |     *       |',
  '   \\____*______/',
  '  /             \\',
  ' |       *       |',
  ' |       *       |',
  '  \\_____________/',
];

export const snowman = () =>
  paintArt(SNOWMAN, (ch, row, col) => {
    if (row <= 3) return row === 3 || (row === 2 && ch === '_') ? (row === 3 ? 'd' : 'r') : 'd';
    if (ch === 'o' || ch === '*') return 'd';
    if (ch === '>') return 'Y';
    if (ch === '~') return 'R';
    if (row === 8 && (col < 4 || col > 10)) return 'b';
    return 'W';
  });

const LAMP = [
  '    .---.',
  '   /|   |\\',
  '   \\| @ |/',
  '    \'---\'',
  '     |=|',
  '     | |',
  '     | |',
  '     | |',
  '     | |',
  '     | |',
  '     | |',
  '    _|_|_',
  '   [_____]',
];

export const lamp = () => paintArt(LAMP, (ch, row) => (ch === '@' ? '*' : row <= 3 ? 'd' : 'k'));

const PRESENTS = [
  '  _\\/_         ',
  ' [_||_]   .==. ',
  ' [_||_]  [_##_]',
  ' [_||_]  [_##_]',
];

export const presents = () => paintArt(PRESENTS, (ch, _row, col) => (col < 8 ? (ch === '|' || ch === '\\' || ch === '/' ? 'w' : 'R') : ch === '#' || ch === '=' ? 'R' : 'W'));

const SLEIGH = [
  " \\\\   //      \\\\   //",
  "  \\\\_//        \\\\_//                        .--.",
  "  (o o)___     (o o)___      _____________   |oo|",
  "   \\@/    \\     \\_/    \\    /             \\__/  \\__",
  "    |  __  |     |  __  |~~/  *  *  *  *  *  \\  ~~~  \\",
  "    |_|  |_|     |_|  |_|  \\_______________/_______/",
  "   /_/  /_/     /_/  /_/   _/______________________\\_",
];

/** Santa's sleigh and two reindeer (Rudolph leads, facing left). */
export const sleigh = () =>
  paintArt(SLEIGH, (ch, row, col) => {
    if (col < 25) return ch === '@' ? 'R' : ch === 'o' ? 'd' : row <= 1 ? 'b' : 'B';
    if (col < 28) return 'k';
    if (ch === '*') return 'Y';
    if (row >= 6) return 'y';
    if (row <= 3 && col >= 43) return ch === 'o' ? 'd' : 'W';
    return 'R';
  });

/** A glossy bauble on a string: shaded sphere with a highlight, gold cap and hook. */
export function bauble(radiusRows: number, aspect: number, fam: number, ramp: string, stringRows: number): CellArt {
  const rCols = radiusRows * aspect;
  const cols = Math.ceil(rCols * 2) + 3;
  const rows = stringRows + 2 + Math.ceil(radiusRows * 2) + 1;
  const art = blank(cols, rows);
  const cx = Math.floor(cols / 2);
  for (let r = 0; r < stringRows; r++) {
    art.glyph[r * cols + cx] = r % 3 === 2 ? ':' : '|';
    art.colour[r * cols + cx] = code(FAM.gold, 0.35 + 0.3 * (r / stringRows));
  }
  const capRow = stringRows;
  for (let c = cx - 1; c <= cx + 1; c++) {
    art.glyph[capRow * cols + c] = c === cx ? '=' : c < cx ? '[' : ']';
    art.colour[capRow * cols + c] = code(FAM.gold, 0.75);
  }
  const cy = capRow + 1 + radiusRows;
  for (let row = capRow + 1; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nx = (col - cx) / rCols;
      const ny = (row + 0.5 - cy) / radiusRows;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const diff = Math.max(0, -0.45 * nx - 0.55 * ny + 0.7 * nz);
      const spec = Math.pow(Math.max(0, -0.24 * nx - 0.3 * ny + 0.92 * nz), 22);
      const lum = tone(0.12 + 0.75 * diff + 0.9 * spec);
      const i = row * cols + col;
      art.glyph[i] = r2 > 0.6 && Math.abs(nx) > 0.7 ? (nx < 0 ? '(' : ')') : rampChar(ramp, lum, 0.2, 0.92);
      art.colour[i] = spec > 0.45 ? code(FAM.white, 1) : code(fam, lum);
    }
  }
  return art;
}

/**
 * A snowy village as wide as the screen: little lit trees, a cottage, a
 * snowman, presents and lamp posts on rolling snow. The middle (what phones
 * see) always has the snowman and a tree.
 */
export function village(cols: number, rows: number, aspect: number, ramp: string): CellArt {
  const art = blank(cols, rows);
  const groundDepth = 4;
  const baseline = rows - groundDepth + 1; // pieces stand on the snow
  const tree = (n: number, seed: number) => renderTree({ rows: Math.min(n, rows - 3), aspect, ramp, seed, ground: false });
  const queue = [
    () => tree(30, 11),
    () => cottage(),
    () => tree(22, 4),
    () => lamp(),
    () => tree(27, 8),
    () => presents(),
    () => tree(19, 15),
    () => tree(31, 23),
    () => lamp(),
    () => tree(24, 31),
  ];
  const centre = snowman();
  const place = (piece: CellArt, col: number) => stamp(art, piece, col, baseline - piece.rows);
  const mid = Math.floor(cols / 2);
  place(centre, mid - Math.floor(centre.cols / 2));
  const gift = presents();
  place(gift, mid + Math.ceil(centre.cols / 2) + 1);
  let right = mid + Math.ceil(centre.cols / 2) + gift.cols + 3;
  let left = mid - Math.floor(centre.cols / 2) - 2;
  for (let k = 0; right < cols || left > 0; k++) {
    const piece = queue[k % queue.length]();
    if (k % 2 === 0 && right < cols) {
      place(piece, right);
      right += piece.cols + 2 + (k % 3);
    } else if (left > 0) {
      left -= piece.cols;
      place(piece, left);
      left -= 2 + (k % 3);
    } else {
      place(piece, right);
      right += piece.cols + 2;
    }
    if (k > 60) break;
  }
  snowGround(art, groundDepth);
  return art;
}
