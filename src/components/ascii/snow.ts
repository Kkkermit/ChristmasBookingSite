import type { Frame } from './canvas';

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
  ch: string;
  red: boolean;
}

const CHARS = ['.', '.', "'", '*', '+', '*', '.', 'o', '*'];

function makeFlake(width: number, height: number, anywhere: boolean): Flake {
  const depth = Math.random();
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -20 - Math.random() * 60,
    size: 10 + Math.round(depth * depth * 3) * 3,
    speed: 0.25 + depth * 1.05,
    drift: 0.3 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.25 + depth * 0.6,
    ch: CHARS[Math.floor(Math.random() * CHARS.length)],
    red: Math.random() < 0.14,
  };
}

/** ASCII snowfall: falling * . + ' characters with depth and wind gusts. */
export function createSnow(density = 1) {
  let flakes: Flake[] = [];
  return {
    resize(frame: Frame) {
      const target = Math.round(Math.min(150, (frame.width * frame.height) / 11000) * density * (frame.reduced ? 0.5 : 1));
      while (flakes.length < target) flakes.push(makeFlake(frame.width, frame.height, true));
      flakes = flakes.slice(0, target);
    },
    draw(frame: Frame) {
      const { ctx, width, height, t, dt, reduced } = frame;
      const wind = Math.sin(t * 0.23) * 0.6 + Math.sin(t * 0.71) * 0.25;
      // Scrolling pushes the snow a little, like walking through it.
      const push = Math.max(-6, Math.min(6, frame.scrolled * 0.08));
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      let lastSize = 0;
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        if (!reduced) {
          f.y += (f.speed - push * f.speed * 0.4) * dt;
          f.x += (Math.sin(t * f.drift + f.phase) * 0.35 + wind * f.speed) * dt;
        }
        if (f.y > height + 20 || f.y < -80 || f.x < -20 || f.x > width + 20) {
          flakes[i] = makeFlake(width, height, false);
          if (f.x < -20) flakes[i].x = width + 10;
          if (f.y < -80) flakes[i].y = height + 10;
          continue;
        }
        const size = Math.round(f.size);
        if (size !== lastSize) {
          ctx.font = `${size}px "JetBrains Mono", ui-monospace, monospace`;
          lastSize = size;
        }
        ctx.fillStyle = f.red ? `rgba(255,70,95,${f.alpha})` : `rgba(255,255,255,${f.alpha})`;
        ctx.fillText(f.ch, f.x, f.y);
      }
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
    },
  };
}
