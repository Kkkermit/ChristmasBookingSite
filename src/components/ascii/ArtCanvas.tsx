import { memo, useEffect, useRef, useState } from 'react';
import { deviceRatio, onFontsReady, prefersReducedMotion } from './canvas';
import { cellSize, getAtlas, glowSprite } from './engine/atlas';
import type { CellArt } from './engine/art';
import { drawScene } from './engine/layout';
import { code } from './engine/palette';
import { LIGHT_HUES } from './engine/treeModel';

/**
 * Draws a block of coloured ASCII art into a canvas at a small font size,
 * pin-sharp on any screen. Any lights in it twinkle with a soft glow (only
 * while on screen, and not at all with reduced motion).
 */
export const ArtCanvas = memo(function ArtCanvas({
  art,
  fontPx,
  className = '',
  glow = 2.2,
}: {
  art: CellArt;
  fontPx: number;
  className?: string;
  /** Glow radius around each light, in character heights. */
  glow?: number;
}) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const lightsRef = useRef<HTMLCanvasElement>(null);
  const [fontTick, setFontTick] = useState(0);
  useEffect(() => onFontsReady(() => setFontTick((n) => n + 1)), []);
  const dpr = deviceRatio();
  const { cw, ch } = cellSize(fontPx, dpr);
  const pad = Math.ceil(ch * glow);
  const hasLights = art.lights.length > 0;

  useEffect(() => {
    const canvas = baseRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = art.cols * cw;
    canvas.height = art.rows * ch;
    drawScene(ctx, art, getAtlas(fontPx, dpr));
  }, [art, fontPx, dpr, cw, ch, fontTick]);

  useEffect(() => {
    const canvas = lightsRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !hasLights) return;
    canvas.width = art.cols * cw + pad * 2;
    canvas.height = art.rows * ch + pad * 2;
    const atlas = getAtlas(fontPx, dpr);
    atlas.prewarm('oO', LIGHT_HUES.map((h) => h.fam));
    const reduced = prefersReducedMotion();
    const start = performance.now();
    let visible = true;
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';
      for (const l of art.lights) {
        const a = reduced ? 1 : 0.5 + 0.5 * Math.sin(t * l.speed * 2.2 + l.phase);
        const r = ch * glow * (0.6 + 0.4 * a);
        ctx.globalAlpha = 0.75 * a;
        ctx.drawImage(glowSprite(LIGHT_HUES[l.hue].rgb), pad + (l.col + 0.5) * cw - r, pad + (l.row + 0.5) * ch - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      for (const l of art.lights) {
        const a = reduced ? 1 : 0.5 + 0.5 * Math.sin(t * l.speed * 2.2 + l.phase);
        atlas.draw(ctx, a > 0.75 ? 'O' : 'o', code(LIGHT_HUES[l.hue].fam, 0.45 + 0.55 * a), pad + l.col * cw, pad + l.row * ch);
      }
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 40) return;
      last = now;
      draw(now);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop);
    };
    draw(performance.now());
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            run();
          })
        : null;
    io?.observe(canvas);
    document.addEventListener('visibilitychange', run);
    run();
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener('visibilitychange', run);
    };
  }, [art, fontPx, dpr, cw, ch, pad, glow, hasLights, fontTick]);

  const w = (art.cols * cw) / dpr;
  const h = (art.rows * ch) / dpr;
  return (
    <span aria-hidden="true" className={`relative inline-block shrink-0 ${className}`} style={{ width: w, height: h }}>
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" />
      {hasLights && <canvas ref={lightsRef} className="pointer-events-none absolute" style={{ left: -pad / dpr, top: -pad / dpr, width: w + (pad * 2) / dpr, height: h + (pad * 2) / dpr }} />}
    </span>
  );
});
