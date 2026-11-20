import { useEffect, type RefObject } from 'react';

export interface Frame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
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
  small: boolean;
  reduced: boolean;
}

interface LoopOptions {
  /** Called on start and on every resize. */
  setup?(frame: Frame): void;
  draw(frame: Frame): void;
  /** Phones run at ~30fps; desktops at full rate unless this caps them. */
  maxFps?: number;
  /** Frame rate on phones (default 30). */
  smallFps?: number;
}

export function scrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

/**
 * Runs a full-screen canvas animation: handles pixel ratio, resizing, the tab
 * being hidden, reduced motion (draws once, then redraws only on scroll) and
 * passes scroll position/speed to every frame.
 */
export function useCanvasLoop(ref: RefObject<HTMLCanvasElement | null>, options: LoopOptions, deps: unknown[] = []) {
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const start = performance.now();
    let last = start;
    let raf = 0;
    let lastY = window.scrollY;
    let velocity = 0;
    const frame: Frame = {
      ctx,
      width: 0,
      height: 0,
      t: 0,
      dt: 1,
      progress: scrollProgress(),
      velocity: 0,
      scrolled: 0,
      small: false,
      reduced,
    };

    const resize = () => {
      frame.small = window.innerWidth < 768;
      const dpr = frame.small ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      frame.width = window.innerWidth;
      frame.height = window.innerHeight;
      canvas.width = Math.floor(frame.width * dpr);
      canvas.height = Math.floor(frame.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      options.setup?.(frame);
      if (reduced) paint(performance.now());
    };

    const minGap = 1000 / (options.maxFps ?? 60) - 2;
    const paint = (now: number) => {
      const y = window.scrollY;
      const elapsed = Math.max(1, now - last);
      frame.scrolled = y - lastY;
      velocity = velocity * 0.85 + ((frame.scrolled / elapsed) * 1000) * 0.15;
      lastY = y;
      frame.velocity = velocity;
      frame.dt = Math.min(3, elapsed / 16.67);
      frame.t = (now - start) / 1000;
      frame.progress = scrollProgress();
      last = now;
      options.draw(frame);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const gap = frame.small ? Math.max(minGap, 1000 / (options.smallFps ?? 30) - 2) : minGap;
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

    resize();
    // Re-measure once the web font has loaded (the character grid depends on it).
    let alive = true;
    document.fonts?.ready.then(() => alive && resize()).catch(() => {});
    if (reduced) {
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Monospace font metrics for a canvas character grid. */
export function gridMetrics(ctx: CanvasRenderingContext2D, fontPx: number) {
  ctx.font = `${fontPx}px "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const cw = ctx.measureText('M').width || fontPx * 0.6;
  const ch = Math.round(fontPx * 1.18);
  return { cw, ch };
}
