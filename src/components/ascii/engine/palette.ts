/**
 * Colour families for the procedural ASCII art. A cell colour is a one-byte
 * code: family * 16 + brightness level (0-15), so brightening or dimming a
 * cell is just arithmetic.
 */
export const FAM = { green: 0, red: 1, white: 2, gold: 3, bark: 4, snow: 5, pink: 6, warm: 7 } as const;
export const ALL_FAMILIES = [0, 1, 2, 3, 4, 5, 6, 7] as const;
export type Family = (typeof FAM)[keyof typeof FAM];
export const LEVELS = 16;
export const EMPTY = 255;

const STOPS: string[][] = [
  ['#020d06', '#06301a', '#0f5a2c', '#1c8540', '#2fae5c', '#68d88f', '#c2f5d3'], // green
  ['#1c0105', '#5c0613', '#a80d25', '#ff2b46', '#ff6b7e', '#ffbcc5', '#ffffff'], // red
  ['#111114', '#3c3c44', '#7c7c88', '#bdbdc8', '#ececf2', '#ffffff'], // white
  ['#1c1102', '#5c3e08', '#a77612', '#f2c04a', '#ffdf7e', '#fff3cc', '#ffffff'], // gold
  ['#0e0703', '#2e190b', '#573418', '#86552b', '#b07a46', '#d6a774'], // bark
  ['#070b12', '#27324a', '#5f6f8f', '#a4b3cf', '#dde6f6', '#ffffff'], // snow
  ['#1c0710', '#6a1d38', '#d24f78', '#ff8fb0', '#ffd3e0', '#ffffff'], // pink
  ['#1a0c02', '#663005', '#c4620c', '#ff9d2e', '#ffd27a', '#fff2cf'], // warm (window light, flames)
];

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function mix(stops: string[], t: number): string {
  const x = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = hex(stops[i]);
  const b = hex(stops[i + 1]);
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Colour string for every code (index = code). */
export const COLOURS: string[] = (() => {
  const out: string[] = new Array(256).fill('rgba(0,0,0,0)');
  STOPS.forEach((stops, fam) => {
    for (let level = 0; level < LEVELS; level++) out[fam * LEVELS + level] = mix(stops, level / (LEVELS - 1));
  });
  return out;
})();

/** Colour code for a family at a brightness in [0, 1]. */
export function code(fam: number, lum: number): number {
  const level = Math.round((lum < 0 ? 0 : lum > 1 ? 1 : lum) * (LEVELS - 1));
  return fam * LEVELS + level;
}

/** Same family, brightness shifted by `steps` levels (clamped). */
export function shift(c: number, steps: number): number {
  if (c === EMPTY) return c;
  const fam = c >> 4;
  const level = Math.max(0, Math.min(LEVELS - 1, (c & 15) + steps));
  return fam * LEVELS + level;
}

/** Plain hex colour for a code (for the console and DOM). */
export function cssColour(c: number): string {
  return COLOURS[c];
}
