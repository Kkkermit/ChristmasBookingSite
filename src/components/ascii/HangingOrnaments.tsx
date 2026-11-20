import { useMemo } from 'react';
import { ArtCanvas } from './ArtCanvas';
import { cellSize, getRamp } from './engine/atlas';
import { bauble } from './engine/art';
import { FAM } from './engine/palette';
import { useViewport } from './engine/viewport';

// Positions are fractions of the empty gutter beside the centred 72rem content
// column, so the baubles are mirrored left/right and never overlap content.
const GUTTER = '((100vw - 72rem) / 2)';
const ITEMS = [
  { at: 0.3, string: 9, radius: 3.2, fam: FAM.red, delay: 0 },
  { at: 0.66, string: 18, radius: 2.6, fam: FAM.white, delay: 0.8 },
];
const FONT = 6;

/** Shaded ASCII baubles dangling into the side margins (only on screens wide enough to have them). */
export function HangingOrnaments() {
  const view = useViewport();
  const arts = useMemo(() => {
    const { cw, ch } = cellSize(FONT, view.dpr);
    return ITEMS.map((o) => bauble(o.radius, ch / cw, o.fam, getRamp(), o.string));
  }, [view.dpr, view.font]);
  if (view.w < 1400) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-[5.25rem] z-10">
      {(['left', 'right'] as const).flatMap((side) =>
        ITEMS.map((o, i) => (
          <div
            key={side + o.at}
            className="absolute top-0 animate-sway"
            style={{ [side]: `calc(${GUTTER} * ${o.at} - 1.5rem)`, transformOrigin: 'top center', animationDelay: `${o.delay}s`, animationDuration: `${3.6 + o.at}s` }}
          >
            <ArtCanvas art={arts[i]} fontPx={FONT} />
          </div>
        )),
      )}
    </div>
  );
}
