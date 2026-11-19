import { useEffect, useRef } from 'react';

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
  /** Larger, closer flakes are drawn as little crystals. */
  crystal: boolean;
  spin: number;
}

function makeFlake(width: number, height: number, anywhere: boolean): Flake {
  const depth = Math.random();
  const r = 0.8 + depth * depth * 3.6;
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -10 - Math.random() * 40,
    r,
    speed: 0.25 + depth * 1.1,
    drift: 0.3 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    opacity: 0.35 + depth * 0.6,
    crystal: r > 3.4,
    spin: (Math.random() - 0.5) * 0.02,
  };
}

function drawCrystal(ctx: CanvasRenderingContext2D, f: Flake, t: number) {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.phase + t * f.spin * 60);
  ctx.strokeStyle = `rgba(255,255,255,${f.opacity})`;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  const len = f.r * 2.2;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, len);
    ctx.moveTo(0, len * 0.55);
    ctx.lineTo(len * 0.28, len * 0.8);
    ctx.moveTo(0, len * 0.55);
    ctx.lineTo(-len * 0.28, len * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

/** Full-screen canvas snowfall with depth, wind gusts and crystal flakes. */
export function Snowfall({ density = 1 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let frame = 0;
    let last = performance.now();

    // Phones: draw at 1x and ~30fps. Soft snowflakes look the same, but the
    // full-screen canvas costs a quarter of the pixels and half the frames.
    const small = () => window.innerWidth < 768;
    const resize = () => {
      const dpr = small() ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(220, (width * height) / 9000) * density * (reduced ? 0.4 : 1));
      while (flakes.length < target) flakes.push(makeFlake(width, height, true));
      flakes = flakes.slice(0, target);
    };

    const render = (now: number) => {
      if (small() && now - last < 30) {
        frame = requestAnimationFrame(render);
        return;
      }
      const dt = Math.min(48, now - last) / 16.67;
      last = now;
      const t = now / 1000;
      const wind = Math.sin(t * 0.23) * 0.6 + Math.sin(t * 0.71) * 0.25;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        if (!reduced) {
          f.y += f.speed * dt;
          f.x += (Math.sin(t * f.drift + f.phase) * 0.35 + wind * f.speed) * dt;
        }
        if (f.y > height + 12 || f.x < -20 || f.x > width + 20) {
          flakes[i] = makeFlake(width, height, false);
          if (f.x < -20) flakes[i].x = width + 10;
          continue;
        }
        if (f.crystal) {
          drawCrystal(ctx, f, t);
        } else {
          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${f.opacity})`;
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduced) frame = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
