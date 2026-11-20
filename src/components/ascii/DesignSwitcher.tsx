import { motion } from 'motion/react';
import { DESIGNS, setDesign, useDesign, type DesignId } from '../../lib/design';
import { useMemo } from 'react';
import { ArtCanvas } from './ArtCanvas';
import type { CellArt } from './engine/art';
import { cellSize, getRamp } from './engine/atlas';
import { random } from './engine/noise';
import { EMPTY, FAM, code, shift } from './engine/palette';
import { renderTree } from './engine/treeModel';
import { useViewport } from './engine/viewport';

/** Compact 1 / 2 / 3 switch (login page corner). */
export function DesignSwitcher({ className = '' }: { className?: string }) {
  const design = useDesign();
  return (
    <div
      role="radiogroup"
      aria-label="Backdrop design"
      className={`flex items-center gap-1 rounded-[3px] border border-white/15 bg-black/80 p-1 font-mono text-xs ${className}`}
    >
      <span aria-hidden="true" className="px-1.5 uppercase tracking-widest text-white/45">
        tree
      </span>
      {DESIGNS.map((d) => {
        const active = design === d.id;
        return (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Backdrop ${d.number}: ${d.name}`}
            title={d.name}
            onClick={() => setDesign(d.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-[2px] font-bold transition-colors ${
              active ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {d.number}
          </button>
        );
      })}
    </div>
  );
}

/** Little live previews of each design, drawn with the same renderer as the backdrops. */
function usePreviews(): Record<DesignId, CellArt> {
  const view = useViewport();
  return useMemo(() => {
    const { cw, ch } = cellSize(PREVIEW_FONT, view.dpr);
    const aspect = ch / cw;
    const ramp = getRamp();
    const classic = renderTree({ rows: 30, aspect, ramp, seed: 2026 });
    // Spiral: the same tree with a red and white ribbon wound round it.
    const spiral = renderTree({ rows: 30, aspect, ramp, seed: 2026, decorations: false });
    for (let r = 0; r < spiral.rows; r++) {
      for (let c = 0; c < spiral.cols; c++) {
        const i = r * spiral.cols + c;
        if (spiral.colour[i] >> 4 !== FAM.green) continue;
        const band = (c - spiral.cols / 2) / aspect + r * 0.8;
        const m = ((band % 5) + 5) % 5;
        if (m < 1.8) {
          spiral.glyph[i] = m < 0.9 ? '=' : '#';
          spiral.colour[i] = code(Math.floor(band / 5) % 2 ? FAM.white : FAM.red, 0.92);
        }
      }
    }
    // Rain: the tree, dimmed, in a shower of red and white characters.
    const rain = renderTree({ rows: 30, aspect, ramp, seed: 2026 });
    const rand = random(3);
    for (let i = 0; i < rain.colour.length; i++) if (rain.colour[i] !== EMPTY) rain.colour[i] = shift(rain.colour[i], -5);
    for (let c = 0; c < rain.cols; c += 2) {
      const head = Math.floor(rand() * rain.rows);
      const len = 4 + Math.floor(rand() * 8);
      for (let k = 0; k < len; k++) {
        const r = head - k;
        if (r < 0) break;
        const i = r * rain.cols + c;
        if (rain.colour[i] !== EMPTY) {
          rain.colour[i] = shift(rain.colour[i], 6);
          continue;
        }
        rain.glyph[i] = '01:|*+'[Math.floor(rand() * 6)];
        rain.colour[i] = k === 0 ? code(FAM.white, 1) : code(rand() < 0.25 ? FAM.white : FAM.red, 0.75 - k * 0.07);
      }
    }
    rain.lights = rain.lights.slice(0, 8);
    return { classic, spiral, rain };
  }, [view.dpr, view.font]);
}

const PREVIEW_FONT = 3.6;

/** The full picker with little previews (Santa's Workshop). */
export function DesignPicker() {
  const design = useDesign();
  const previews = usePreviews();
  return (
    <div role="radiogroup" aria-label="Backdrop design" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {DESIGNS.map((d) => {
        const active = design === d.id;
        return (
          <motion.button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setDesign(d.id)}
            whileTap={{ scale: 0.97 }}
            className={`relative flex items-center gap-4 rounded-[3px] border p-3 text-left transition-colors sm:flex-col sm:items-stretch sm:text-center ${
              active ? 'border-white bg-white/[0.08] shadow-[0_0_24px_-8px_rgba(255,255,255,0.5)]' : 'border-white/15 hover:border-white/40 hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex shrink-0 justify-center rounded-[2px] bg-black px-2 py-2 sm:px-0">
              <ArtCanvas art={previews[d.id]} fontPx={PREVIEW_FONT} glow={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-display text-2xl leading-none sm:justify-center">
                <span aria-hidden="true" className={active ? 'text-holly-500' : 'text-white/40'}>
                  {active ? '(*)' : '( )'}
                </span>
                {d.number}. {d.name}
              </span>
              <span className="mt-1 block text-xs leading-snug text-white/60">{d.blurb}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
