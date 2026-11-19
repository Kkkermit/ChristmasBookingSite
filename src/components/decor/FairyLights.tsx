const COLOURS = ['#f43f5e', '#fcd34d', '#22c55e', '#38bdf8', '#e879f9'];
const COUNT = 28;

/**
 * A gently sagging string of glowing bulbs along the bottom edge of the header.
 * It sits inside the header (not hanging below it), so it never covers content.
 * Only opacity animates, which the GPU handles without repainting.
 */
export function FairyLights() {
  const bulbs = Array.from({ length: COUNT }, (_, i) => {
    const t = (i + 0.5) / COUNT;
    const sag = Math.abs(Math.sin(t * Math.PI * 3)) * 6; // three gentle swoops
    return { x: t * 100, y: 2 + sag, colour: COLOURS[i % COLOURS.length], delay: (i % COLOURS.length) * 0.36 };
  });
  const wire = bulbs.map((b, i) => `${i === 0 ? 'M' : 'L'} ${b.x} ${b.y}`).join(' ');

  return (
    <div aria-hidden="true" className="pointer-events-none relative h-8 overflow-hidden">
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={`M 0 2 ${wire} L 100 2`} fill="none" stroke="#166534" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      {bulbs.map((b, i) => (
        <span
          key={i}
          // Half the bulbs on phones so they aren't crowded.
          className={`absolute -translate-x-1/2 ${i % 2 ? 'hidden sm:block' : ''}`}
          style={{ left: `${b.x}%`, top: `${(b.y / 24) * 100}%` }}
        >
          <span className="mx-auto block h-1 w-1.5 rounded-sm bg-emerald-950" />
          <span
            className="block h-3 w-2 animate-bulb rounded-b-full rounded-t-[40%] sm:h-3.5 sm:w-2.5"
            style={{ backgroundColor: b.colour, boxShadow: `0 0 8px 2px ${b.colour}aa`, animationDelay: `${b.delay}s` }}
          />
        </span>
      ))}
    </div>
  );
}
