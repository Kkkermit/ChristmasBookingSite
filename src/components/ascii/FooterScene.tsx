import { useMemo } from 'react';
import { ArtCanvas } from './ArtCanvas';
import { cellSize, getRamp } from './engine/atlas';
import { village } from './engine/art';
import { useViewport } from './engine/viewport';

/** A snowy ASCII village along the very bottom of the page, as wide as the screen. */
export function FooterScene() {
  const view = useViewport();
  const small = view.w < 768;
  const fontPx = small ? 4.2 : 5;
  const art = useMemo(() => {
    const { cw, ch } = cellSize(fontPx, view.dpr);
    const cols = Math.ceil((view.w * view.dpr) / cw) + 2;
    return village(cols, small ? 30 : 34, ch / cw, getRamp());
    // view.font: rebuild with the measured ramp once the web font is in.
  }, [view.w, view.dpr, view.font, fontPx, small]);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center overflow-hidden bg-gradient-to-t from-black via-black/90 to-transparent pt-8"
    >
      <ArtCanvas art={art} fontPx={fontPx} />
    </div>
  );
}
