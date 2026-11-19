// Positions are fractions of the empty gutter beside the centred 72rem content
// column, so the ornaments are mirrored left/right and never overlap content.
const GUTTER = '((100vw - 72rem) / 2)';

const ORNAMENTS = [
  { at: 0.28, length: 70, colour: '#f43f5e', size: 32, delay: 0 },
  { at: 0.64, length: 125, colour: '#fcd34d', size: 26, delay: 0.8 },
] as const;

function Ornament({ side, at, length, colour, size, delay }: { side: 'left' | 'right' } & (typeof ORNAMENTS)[number]) {
  return (
    <div
      className="absolute top-0 animate-sway"
      style={{
        [side]: `calc(${GUTTER} * ${at} - ${size / 2}px)`,
        transformOrigin: 'top center',
        animationDelay: `${delay}s`,
        animationDuration: `${3.6 + at}s`,
      }}
    >
      <div className="mx-auto w-px bg-gradient-to-b from-gold-300/0 to-gold-300/70" style={{ height: length }} />
      <div className="mx-auto -mb-0.5 h-2 w-3 rounded-sm bg-gold-400" />
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 30% 30%, #fff 0%, ${colour} 30%, ${colour} 60%, #000 140%)`,
          boxShadow: `0 0 24px ${colour}66`,
        }}
      />
    </div>
  );
}

/** Glossy baubles dangling into the empty side margins (only on screens wide enough to have them). */
export function HangingOrnaments() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-24 z-10 hidden min-[1400px]:block">
      {ORNAMENTS.map((o) => (
        <Ornament key={`l${o.at}`} side="left" {...o} />
      ))}
      {ORNAMENTS.map((o) => (
        <Ornament key={`r${o.at}`} side="right" {...o} />
      ))}
    </div>
  );
}
