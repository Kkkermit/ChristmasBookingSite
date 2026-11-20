import { memo, useRef } from 'react';
import type { Placement } from '../Backdrop';
import { useCanvasLoop } from '../canvas';
import { getAtlas, getRamp, glowSprite, type Atlas } from '../engine/atlas';
import { drawScene, treeLayout, type TreeLayout } from '../engine/layout';
import { ALL_FAMILIES, EMPTY, FAM, code, shift } from '../engine/palette';
import { LIGHT_HUES, renderTree, type TreeScene } from '../engine/treeModel';

const RAIN_CHARS = "*+.:'\"~^/\\|<>{}[]()#%&@=-xXoO0123456789";
const DIM = 7; // how many brightness levels the resting tree is dimmed by

interface Drop {
  y: number;
  speed: number;
  length: number;
  wait: number;
  white: boolean;
  trail: string[];
}

interface State {
  layout: TreeLayout | null;
  atlas: Atlas | null;
  scene: TreeScene | null;
  cols: number;
  rows: number;
  /** Tree's top-left cell in the screen grid. */
  col0: number;
  row0: number;
  /** Screen cell -> scene cell (or -1). */
  inTree: Int32Array;
  glow: Float32Array;
  active: number[];
  isActive: Uint8Array;
  drops: Drop[];
  base: HTMLCanvasElement | null;
  baseDim: number;
  boost: number;
  lightOn: Float32Array;
}

const pick = () => RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];

/**
 * Design 3: fine Matrix-style character rain in red and white. The detailed
 * tree sits in the rain, dimmed; wherever a drop falls through it, that part
 * of the tree lights up and slowly fades - so the rain "paints" the tree.
 * Scroll faster and it pours; further down the page the tree glows brighter.
 */
export const RainTree = memo(function RainTree({ placement }: { placement: Placement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef<State>({
    layout: null,
    atlas: null,
    scene: null,
    cols: 0,
    rows: 0,
    col0: 0,
    row0: 0,
    inTree: new Int32Array(0),
    glow: new Float32Array(0),
    active: [],
    isActive: new Uint8Array(0),
    drops: [],
    base: null,
    baseDim: -1,
    boost: 1,
    lightOn: new Float32Array(0),
  }).current;

  const baseRef = useRef<HTMLCanvasElement>(null);

  useCanvasLoop(ref, {
    maxFps: 40,
    smallFps: 24,
    adaptive: true,
    setup(f) {
      const layout = treeLayout(f.width, f.height, f.dpr, { ground: true, small: f.small, share: placement.share, detail: f.small ? 70 : 92 });
      const atlas = getAtlas(layout.fontPx, layout.dpr);
      const scene = renderTree({ rows: layout.rows, aspect: layout.ch / layout.cw, ramp: getRamp(), ground: true, seed: 2026 });
      atlas.prewarm(RAIN_CHARS, [FAM.red, FAM.white]);
      atlas.prewarm(`${scene.glyph.join('')}oO`, ALL_FAMILIES);
      const cols = Math.ceil((f.width * f.dpr) / layout.cw);
      const rows = Math.ceil((f.height * f.dpr) / layout.ch);
      const col0 = Math.floor(cols * placement.x - scene.cols / 2);
      const row0 = Math.round(rows * placement.y - scene.rows / 2);
      const inTree = new Int32Array(cols * rows).fill(-1);
      for (let r = 0; r < scene.rows; r++) {
        for (let c = 0; c < scene.cols; c++) {
          const si = r * scene.cols + c;
          const gr = r + row0;
          const gc = c + col0;
          if (scene.colour[si] === EMPTY || gr < 0 || gr >= rows || gc < 0 || gc >= cols) continue;
          inTree[gr * cols + gc] = si;
        }
      }
      Object.assign(st, {
        layout,
        atlas,
        scene,
        cols,
        rows,
        col0,
        row0,
        inTree,
        glow: new Float32Array(scene.cols * scene.rows),
        active: [],
        isActive: new Uint8Array(scene.cols * scene.rows),
        baseDim: -1,
        lightOn: new Float32Array(scene.lights.length),
      });
      // The resting (dimmed) tree lives on its own canvas underneath, redrawn only when its brightness changes.
      st.base = baseRef.current;
      if (st.base) {
        st.base.width = Math.round(f.width * f.dpr);
        st.base.height = Math.round(f.height * f.dpr);
      }
      st.drops = Array.from({ length: cols }, () => ({
        y: -Math.random() * rows,
        speed: 0.22 + Math.random() * 0.5,
        length: 6 + Math.floor(Math.random() * (f.small ? 12 : 22)),
        wait: Math.random() < (f.small ? 0.7 : 0.55) ? Math.random() * 160 : 0,
        white: Math.random() < 0.22,
        trail: Array.from({ length: 32 }, pick),
      }));
    },
    draw(f) {
      const { ctx, t, dt, progress, reduced } = f;
      const { layout, atlas, scene, cols, rows, inTree, glow, drops, base } = st;
      if (!layout || !atlas || !scene || !base) return;
      const { cw, ch, dpr } = layout;
      // Scroll speed makes it pour.
      const target = 1 + Math.min(5, Math.abs(f.velocity) / 450);
      st.boost += (target - st.boost) * 0.12;
      const boost = reduced ? 0 : st.boost;

      // The resting tree (dimmed), redrawn only when its brightness changes with scroll.
      const dim = Math.round(DIM - progress * 4);
      if (dim !== st.baseDim) {
        const bctx = base.getContext('2d')!;
        bctx.clearRect(0, 0, base.width, base.height);
        drawScene(bctx, scene, atlas, st.col0 * cw, st.row0 * ch, dim);
        st.baseDim = dim;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, f.width * dpr, f.height * dpr);

      // Rain: a bright head and a fading red (or white) trail per column.
      const decay = Math.pow(0.955, dt);
      for (let col = 0; col < cols; col++) {
        const d = drops[col];
        if (d.wait > 0) {
          d.wait -= dt * Math.max(1, boost);
          continue;
        }
        d.y += d.speed * dt * boost;
        if (Math.random() < 0.06) d.trail[Math.floor(Math.random() * d.trail.length)] = pick();
        const head = Math.floor(d.y);
        if (head - d.length > rows) {
          d.y = -Math.random() * 10;
          d.wait = Math.random() * 140;
          d.speed = 0.22 + Math.random() * 0.5;
          d.white = Math.random() < 0.22;
          continue;
        }
        for (let k = 0; k < d.length; k++) {
          const row = head - k;
          if (row < 0 || row >= rows) continue;
          const si = inTree[row * cols + col];
          const fade = 1 - k / d.length;
          if (si >= 0) {
            // Falling through the tree lights the branch up instead.
            if (fade > glow[si]) {
              glow[si] = fade;
              if (!st.isActive[si]) {
                st.isActive[si] = 1;
                st.active.push(si);
              }
            }
            continue;
          }
          const colour = k === 0 ? code(FAM.white, 1) : code(d.white ? FAM.white : FAM.red, 0.15 + fade * 0.62);
          atlas.draw(ctx, d.trail[(k + head) & 31], colour, col * cw, row * ch);
        }
      }

      // Tree cells the rain has lit, fading back down.
      const active = st.active;
      for (let n = active.length - 1; n >= 0; n--) {
        const si = active[n];
        glow[si] *= decay;
        if (glow[si] < 0.04) {
          glow[si] = 0;
          st.isActive[si] = 0;
          active[n] = active[active.length - 1];
          active.pop();
          continue;
        }
        const r = Math.floor(si / scene.cols);
        const c = si - r * scene.cols;
        const lit = shift(scene.colour[si], Math.round(-dim * (1 - glow[si]) + glow[si] * 2));
        atlas.draw(ctx, scene.glyph[si], lit, (st.col0 + c) * cw, (st.row0 + r) * ch);
      }

      // Fairy lights and the star.
      ctx.globalCompositeOperation = 'lighter';
      const glowR = ch * 2.2;
      const reach = f.scrollable ? 0.34 + progress * 0.85 : 2;
      scene.lights.forEach((l, i) => {
        st.lightOn[i] += ((l.y <= reach || reduced ? 1 : 0) - st.lightOn[i]) * (reduced ? 1 : 0.1);
        const a = st.lightOn[i] * (reduced ? 1 : 0.55 + 0.45 * Math.sin(t * l.speed * 2.2 + l.phase));
        if (a < 0.03) return;
        const r = glowR * (0.7 + 0.5 * a);
        ctx.globalAlpha = 0.75 * a;
        ctx.drawImage(glowSprite(LIGHT_HUES[l.hue].rgb), (st.col0 + l.col + 0.5) * cw - r, (st.row0 + l.row + 0.5) * ch - r, r * 2, r * 2);
      });
      const sr = ch * (5 + 4 * progress) * (0.9 + 0.1 * Math.sin(t * 3));
      ctx.globalAlpha = 0.55;
      ctx.drawImage(glowSprite('255,214,120'), (st.col0 + scene.star.col + 0.5) * cw - sr, (st.row0 + scene.star.row + 0.5) * ch - sr, sr * 2, sr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      scene.lights.forEach((l, i) => {
        if (st.lightOn[i] < 0.05) return;
        const a = st.lightOn[i] * (reduced ? 1 : 0.55 + 0.45 * Math.sin(t * l.speed * 2.2 + l.phase));
        atlas.draw(ctx, a > 0.75 ? 'O' : 'o', code(LIGHT_HUES[l.hue].fam, 0.4 + 0.6 * a), (st.col0 + l.col) * cw, (st.row0 + l.row) * ch);
      });
    },
  }, [placement.x, placement.y, placement.share]);

  return (
    <>
      <canvas ref={baseRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
    </>
  );
});
