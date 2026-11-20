import { memo, useRef } from 'react';
import { gridMetrics, useCanvasLoop } from '../canvas';
import { createSnow } from '../snow';
import { rng } from '../tree';

const COLOURS = [
  '#17733e', // 0 deep green
  '#1f9a52', // 1 green
  '#2fc46b', // 2 bright green
  '#7ff0a8', // 3 highlight
  '#ff2b46', // 4 red
  '#ffffff', // 5 white
  '#ffdf7e', // 6 gold
  '#b0773c', // 7 bark
  'rgba(255,255,255,0.45)', // 8 snow on the ground
  '#ffa3ae', // 9 pink
];
const RAMP = '.:-=+*#%@';
const LIGHT_CHARS = 'oO@*';
const TIERS = 5;
const TURNS = 4.2;

interface Light {
  h: number;
  theta: number;
  colour: number;
  phase: number;
  ch: string;
}

/**
 * Design 2: a 3D cone tree rendered as ASCII, spinning slowly, wrapped in a
 * red and white candy-cane ribbon. Scrolling spins it faster, zooms in a
 * little and winds more of the ribbon on; lights switch on as you go.
 */
export const SpiralTree = memo(function SpiralTree() {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    rot: 0.6,
    intro: 0,
    cw: 8,
    ch: 16,
    cols: 0,
    rows: 0,
    depth: new Float32Array(0),
    glyph: new Uint8Array(0),
    colour: new Uint8Array(0),
    touched: [] as number[],
    lights: [] as Light[],
    snow: createSnow(0.7),
    chars: [] as string[],
    lookup: new Map<string, number>(),
    ramp: [] as number[],
  }).current;

  useCanvasLoop(ref, {
    smallFps: 25,
    setup(f) {
      const { cw, ch } = gridMetrics(f.ctx, f.small ? 12 : 14);
      state.cw = cw;
      state.ch = ch;
      state.cols = Math.ceil(f.width / cw);
      state.rows = Math.ceil(f.height / ch);
      const n = state.cols * state.rows;
      state.depth = new Float32Array(n).fill(-1e9);
      state.glyph = new Uint8Array(n);
      state.colour = new Uint8Array(n);
      state.touched = [];
      // Every glyph the renderer can use, looked up by index.
      state.chars = Array.from(new Set([...RAMP, ...LIGHT_CHARS, '|', '*', '+', 'x', '\\', '/', '-', '.', '=', '#', '~', 'X']));
      state.lookup = new Map(state.chars.map((c, i) => [c, i]));
      state.ramp = Array.from(RAMP, (c) => state.lookup.get(c) ?? 0);
      if (!state.lights.length) {
        const rand = rng(99);
        state.lights = Array.from({ length: 56 }, (_, i) => ({
          h: 0.12 + rand() * 0.86,
          theta: rand() * Math.PI * 2,
          colour: [4, 5, 6, 4, 5, 9][i % 6],
          phase: rand() * Math.PI * 2,
          ch: LIGHT_CHARS[Math.floor(rand() * LIGHT_CHARS.length)],
        }));
      }
      state.snow.resize(f);
    },
    draw(f) {
      const { ctx, width, height, t, dt, progress, small } = f;
      const { cw, ch, cols, rows, depth, glyph, colour, touched, chars } = state;
      const index = (c: string) => state.lookup.get(c) ?? 0;
      const ramp = state.ramp;

      state.intro = f.reduced ? 1 : Math.min(1, state.intro + dt * 0.012);
      const ease = 1 - Math.pow(1 - state.intro, 3);
      if (!f.reduced) state.rot += dt * 0.0065 + f.scrolled * 0.0055;
      const rot = state.rot;

      for (const i of touched) depth[i] = -1e9;
      touched.length = 0;

      const plot = (col: number, row: number, z: number, g: number, c: number) => {
        if (col < 0 || row < 0 || col >= cols || row >= rows) return;
        const i = row * cols + col;
        if (z <= depth[i]) return;
        if (depth[i] === -1e9) touched.push(i);
        depth[i] = z;
        glyph[i] = g;
        colour[i] = c;
      };

      // Tree size: fills most of the screen height, stays inside the width.
      const zoom = 1 + progress * 0.12;
      const treeRows = Math.min(rows * 0.7, (cols * cw * 1.25) / ch) * zoom;
      const baseR = ((treeRows * ch) / cw) * 0.36;
      const top = Math.round(rows * 0.53 - treeRows * 0.5);
      const cx = cols / 2;
      const radiusAt = (h: number) => {
        const local = (h * TIERS) % 1;
        return baseR * (0.06 + 0.94 * h) * (0.72 + 0.28 * local);
      };

      // Foliage: only the half facing us can be seen, so only that half is sampled.
      const grown = Math.max(0.05, ease);
      const lastRow = Math.round(treeRows * grown);
      for (let r = 0; r <= lastRow; r++) {
        const h = r / treeRows;
        const radius = radiusAt(h);
        const row = top + r;
        const steps = Math.max(6, Math.ceil(radius * Math.PI * 1.6));
        for (let s = 0; s <= steps; s++) {
          const psi = (s / steps) * Math.PI; // 0..pi: right edge, front, left edge
          const x = radius * Math.cos(psi);
          const z = radius * Math.sin(psi);
          const theta = psi - rot;
          // Lit from the front-left; the branch texture moves with the rotation.
          const light = 0.25 + 0.55 * Math.sin(psi) + 0.25 * Math.cos(psi + 0.9);
          const texture = 0.18 * Math.sin(theta * 7 + h * 46) + 0.12 * Math.sin(theta * 13 - h * 21);
          const lum = Math.max(0, Math.min(0.999, light + texture));
          const g = ramp[Math.floor(lum * RAMP.length)];
          plot(Math.round(cx + x), row, z, g, lum > 0.8 ? 3 : lum > 0.55 ? 2 : lum > 0.3 ? 1 : 0);
        }
      }

      // Candy-cane ribbon: more of it winds on as you scroll down the page.
      const reach = Math.min(1, (0.3 + progress * 0.75) * ease);
      const ribbonSteps = Math.ceil(treeRows * TURNS * 9);
      for (let s = 0; s <= ribbonSteps; s++) {
        const h = 0.04 + (s / ribbonSteps) * 0.96;
        if (h > reach) break;
        const theta = h * TURNS * Math.PI * 2;
        const psi = theta + rot;
        const z = Math.sin(psi);
        if (z < -0.05) continue;
        const radius = radiusAt(h) * 1.08 + 0.6;
        const stripe = Math.floor(h * TURNS * 14) % 2;
        plot(Math.round(cx + radius * Math.cos(psi)), top + Math.round(h * treeRows), radius * z + 1.5, index(z > 0.6 ? '#' : '='), stripe ? 5 : 4);
      }

      // Lights twinkle; more of them come on as you scroll.
      const lit = Math.floor(state.lights.length * Math.min(1, 0.4 + progress * 0.8));
      for (let i = 0; i < lit; i++) {
        const L = state.lights[i];
        if (L.h > grown) continue;
        const psi = L.theta + rot;
        const z = Math.sin(psi);
        if (z < 0.15) continue;
        const on = Math.sin(t * 2.2 + L.phase) > -0.35;
        const radius = radiusAt(L.h) * 1.02 + 0.3;
        plot(Math.round(cx + radius * Math.cos(psi)), top + Math.round(L.h * treeRows), radius * z + 2, index(on ? L.ch : '.'), on ? L.colour : 8);
      }

      // Star, with rays that flicker between + and x.
      const starRow = top - 1;
      const sparkle = Math.floor(t * 2.5) % 2 === 0;
      plot(Math.round(cx), starRow, 1e6, index('*'), 6);
      if (ease > 0.6) {
        for (const [dx, dy, a, b] of [
          [-1, 0, '-', '='],
          [1, 0, '-', '='],
          [0, -1, '|', '+'],
          [-1, -1, '\\', 'x'],
          [1, -1, '/', 'x'],
        ] as const) {
          plot(Math.round(cx) + dx, starRow + dy, 1e6, index(sparkle ? a : b), sparkle ? 6 : 5);
        }
      }

      // Trunk and a ring of snow orbiting the base.
      const base = top + Math.round(treeRows) + 1;
      for (let r = 0; r < 2; r++) for (let dx = -1; dx <= 1; dx++) plot(Math.round(cx) + dx, base + r, 0, index('|'), 7);
      const ringR = baseR * 1.15;
      const ringSteps = Math.ceil(ringR * 4);
      for (let s = 0; s < ringSteps; s++) {
        const a = (s / ringSteps) * Math.PI * 2 + rot * 0.5;
        const z = Math.sin(a);
        plot(Math.round(cx + ringR * Math.cos(a)), base + 2 + Math.round(z * 1.4), z * ringR - 50, index(s % 3 ? '.' : '*'), z > 0 ? 5 : 8);
      }

      // Paint, one colour at a time.
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = small ? 0.5 : 0.58;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.font = `${small ? 12 : 14}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`;
      for (let c = 0; c < COLOURS.length; c++) {
        let set = false;
        for (const i of touched) {
          if (colour[i] !== c) continue;
          if (!set) {
            ctx.fillStyle = COLOURS[c];
            set = true;
          }
          ctx.fillText(chars[glyph[i]], (i % cols) * cw, Math.floor(i / cols) * ch);
        }
      }
      ctx.globalAlpha = 1;
      state.snow.draw(f);
    },
  });

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
});
