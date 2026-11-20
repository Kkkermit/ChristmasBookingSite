import { AsciiArt } from './AsciiArt';
import { ORNAMENT } from './pieces';

// Positions are fractions of the empty gutter beside the centred 72rem content
// column, so the ornaments are mirrored left/right and never overlap content.
const GUTTER = '((100vw - 72rem) / 2)';
const ITEMS = [
  { at: 0.3, length: 5, colour: 'r' as const, delay: 0 },
  { at: 0.66, length: 10, colour: 'w' as const, delay: 0.8 },
];

/** ASCII baubles dangling into the side margins (only on screens wide enough to have them). */
export function HangingOrnaments() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-[5.5rem] z-10 hidden min-[1400px]:block">
      {(['left', 'right'] as const).flatMap((side) =>
        ITEMS.map((o) => {
          const art = ORNAMENT(o.length, o.colour);
          return (
            <div
              key={side + o.at}
              className="absolute top-0 animate-sway"
              style={{ [side]: `calc(${GUTTER} * ${o.at} - 1.5rem)`, transformOrigin: 'top center', animationDelay: `${o.delay}s`, animationDuration: `${3.6 + o.at}s` }}
            >
              <AsciiArt lines={art.lines} mask={art.mask} className="text-[14px]" />
            </div>
          );
        }),
      )}
    </div>
  );
}
