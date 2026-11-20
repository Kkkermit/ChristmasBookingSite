import { memo, useEffect, useRef, useState } from 'react';
import type { Placement } from '../Backdrop';
import { AsciiSnow } from '../AsciiSnow';
import { prefersReducedMotion } from '../canvas';
import { getAtlas, getRamp, glowSprite } from '../engine/atlas';
import { drawScene, treeLayout, type TreeLayout } from '../engine/layout';
import { FAM, code } from '../engine/palette';
import { getScroll } from '../engine/scroll';
import { LIGHT_HUES, renderTree, type TreeScene } from '../engine/treeModel';
import { useViewport } from '../engine/viewport';

interface Built {
  layout: TreeLayout;
  scene: TreeScene;
}

/**
 * Design 1: a big, detailed tree drawn in characters - layered branches,
 * snow on the tips, tinsel and bead garlands, shaded baubles, presents.
 * Its fairy lights switch on from the top down as you scroll, twinkling
 * with a soft glow, the star flares at the bottom of the page and the tree
 * drifts gently upwards (parallax). The tree itself is drawn once; only the
 * lights are redrawn, ~30 times a second.
 */
export const ClassicTree = memo(function ClassicTree({ placement }: { placement: Placement }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const lightsRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement>(null);
  const view = useViewport();
  const [built, setBuilt] = useState<Built | null>(null);

  // Build and draw the tree whenever the screen size (or font) changes.
  useEffect(() => {
    const canvas = baseRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const small = view.w < 768;
    const layout = treeLayout(view.w, view.h, view.dpr, { ground: true, small, share: placement.share });
    const scene = renderTree({ rows: layout.rows, aspect: layout.ch / layout.cw, ramp: getRamp(), ground: true, seed: 2026 });
    canvas.width = scene.cols * layout.cw;
    canvas.height = scene.rows * layout.ch;
    drawScene(ctx, scene, getAtlas(layout.fontPx, layout.dpr));
    setBuilt({ layout, scene });
  }, [view, placement.share]);

  // Lights, star glow and parallax. Glows are soft, so they're drawn on a
  // quarter-resolution layer; bulbs are only redrawn when their brightness changes.
  useEffect(() => {
    if (!built) return;
    const glowCanvas = glowRef.current;
    const bulbCanvas = lightsRef.current;
    const wrap = wrapRef.current;
    const gctx = glowCanvas?.getContext('2d');
    const bctx = bulbCanvas?.getContext('2d');
    if (!glowCanvas || !bulbCanvas || !gctx || !bctx || !wrap) return;
    const { layout, scene } = built;
    const { cw, ch, dpr } = layout;
    const pad = ch * 3;
    const GLOW_SCALE = 0.5 / dpr; // glow layer pixels per device pixel
    glowCanvas.width = Math.ceil((scene.cols * cw + pad * 2) * GLOW_SCALE);
    glowCanvas.height = Math.ceil((scene.rows * ch + pad * 2) * GLOW_SCALE);
    bulbCanvas.width = scene.cols * cw;
    bulbCanvas.height = scene.rows * ch;
    bctx.clearRect(0, 0, bulbCanvas.width, bulbCanvas.height);
    const atlas = getAtlas(layout.fontPx, dpr);
    atlas.prewarm('oO', [FAM.red, FAM.white, FAM.gold, FAM.pink]);
    const reduced = prefersReducedMotion();
    const scroll = getScroll();
    const on = new Float32Array(scene.lights.length);
    const shown = new Int16Array(scene.lights.length).fill(-1);
    const sprites = LIGHT_HUES.map((h) => glowSprite(h.rgb));
    const starGlow = glowSprite('255,214,120');
    const start = performance.now();
    let raf = 0;
    let last = 0;
    let lastShift = '';
    // Position on whole device pixels so the characters stay sharp.
    const snap = (v: number) => Math.round(v * dpr) / dpr;
    const parent = wrap.parentElement!;
    wrap.style.left = `${snap(parent.clientWidth * placement.x - layout.widthCss / 2)}px`;
    wrap.style.top = `${snap(parent.clientHeight * placement.y - layout.heightCss / 2)}px`;

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const p = scroll.progress;
      // Parallax: the tree rises a little as you scroll down the page.
      const shift = `translate3d(0, ${snap(-p * parent.clientHeight * 0.045)}px, 0)`;
      if (shift !== lastShift) {
        wrap.style.transform = shift;
        lastShift = shift;
      }
      // A third of the lights are on at the top of the page; all of them by the bottom (or straight away if the page can't scroll).
      const reach = scroll.max < 80 ? 2 : 0.34 + p * 0.85;
      gctx.setTransform(GLOW_SCALE, 0, 0, GLOW_SCALE, 0, 0);
      gctx.clearRect(0, 0, glowCanvas.width / GLOW_SCALE, glowCanvas.height / GLOW_SCALE);
      gctx.globalCompositeOperation = 'lighter';
      const glowR = ch * 2.4;
      scene.lights.forEach((l, i) => {
        const target = reduced || l.y <= reach ? 1 : 0;
        on[i] += (target - on[i]) * (reduced ? 1 : 0.12);
        const twinkle = reduced ? 1 : 0.55 + 0.45 * Math.sin(t * l.speed * 2.2 + l.phase);
        const a = on[i] * twinkle;
        // Bulb: redraw only if its brightness level changed.
        const level = on[i] < 0.05 ? 0 : 1 + Math.round(a * 8);
        if (level !== shown[i]) {
          shown[i] = level;
          const x = l.col * cw;
          const y = l.row * ch;
          bctx.clearRect(x, y, cw, ch);
          if (level > 0) atlas.draw(bctx, level > 6 ? 'O' : 'o', code(LIGHT_HUES[l.hue].fam, 0.35 + (level / 9) * 0.65), x, y);
        }
        if (a < 0.03) return;
        const r = glowR * (0.7 + 0.5 * a);
        gctx.globalAlpha = 0.85 * a;
        gctx.drawImage(sprites[l.hue], pad + (l.col + 0.5) * cw - r, pad + (l.row + 0.5) * ch - r, r * 2, r * 2);
      });
      // The star glows brighter the further down the page you are.
      const sr = ch * (6 + 6 * p) * (0.92 + 0.08 * Math.sin(t * 2.4));
      gctx.globalAlpha = 0.45 + 0.4 * p;
      gctx.drawImage(starGlow, pad + (scene.star.col + 0.5) * cw - sr, pad + (scene.star.row + 0.5) * ch - sr, sr * 2, sr * 2);
      gctx.globalCompositeOperation = 'source-over';
      gctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 31) return;
      last = now;
      draw(now);
    };
    const onScroll = () => requestAnimationFrame(draw);
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };
    draw(performance.now());
    if (reduced) window.addEventListener('scroll', onScroll, { passive: true });
    else raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [built, placement.x, placement.y]);

  const w = built?.layout.widthCss ?? 0;
  const h = built?.layout.heightCss ?? 0;
  const pad = built ? (built.layout.ch * 3) / built.layout.dpr : 0;
  return (
    <>
      <div
        ref={wrapRef}
        className="absolute will-change-transform"
        style={{ width: w, height: h, left: `calc(50% - ${w / 2}px)`, top: `calc(55% - ${h / 2}px)` }}
      >
        <canvas ref={baseRef} className="absolute inset-0 h-full w-full animate-[tree-in_1.4s_cubic-bezier(0.22,1,0.36,1)_both]" />
        <canvas ref={glowRef} className="absolute" style={{ left: -pad, top: -pad, width: w + pad * 2, height: h + pad * 2 }} />
        <canvas ref={lightsRef} className="absolute inset-0 h-full w-full" />
      </div>
      <AsciiSnow />
    </>
  );
});
