const COLOURS = ['#f43f5e', '#fcd34d', '#22c55e', '#38bdf8', '#e879f9'];

/** A sagging string of glowing bulbs that chase along the edge of the header. */
export function FairyLights({ count = 28 }: { count?: number }) {
  const bulbs = Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count;
    // Three gentle sags across the width.
    const sag = Math.abs(Math.sin(t * Math.PI * 3)) * 14;
    return { x: t * 100, y: 4 + sag, colour: COLOURS[i % COLOURS.length], delay: (i % COLOURS.length) * 0.36 };
  });
  const wire = bulbs.map((b, i) => `${i === 0 ? 'M' : 'L'} ${b.x} ${b.y}`).join(' ');

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-full h-8 overflow-visible">
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={`M 0 4 ${wire} L 100 4`} fill="none" stroke="#14532d" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      {bulbs.map((b, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2"
          style={{ left: `${b.x}%`, top: `${(b.y / 24) * 100}%` }}
        >
          <span className="mx-auto block h-1 w-1.5 rounded-sm bg-emerald-950" />
          <span
            className="block h-3 w-2 animate-bulb rounded-b-full rounded-t-[40%] sm:h-3.5 sm:w-2.5"
            style={{ backgroundColor: b.colour, color: b.colour, animationDelay: `${b.delay}s` }}
          />
        </span>
      ))}
    </div>
  );
}
