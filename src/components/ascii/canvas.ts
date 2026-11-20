import { useEffect, type RefObject } from 'react';
import { resetAtlases } from './engine/atlas';
import { getScroll } from './engine/scroll';

export interface Frame {
  ctx: CanvasRenderingContext2D;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
  /** Device pixels per CSS pixel used for the backing store (max 2). */
  dpr: number;
  /** Seconds since start. */
  t: number;
  /** Frame time in 60fps units (1 = 16.7ms), capped so a long pause never jumps. */
  dt: number;
  /** 0 at the top of the page, 1 at the bottom. */
  progress: number;
  /** Smoothed scroll speed in px per second (signed: + is scrolling down). */
  velocity: number;
  /** Pixels scrolled since the previous frame. */
  scrolled: number;
  /** False on short pages that can't scroll (e.g. the login page). */
  scrollable: boolean;
  small: boolean;
  reduced: boolean;
}

interface LoopOptions {
  /** Called on start, on resize and once the web font has loaded. */
  setup?(frame: Frame): void;
  draw(frame: Frame): void;
  /** Frame-rate cap on larger screens (default 60). */
  maxFps?: number;
  /** Frame-rate cap on phones (default 30). */
  smallFps?: number;
  /** Highest pixel ratio to render at (default 2). */
  dprCap?: number;
  /** Drop to a lower pixel ratio if frames take too long to draw (slow devices). */
  adaptive?: boolean;
}

export const isSmallScreen = () => typeof window !== 'undefined' && window.innerWidth < 768;
export const deviceRatio = () => (typeof window === 'undefined' ? 1 : Math.min(2, Math.max(1, window.devicePixelRatio || 1)));
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/** Calls back once the web font is ready (glyph atlases are rebuilt with the real font). */
export function onFontsReady(callback: () => void): () => void {
  let alive = true;
  const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
  if (fonts && fonts.status !== 'loaded') {
    fonts.ready
      .then(() => {
        if (!alive) return;
        resetAtlases();
        callback();
      })
      .catch(() => {});
  }
  return () => {
    alive = false;
  };
}

/**
 * Runs a canvas animation: sizes the canvas to its element (sharp on retina,
 * max 2x), redraws on real size changes only (not the phone URL bar
 * sliding), pauses while the tab is hidden, honours reduced motion (draws
 * once, then only when scrolling) and passes scroll position/speed to every frame.
 */
export function useCanvasLoop(ref: RefObject<HTMLCanvasElement | null>, options: LoopOptions, deps: unknown[] = []) {
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = prefersReducedMotion();
    const scroll = getScroll();
    const start = performance.now();
    let last = start;
    let raf = 0;
    let lastY = scroll.y;
    let velocity = 0;
    const frame: Frame = {
      ctx,
      width: 0,
      height: 0,
      dpr: 1,
      t: 0,
      dt: 1,
      progress: scroll.progress,
      velocity: 0,
      scrolled: 0,
      scrollable: true,
      small: false,
      reduced,
    };

    const paint = (now: number) => {
      const y = scroll.y;
      const elapsed = Math.max(1, now - last);
      frame.scrolled = y - lastY;
      velocity = velocity * 0.85 + ((frame.scrolled / elapsed) * 1000) * 0.15;
      lastY = y;
      frame.velocity = velocity;
      frame.dt = Math.min(3, elapsed / 16.67);
      frame.t = (now - start) / 1000;
      frame.progress = scroll.progress;
      frame.scrollable = scroll.max > 80;
      last = now;
      options.draw(frame);
      // Adaptive quality: judged on the real time between frames (drawing plus the
      // browser compositing the canvas), so it also catches slow graphics.
      if (options.adaptive && quality < steps.length - 1 && !document.hidden) {
        costs.push(elapsed);
        if (costs.length >= 40) {
          const sorted = costs.sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          costs.length = 0;
          const target = 1000 / ((frame.small ? (options.smallFps ?? 30) : (options.maxFps ?? 60)) * fpsScale);
          if (median > target * 1.15 && quality < steps.length - 1) {
            quality++;
            fpsScale = steps[quality].fps;
            if (steps[quality].dpr !== cap) {
              cap = steps[quality].dpr;
              resize(true);
            }
          }
        }
      }
    };

    // Adaptive quality for slow devices: step down pixel ratio, then frame rate.
    const steps = [
      { dpr: options.dprCap ?? 2, fps: 1 },
      { dpr: 1.5, fps: 1 },
      { dpr: 1.5, fps: 0.62 },
      { dpr: 1, fps: 0.62 },
    ].filter((q) => q.dpr <= (options.dprCap ?? 2));
    let quality = 0;
    let cap = steps[0].dpr;
    let fpsScale = 1;
    const costs: number[] = [];
    const resize = (force = false) => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const dpr = Math.min(cap, deviceRatio());
      if (!force && w === frame.width && h === frame.height && dpr === frame.dpr) return;
      frame.small = isSmallScreen();
      frame.width = w;
      frame.height = h;
      frame.dpr = dpr;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      options.setup?.(frame);
      paint(performance.now());
    };

    const minGap = 1000 / (options.maxFps ?? 60) - 2;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const gap = (frame.small ? Math.max(minGap, 1000 / (options.smallFps ?? 30) - 2) : minGap) / fpsScale;
      if (now - last < gap) return;
      paint(now);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    // With reduced motion there is no loop: just redraw when the page scrolls.
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => resize(), 120);
    };

    resize(true);
    const stopFonts = onFontsReady(() => resize(true));
    if (reduced) window.addEventListener('scroll', onScroll, { passive: true });
    else raf = requestAnimationFrame(loop);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stopFonts();
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
