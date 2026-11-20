import { memo, useRef } from 'react';
import type { Placement } from '../Backdrop';
import { useCanvasLoop } from '../canvas';
import { getAtlas, getRamp, glowSprite, rampChar, type Atlas } from '../engine/atlas';
import { drawScene, treeLayout, type TreeLayout } from '../engine/layout';
import { random } from '../engine/noise';
import { ALL_FAMILIES, FAM, code } from '../engine/palette';
import { LIGHT_HUES, layerWidth, renderTree, starChar, tone, treeGeometry, type TreeGeometry } from '../engine/treeModel';
import { AsciiSnow } from '../AsciiSnow';

const TURNS = 4.2;
const RIBBON = 0.24; // half-width of the ribbon, radians

interface Spot {
  s: number;
  phi: number;
  kind: number; // hue for lights, family for baubles
  phase: number;
  speed: number;
}

interface State {
  layout: TreeLayout | null;
  g: TreeGeometry | null;
  atlas: Atlas | null;
  ramp: string;
  base: HTMLCanvasElement | null;
  x0: number;
  y0: number;
  rot: number;
  grow: number;
  lights: Spot[];
  baubles: Spot[];
  rowHW: Float32Array;
  rowF: Float32Array;
}

const wrap = (a: number) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

/**
 * Design 2: a 3D cone tree ray-cast into characters every frame - lit
 * needles, a candy-cane ribbon spiralling round it, baubles and lights that
 * turn with it, and a spinning star. Scrolling spins it faster and winds
 * more ribbon on; lights come on as you go. The ground, trunk and presents
 * don't move, so they're drawn once.
 */
export const SpiralTree = memo(function SpiralTree({ placement }: { placement: Placement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef<State>({
    layout: null,
    g: null,
    atlas: null,
    ramp: '',
    base: null,
    x0: 0,
    y0: 0,
    rot: 0.6,
    grow: 0,
    lights: [],
    baubles: [],
    rowHW: new Float32Array(0),
    rowF: new Float32Array(0),
  }).current;

  useCanvasLoop(ref, {
    maxFps: 40,
    smallFps: 24,
    adaptive: true,
    setup(f) {
      const layout = treeLayout(f.width, f.height, f.dpr, { ground: true, small: f.small, share: placement.share, detail: f.small ? 62 : 96 });
      const g = treeGeometry(layout.rows, true);
      st.layout = layout;
      st.g = g;
      st.ramp = getRamp();
      st.atlas = getAtlas(layout.fontPx, layout.dpr);
      st.atlas.prewarm(`${st.ramp}/\\'.()oO@*+#`, ALL_FAMILIES);
      // Static parts: snow, trunk and presents.
      const scene = renderTree({ rows: layout.rows, aspect: layout.ch / layout.cw, ramp: st.ramp, ground: true, foliage: false, star: false, seed: 2026 });
      st.base ??= document.createElement('canvas');
      st.base.width = scene.cols * layout.cw;
      st.base.height = scene.rows * layout.ch;
      const bctx = st.base.getContext('2d')!;
      bctx.clearRect(0, 0, st.base.width, st.base.height);
      drawScene(bctx, scene, st.atlas);
      st.x0 = Math.round(f.width * f.dpr * placement.x - st.base.width / 2);
      st.y0 = Math.round(f.height * f.dpr * placement.y - st.base.height / 2);
      // Branch width per row.
      st.rowHW = new Float32Array(layout.rows);
      st.rowF = new Float32Array(layout.rows).fill(-1);
      for (let row = 0; row < layout.rows; row++) {
        const s = ((row + 0.5) / layout.rows - g.vTop) / g.Hf;
        if (s < 0 || s > 1) continue;
        const { hw, f: lf } = layerWidth(g, s);
        st.rowHW[row] = hw;
        st.rowF[row] = lf;
      }
      if (!st.lights.length) {
        const rand = random(99);
        st.lights = Array.from({ length: 90 }, (_, i) => ({ s: 0.06 + rand() * 0.92, phi: rand() * Math.PI * 2, kind: [0, 1, 2, 0, 1, 3][i % 6], phase: rand() * 6.3, speed: 0.6 + rand() * 1.2 }));
        st.baubles = Array.from({ length: 26 }, (_, i) => ({ s: 0.18 + rand() * 0.78, phi: rand() * Math.PI * 2, kind: [FAM.red, FAM.white, FAM.red, FAM.gold][i % 4], phase: 0, speed: 0 }));
      }
    },
    draw(f) {
      const { ctx, t, dt, progress } = f;
      const { layout, g, atlas, base, ramp } = st;
      if (!layout || !g || !atlas || !base) return;
      const { cw, ch, rows } = layout;
      const R = rows;
      const toCols = (R * ch) / cw;
      // Left edge of the centre column (the scene has an odd number of columns).
      const cx = st.x0 + ((base.width / cw - 1) / 2) * cw;

      st.grow = f.reduced ? 1 : Math.min(1, st.grow + dt * 0.015);
      const grown = 1 - Math.pow(1 - st.grow, 3);
      if (!f.reduced) st.rot += dt * 0.006 + f.scrolled * 0.004;
      const rot = st.rot;

      // Only the tree's box (plus room for the glows) changes, so only that is cleared.
      const pad = ch * 6;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(st.x0 - pad, st.y0 - pad, base.width + pad * 2, base.height + pad * 2);
      ctx.drawImage(base, st.x0, st.y0);

      // Branches, ray-cast cell by cell (only the half facing us is ever visible).
      const reach = Math.min(1, (0.28 + progress * 0.8) * grown);
      const lastRow = Math.floor((g.vTop + g.Hf * grown) * R);
      for (let row = 0; row <= lastRow && row < R; row++) {
        const lf = st.rowF[row];
        if (lf < 0) continue;
        const s = ((row + 0.5) / R - g.vTop) / g.Hf;
        const half = st.rowHW[row] * toCols;
        const y = st.y0 + row * ch;
        const layer = 0.3 + 0.7 * Math.pow(lf, 1.3);
        const ribbonAt = s * TURNS * Math.PI * 2;
        const end = Math.floor(half);
        for (let c = -end; c <= end; c++) {
          const x = c / half;
          if (x > 1 || x < -1) continue;
          const nz = Math.sqrt(1 - x * x);
          const phi = Math.asin(x) + rot;
          const px = cx + c * cw;
          // Candy-cane ribbon.
          const d = wrap(phi - ribbonAt);
          if (s <= reach && Math.abs(d) < RIBBON) {
            const stripe = Math.floor(s * TURNS * 12 + d * 1.5) & 1;
            const lum = (0.3 + 0.65 * nz - 0.15 * x) * (1 - (Math.abs(d) / RIBBON) * 0.4);
            atlas.draw(ctx, rampChar(ramp, lum, 0.3, 1), code(stripe ? FAM.white : FAM.red, lum), px, y);
            continue;
          }
          const needles = 0.5 + 0.3 * Math.sin(phi * 9 + s * 60 + 2 * Math.sin(phi * 3)) + 0.2 * Math.sin(phi * 23 - s * 130);
          const lum = tone((0.2 + 0.62 * nz - 0.3 * x) * layer * (0.48 + 0.52 * needles));
          if (lf > 0.86 && Math.sin(phi * 17 + row * 1.3) > 0.55) {
            atlas.draw(ctx, (row + c) & 1 ? "'" : '.', code(FAM.snow, 0.7 + 0.3 * lum), px, y);
            continue;
          }
          const chr = x < -0.95 ? '/' : x > 0.95 ? '\\' : rampChar(ramp, lum, 0.04, 0.9);
          atlas.draw(ctx, chr, code(FAM.green, 0.08 + lum * 0.9), px, y);
        }
      }

      // Baubles turning with the tree.
      const rb = Math.max(0.017, 2.3 / R);
      for (const b of st.baubles) {
        if (b.s > grown) continue;
        const theta = wrap(b.phi - rot);
        if (Math.abs(theta) > Math.PI / 2 - 0.2) continue;
        const v = g.vTop + b.s * g.Hf;
        const bu = Math.sin(theta) * layerWidth(g, b.s).hw * 0.98;
        const size = rb * (0.8 + 0.2 * Math.cos(theta));
        for (let row = Math.floor((v - size) * R); row <= Math.ceil((v + size) * R); row++) {
          const ny = ((row + 0.5) / R - v) / size;
          for (let c = Math.floor((bu - size) * toCols) - 1; c <= Math.ceil((bu + size) * toCols) + 1; c++) {
            const nx = (c / toCols - bu) / size;
            const r2 = nx * nx + ny * ny;
            if (r2 > 1) continue;
            const nz = Math.sqrt(1 - r2);
            const diff = Math.max(0, -0.45 * nx - 0.55 * ny + 0.7 * nz);
            const spec = Math.pow(Math.max(0, -0.24 * nx - 0.3 * ny + 0.92 * nz), 26);
            const lum = tone(0.12 + 0.75 * diff + 0.9 * spec);
            const chr = r2 > 0.62 && Math.abs(nx) > 0.72 ? (nx < 0 ? '(' : ')') : rampChar(ramp, lum, 0.2, 0.92);
            atlas.draw(ctx, chr, spec > 0.45 ? code(FAM.white, 1) : code(b.kind, lum), cx + c * cw, st.y0 + row * ch);
          }
        }
      }

      // Lights: more come on as you scroll down.
      const lit = Math.floor(st.lights.length * (f.scrollable ? Math.min(1, 0.45 + progress * 0.7) : 1));
      ctx.globalCompositeOperation = 'lighter';
      const glowR = ch * 2.2;
      const bulbs: Array<[number, number, number, number]> = [];
      for (let i = 0; i < lit; i++) {
        const L = st.lights[i];
        if (L.s > grown) continue;
        const theta = wrap(L.phi - rot);
        if (Math.abs(theta) > Math.PI / 2 - 0.1) continue;
        const px = cx + Math.round(Math.sin(theta) * layerWidth(g, L.s).hw * 1.01 * toCols) * cw;
        const py = st.y0 + Math.floor((g.vTop + L.s * g.Hf) * R) * ch;
        const a = (f.reduced ? 1 : 0.55 + 0.45 * Math.sin(t * L.speed * 2.2 + L.phase)) * Math.cos(theta);
        ctx.globalAlpha = 0.8 * a;
        const r = glowR * (0.7 + 0.5 * a);
        ctx.drawImage(glowSprite(LIGHT_HUES[L.kind].rgb), px + cw / 2 - r, py + ch / 2 - r, r * 2, r * 2);
        bulbs.push([px, py, L.kind, a]);
      }
      // Star glow.
      const starY = st.y0 + g.vStar * R * ch;
      const sr = ch * (5 + 3 * progress) * (0.92 + 0.08 * Math.sin(t * 2.4));
      ctx.globalAlpha = 0.5 * grown;
      ctx.drawImage(glowSprite('255,214,120'), cx + cw / 2 - sr, starY - sr, sr * 2, sr * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      for (const [px, py, kind, a] of bulbs) atlas.draw(ctx, a > 0.75 ? 'O' : 'o', code(LIGHT_HUES[kind].fam, 0.5 + 0.5 * a), px, py);

      // The star spins on its own axis.
      if (grown > 0.5) {
        const turn = Math.cos(rot * 0.8);
        const squash = Math.max(0.12, Math.abs(turn));
        for (let row = Math.floor((g.vStar - g.starOuter) * R) - 1; row <= Math.ceil((g.vStar + g.starOuter) * R) + 1; row++) {
          const dv = (row + 0.5) / R - g.vStar;
          for (let c = Math.floor(-g.starOuter * toCols) - 1; c <= Math.ceil(g.starOuter * toCols) + 1; c++) {
            const du = c / toCols / squash;
            const r = Math.hypot(du, dv);
            const a = Math.atan2(du, -dv);
            const rs = g.starInner + (g.starOuter - g.starInner) * Math.pow(Math.abs(Math.cos(2.5 * a)), 2.4);
            if (r > rs) continue;
            const facet = (Math.sin(5 * a) > 0 ? -1 : 1) * (turn > 0 ? 1 : -1);
            const lum = Math.min(1, (0.55 + 0.22 * facet * (r / rs) + 0.35 * (1 - r / rs)) * (0.6 + 0.4 * squash));
            atlas.draw(ctx, starChar(r / g.starInner, facet, lum), r < g.starInner * 0.5 ? code(FAM.white, 1) : code(FAM.gold, lum), cx + c * cw, st.y0 + row * ch);
          }
        }
      }
    },
  }, [placement.x, placement.y, placement.share]);

  return (
    <>
      <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      <AsciiSnow density={0.7} />
    </>
  );
});
