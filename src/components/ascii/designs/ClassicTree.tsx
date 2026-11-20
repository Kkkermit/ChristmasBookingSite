import { memo, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { LIGHT_COLOURS, PALETTE } from '../AsciiArt';
import { scrollProgress } from '../canvas';
import { BIG_TREE } from '../tree';
import { AsciiSnow } from '../AsciiSnow';

const LINE_HEIGHT = 1.05;
const CHAR_WIDTH = 0.6; // JetBrains Mono advance width

/** The tree as React nodes: one span per colour run, lights as their own spans. */
function useTreeNodes() {
  return useMemo(() => {
    const { lines, mask } = BIG_TREE;
    let light = 0;
    return lines.map((line, row) => {
      const parts: ReactNode[] = [];
      let run = '';
      let key = '';
      const flush = (i: number) => {
        if (run) parts.push(PALETTE[key] ? <span key={i} className={PALETTE[key]}>{run}</span> : run);
        run = '';
      };
      for (let i = 0; i < line.length; i++) {
        const k = mask[row][i] === ' ' ? '' : mask[row][i];
        if (k === '*') {
          flush(i);
          const n = light++;
          const y = BIG_TREE.lights[n]?.y ?? row / lines.length;
          parts.push(
            <span key={`l${i}`} className="tree-light" data-y={y.toFixed(3)}>
              <span
                className={`inline-block ${LIGHT_COLOURS[n % LIGHT_COLOURS.length]}`}
                style={{ animationDelay: `${((n * 0.41) % 2.4).toFixed(2)}s`, animationDuration: `${1.8 + (n % 5) * 0.35}s` }}
              >
                {line[i]}
              </span>
            </span>,
          );
          continue;
        }
        if (k !== key) {
          flush(i);
          key = k;
        }
        run += line[i];
      }
      flush(line.length);
      return (
        <span key={row} className="block animate-rise" style={{ animationDelay: `${row * 28}ms` }}>
          {parts}
        </span>
      );
    });
  }, []);
}

/**
 * Design 1: a big hand-typed tree. The lights switch on from the top down as
 * you scroll, the star flares up at the bottom of the page, and the whole
 * tree drifts and grows slightly (parallax). Only classes and a transform
 * change on scroll, so it stays smooth on phones.
 */
export const ClassicTree = memo(function ClassicTree() {
  const treeRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLDivElement>(null);
  const nodes = useTreeNodes();

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;
    const lights = Array.from(tree.querySelectorAll<HTMLElement>('[data-y]')).map((el) => ({ el, y: Number(el.dataset.y), on: false }));
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = scrollProgress();
      // A few lights are on at the top of the page; all are on by the bottom.
      const reach = 0.18 + p * 1.0;
      for (const light of lights) {
        const on = light.y <= reach;
        if (on !== light.on) {
          light.on = on;
          light.el.classList.toggle('on', on);
        }
      }
      tree.style.transform = `translate3d(-50%, calc(-50% - ${(p * 5).toFixed(2)}vh), 0) scale(${(1 + p * 0.07).toFixed(4)})`;
      starRef.current?.classList.toggle('opacity-100', p > 0.92);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const cols = BIG_TREE.width;
  const rows = BIG_TREE.height;
  // As big as fits: ~84% of the screen height, never wider than the screen.
  const fontSize = `min(calc(84vh / ${(rows * LINE_HEIGHT).toFixed(2)}), calc(96vw / ${(cols * CHAR_WIDTH).toFixed(2)}))`;

  return (
    <>
      <div
        ref={treeRef}
        className="absolute left-1/2 top-[52%] will-change-transform"
        style={{ transform: 'translate3d(-50%, -50%, 0)', transformOrigin: '50% 60%', fontSize }}
      >
        {/* Star flare when you reach the bottom of the page. */}
        <div
          ref={starRef}
          className="absolute left-1/2 top-0 h-[6em] w-[14em] -translate-x-1/2 -translate-y-[1.6em] rounded-full opacity-0 transition-opacity duration-700"
          style={{ background: 'radial-gradient(closest-side, rgba(255,223,126,0.35), rgba(255,223,126,0))' }}
        />
        <pre className="ascii relative m-0 opacity-60" style={{ lineHeight: LINE_HEIGHT }}>
          {nodes}
        </pre>
      </div>
      <AsciiSnow />
    </>
  );
});
