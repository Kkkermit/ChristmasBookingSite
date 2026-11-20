/**
 * Generates ASCII Christmas trees (text + a colour mask of the same shape).
 * Used for the big backdrop tree, the login tree, the logo and the console.
 *
 * Mask keys (see palette.ts): g/G/l greens, * twinkling light, y star,
 * r/w garland, b bark, P/p presents, k dim snow.
 */

export interface AsciiArt {
  lines: string[];
  mask: string[];
}

export interface TreeLight {
  row: number;
  col: number;
  /** 0 at the top of the tree, 1 at the bottom. */
  y: number;
}

export interface GeneratedTree extends AsciiArt {
  lights: TreeLight[];
  width: number;
  height: number;
}

interface TreeOptions {
  /** Rows in each layer of branches, top to bottom. */
  tiers: number[];
  /** Half-width each layer starts at. */
  starts: number[];
  /** Extra half-width per row. */
  slope: number;
  star?: 'small' | 'big';
  trunk?: { width: number; height: number };
  lightDensity?: number;
  garlands?: number;
  presents?: boolean;
  ground?: boolean;
  seed?: number;
}

/** Small deterministic PRNG, so a tree looks the same on every load. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

const FILL = ['^', '^', '^', '^', '^', '.', "'", ',', '.', "'"];
const LIGHTS = ['o', 'O', '@', '*', 'o', '0'];

export function buildTree(opts: TreeOptions): GeneratedTree {
  const rand = rng(opts.seed ?? 7);
  const halves: number[] = [];
  opts.tiers.forEach((rows, t) => {
    for (let r = 0; r < rows; r++) halves.push(Math.round(opts.starts[t] + r * opts.slope));
  });
  const maxHalf = Math.max(...halves);
  const presentsWidth = opts.presents ? 9 : 0;
  const margin = Math.max(1, presentsWidth - (maxHalf - 4));
  const centre = maxHalf + margin;
  const width = centre * 2 + 1;

  const lines: string[][] = [];
  const mask: string[][] = [];
  const blank = () => Array.from({ length: width }, () => ' ');
  const push = () => {
    lines.push(blank());
    mask.push(blank());
    return lines.length - 1;
  };
  const put = (row: number, col: number, ch: string, key: string) => {
    if (col < 0 || col >= width) return;
    lines[row][col] = ch;
    mask[row][col] = ch === ' ' ? ' ' : key;
  };
  const putText = (row: number, col: number, text: string, keys: string) => {
    for (let i = 0; i < text.length; i++) put(row, col + i, text[i], keys[i] ?? keys[keys.length - 1]);
  };

  // Star.
  if (opts.star === 'big') {
    putText(push(), centre - 2, '\\ | /', 'kyyyk');
    putText(push(), centre - 2, '--*--', 'yyYyy');
    putText(push(), centre - 2, '/ | \\', 'kyyyk');
  } else if (opts.star === 'small') {
    put(push(), centre, '*', 'Y');
  }
  const top = lines.length;

  // Branches, with lights and (optionally) candy-cane garlands.
  const lights: TreeLight[] = [];
  const garlandRows = opts.garlands
    ? Array.from({ length: opts.garlands }, (_, i) => Math.round(((i + 0.7) / (opts.garlands! + 0.3)) * halves.length))
    : [];
  halves.forEach((half, i) => {
    const row = push();
    const tierStart = halves[i - 1] !== undefined && halves[i - 1] > half;
    if (half === 0) {
      put(row, centre, '^', 'G');
      return;
    }
    put(row, centre - half, '/', 'g');
    put(row, centre + half, '\\', 'g');
    for (let col = centre - half + 1; col < centre + half; col++) {
      const x = col - centre;
      // Garlands swoop across the tree: a shallow curve through each garland row.
      const onGarland = garlandRows.some((g, gi) => {
        const dir = gi % 2 ? 1 : -1;
        const curve = g + dir * (x / (maxHalf || 1)) * 3.2 + (x * x) / (maxHalf * maxHalf || 1) * 1.6;
        return Math.abs(i - curve) < 0.5;
      });
      if (onGarland) {
        put(row, col, (col & 1) === 0 ? '~' : '-', (Math.floor(col / 2) & 1) === 0 ? 'r' : 'w');
        continue;
      }
      const prevIsLight = lights.length > 0 && lights[lights.length - 1].row === row && lights[lights.length - 1].col === col - 1;
      if (!tierStart && !prevIsLight && rand() < (opts.lightDensity ?? 0.1)) {
        put(row, col, LIGHTS[Math.floor(rand() * LIGHTS.length)], '*');
        lights.push({ row, col, y: (i + 0.5) / halves.length });
        continue;
      }
      const shade = rand();
      put(row, col, FILL[Math.floor(rand() * FILL.length)], shade < 0.45 ? 'g' : shade < 0.85 ? 'G' : 'l');
    }
  });

  // Trunk, presents and a snowy ground line.
  const trunk = opts.trunk ?? { width: 3, height: 1 };
  const trunkLeft = centre - Math.floor(trunk.width / 2);
  for (let r = 0; r < trunk.height; r++) {
    const row = push();
    putText(row, trunkLeft, '|'.repeat(trunk.width), 'b');
  }
  if (opts.presents) {
    const base = lines.length - 2;
    const leftAt = trunkLeft - 9;
    const rightAt = trunkLeft + trunk.width + 2;
    if (base >= top) {
      putText(base, leftAt, ' _\\/_ ', ' wwww ');
      putText(base, rightAt + 1, '_||_', 'PPPP');
    }
    const last = lines.length - 1;
    putText(last, leftAt, '[_||_]', 'PpppPP');
    putText(last, rightAt, '[_##_]', 'pPrrPp');
  }
  if (opts.ground) {
    const row = push();
    for (let col = 0; col < width; col++) {
      put(row, col, (col * 7) % 5 === 0 ? '.' : (col * 3) % 4 === 0 ? '~' : '_', 'k');
    }
  }

  return {
    lines: lines.map((l) => l.join('')),
    mask: mask.map((m) => m.join('')),
    lights,
    width,
    height: lines.length,
  };
}

/** Five rows - the logo in the header. */
export const LOGO_TREE = buildTree({
  tiers: [4],
  starts: [0],
  slope: 1,
  star: 'small',
  trunk: { width: 3, height: 1 },
  lightDensity: 0.3,
  seed: 12,
});
