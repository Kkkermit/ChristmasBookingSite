import { memo, useRef } from 'react';
import { gridMetrics, useCanvasLoop } from '../canvas';
import { rng } from '../tree';

const RAIN_CHARS = "*+.:'\"~^/\\|<>{}[]()#%&@=-xXoO0123456789";
const TREE_CHARS = "^^^^*''.,:;";
const GREENS = ['#17733e', '#1f9a52', '#2fc46b', '#7ff0a8'];
const LIGHTS = ['#ff2b46', '#ffffff', '#ffdf7e', '#ff2b46', '#ffffff'];
const ALPHA_LEVELS = [0.2, 0.38, 0.6, 0.9];
/** Rain: head, white trail, red trail. */
const RAIN_STYLES = ['#ffffff', '#ebebf0', '#ff2b46'];
const RAIN_ALPHA = [0.12, 0.26, 0.42, 0.85];
/** Greens (0-3), bark (4), lights (5+). */
const FILLS = [...GREENS, '#b0773c', ...LIGHTS];

interface Drop {
  y: number;
  speed: number;
  length: number;
  wait: number;
  white: boolean;
  trail: string[];
}

interface TreeCell {
  i: number;
  col: number;
  row: number;
  ch: string;
  green: number;
  light: number; // -1 for none, else LIGHTS index
  phase: number;
}

const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

/**
 * Design 3: Matrix-style character rain in red and white. Where it falls
 * through the tree it lights the branches up, so the rain "paints" the tree.
 * Scroll faster and the rain speeds up; further down the page the tree glows
 * brighter.
 */
export const RainTree = memo(function RainTree() {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    cw: 8,
    ch: 16,
    cols: 0,
    rows: 0,
    drops: [] as Drop[],
    cells: [] as TreeCell[],
    inTree: new Int32Array(0),
    glow: new Float32Array(0),
    star: { col: 0, row: 0 },
    boost: 1,
    buckets: Array.from({ length: ALPHA_LEVELS.length * FILLS.length }, () => [] as number[]),
    rain: Array.from({ length: RAIN_STYLES.length * ALPHA_LEVELS.length }, () => [] as number[]),
    base: null as HTMLCanvasElement | null,
    baseAt: -1,
    baseFloor: -1,
  }).current;

  /** Draws tree cells, bucketed by brightness and colour. With onlyGlowing, just the ones rain has lit up. */
  const drawTree = (ctx: CanvasRenderingContext2D, t: number, floor: number, onlyGlowing: boolean) => {
    const { cells, glow, buckets, cw, ch } = state;
    for (const b of buckets) b.length = 0;
    for (let n = 0; n < cells.length; n++) {
      const c = cells[n];
      if (onlyGlowing && (c.light >= 0 || glow[n] < floor + 0.12)) continue;
      let b = onlyGlowing ? glow[n] : floor;
      let key: number;
      if (c.light >= 0) {
        const on = Math.sin(t * 2.4 + c.phase) > -0.2;
        b = on ? 0.9 : 0.22;
        key = 5 + c.light;
      } else if (c.green === -2) {
        key = 4;
      } else {
        key = Math.min(3, c.green + (onlyGlowing && glow[n] > 0.6 ? 1 : 0));
      }
      const level = b > 0.85 ? 3 : b > 0.55 ? 2 : b > 0.32 ? 1 : 0;
      buckets[level * FILLS.length + key].push(n);
    }
    for (let level = 0; level < ALPHA_LEVELS.length; level++) {
      ctx.globalAlpha = ALPHA_LEVELS[level];
      for (let key = 0; key < FILLS.length; key++) {
        const bucket = buckets[level * FILLS.length + key];
        if (!bucket.length) continue;
        ctx.fillStyle = FILLS[key];
        for (const n of bucket) ctx.fillText(cells[n].ch, cells[n].col * cw, cells[n].row * ch);
      }
    }
    ctx.globalAlpha = 1;
  };

  useCanvasLoop(
    ref,
    {
      maxFps: 45,
      setup(f) {
        const { cw, ch } = gridMetrics(f.ctx, f.small ? 12 : 14);
        Object.assign(state, { cw, ch, cols: Math.ceil(f.width / cw), rows: Math.ceil(f.height / ch) });
        const { cols, rows } = state;

        // The tree silhouette, in grid cells.
        const rand = rng(7);
        const treeRows = Math.floor(Math.min(rows * 0.7, (cols * cw * 1.25) / ch));
        const top = Math.round(rows * 0.54 - treeRows * 0.5);
        const baseR = ((treeRows * ch) / cw) * 0.36;
        const cx = Math.floor(cols / 2);
        state.inTree = new Int32Array(cols * rows).fill(-1);
        state.cells = [];
        const add = (col: number, row: number, chr: string, green: number, light = -1) => {
          if (col < 0 || row < 0 || col >= cols || row >= rows) return;
          const i = row * cols + col;
          state.inTree[i] = state.cells.length;
          state.cells.push({ i, col, row, ch: chr, green, light, phase: rand() * Math.PI * 2 });
        };
        for (let r = 0; r < treeRows; r++) {
          const h = r / treeRows;
          const half = Math.round(baseR * (0.06 + 0.94 * h) * (0.72 + 0.28 * ((h * 5) % 1)));
          for (let dx = -half; dx <= half; dx++) {
            const edge = dx === -half ? '/' : dx === half ? '\\' : '';
            const isLight = !edge && rand() < 0.075;
            add(cx + dx, top + r, edge || (isLight ? pick('oO@*') : TREE_CHARS[Math.floor(rand() * TREE_CHARS.length)]), Math.floor(rand() * 3), isLight ? Math.floor(rand() * LIGHTS.length) : -1);
          }
        }
        const base = top + treeRows;
        for (let r = 0; r < 2; r++) for (let dx = -1; dx <= 1; dx++) add(cx + dx, base + r, '|', -2);
        state.star = { col: cx, row: top - 1 };
        state.glow = new Float32Array(state.cells.length);

        // The steady tree is drawn to an offscreen layer a few times a second, not every frame.
        state.base ??= document.createElement('canvas');
        state.base.width = f.ctx.canvas.width;
        state.base.height = f.ctx.canvas.height;
        state.baseAt = -1;

        state.drops = Array.from({ length: cols }, () => ({
          y: -Math.random() * rows,
          speed: 0.18 + Math.random() * 0.4,
          length: 6 + Math.floor(Math.random() * (f.small ? 12 : 18)),
          wait: 0,
          white: Math.random() < 0.22,
          trail: Array.from({ length: 30 }, () => pick(RAIN_CHARS)),
        }));
      },
      draw(f) {
        const { ctx, width, height, t, dt, progress, small, reduced } = f;
        const { cw, ch, cols, rows, drops, inTree, glow } = state;
        // Scroll speed makes it pour.
        const target = 1 + Math.min(5, Math.abs(f.velocity) / 450);
        state.boost += (target - state.boost) * 0.12;
        const boost = reduced ? 0 : state.boost;

        ctx.clearRect(0, 0, width, height);
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        const font = `${small ? 12 : 14}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`;
        ctx.font = font;

        // Rain: a bright head and a fading red (or white) trail per column.
        // Positions are bucketed by style and brightness, then drawn in a few batches.
        const rain = state.rain;
        for (const b of rain) b.length = 0;
        const decay = Math.pow(0.95, dt);
        for (let i = 0; i < glow.length; i++) glow[i] *= decay;
        for (let col = 0; col < cols; col++) {
          const d = drops[col];
          if (d.wait > 0) {
            d.wait -= dt * boost;
            continue;
          }
          d.y += d.speed * dt * boost;
          if (Math.random() < 0.08) d.trail[Math.floor(Math.random() * d.trail.length)] = pick(RAIN_CHARS);
          const head = Math.floor(d.y);
          if (head - d.length > rows) {
            d.y = -Math.random() * 8;
            d.wait = Math.random() * 90;
            d.speed = 0.18 + Math.random() * 0.4;
            d.white = Math.random() < 0.22;
            continue;
          }
          for (let k = 0; k < d.length; k++) {
            const row = head - k;
            if (row < 0 || row >= rows) continue;
            const i = row * cols + col;
            const cell = inTree[i];
            if (cell >= 0) {
              // Falling through the tree lights the branch up instead.
              glow[cell] = Math.max(glow[cell], 1 - k / d.length);
              continue;
            }
            const fade = 1 - k / d.length;
            const style = k === 0 ? 0 : d.white ? 1 : 2;
            const level = k === 0 ? 3 : fade > 0.75 ? 2 : fade > 0.4 ? 1 : 0;
            // Pack the cell index and the trail character's position into one number.
            rain[style * ALPHA_LEVELS.length + level].push(i * 32 + ((k + head) % d.trail.length));
          }
        }
        for (let style = 0; style < RAIN_STYLES.length; style++) {
          ctx.fillStyle = RAIN_STYLES[style];
          for (let level = 0; level < ALPHA_LEVELS.length; level++) {
            const bucket = rain[style * ALPHA_LEVELS.length + level];
            if (!bucket.length) continue;
            ctx.globalAlpha = RAIN_ALPHA[level];
            for (const packed of bucket) {
              const i = Math.floor(packed / 32);
              const col = i % cols;
              ctx.fillText(drops[col].trail[packed % 32], col * cw, Math.floor(i / cols) * ch);
            }
          }
        }
        ctx.globalAlpha = 1;

        // The tree: a cached steady layer, plus whatever the rain is lighting up right now.
        const floor = 0.2 + progress * 0.45;
        const base = state.base;
        if (base) {
          if (t - state.baseAt > 0.25 || Math.abs(floor - state.baseFloor) > 0.03) {
            const bctx = base.getContext('2d')!;
            bctx.setTransform(base.width / width, 0, 0, base.height / height, 0, 0);
            bctx.clearRect(0, 0, width, height);
            bctx.font = font;
            bctx.textBaseline = 'top';
            drawTree(bctx, t, floor, false);
            state.baseAt = t;
            state.baseFloor = floor;
          }
          ctx.drawImage(base, 0, 0, width, height);
        }
        drawTree(ctx, t, floor, true);

        // Star.
        const pulse = 0.7 + 0.3 * Math.sin(t * 3);
        ctx.fillStyle = `rgba(255,223,126,${pulse})`;
        ctx.fillText('*', state.star.col * cw, state.star.row * ch);
        ctx.fillStyle = `rgba(255,255,255,${pulse * 0.6})`;
        const ray = Math.floor(t * 2.5) % 2 ? '+' : 'x';
        ctx.fillText(ray, (state.star.col - 1) * cw, (state.star.row - 1) * ch);
        ctx.fillText(ray, (state.star.col + 1) * cw, (state.star.row - 1) * ch);
      },
    },
    [],
  );

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
});
