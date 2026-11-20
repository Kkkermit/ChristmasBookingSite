import { useRef } from 'react';
import { useCanvasLoop } from './canvas';
import { createSnow } from './snow';

/** Full-screen ASCII snowfall, behind the page content. */
export function AsciiSnow({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const snow = useRef(createSnow(density)).current;
  useCanvasLoop(ref, {
    // Soft little flakes don't need retina resolution.
    dprCap: 1,
    setup: (f) => snow.resize(f),
    draw: (f) => {
      f.ctx.clearRect(0, 0, f.width, f.height);
      snow.draw(f);
    },
  });
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}
