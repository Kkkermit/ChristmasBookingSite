/** Night sky: drifting aurora glows, twinkling stars and (on the login page) a soft moon. */
const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 37.7) % 100,
  top: (i * 19.3) % 62,
  size: 1 + ((i * 7) % 3),
  delay: (i % 9) * 0.4,
  duration: 2 + (i % 5) * 0.6,
}));

// Radial gradients instead of CSS blur filters: same soft glow, but the GPU can
// move them for free (a blurred, animated layer was the single biggest cost on phones).
const GLOWS = [
  { className: '-left-1/4 -top-1/4 h-[80vmax] w-[80vmax]', colour: '22 163 74', alpha: 0.3, delay: '0s' },
  { className: '-right-1/4 top-1/4 h-[70vmax] w-[70vmax]', colour: '225 29 72', alpha: 0.24, delay: '-8s' },
  { className: 'bottom-[-30%] left-1/4 h-[60vmax] w-[60vmax]', colour: '165 243 252', alpha: 0.12, delay: '-15s' },
];

export function Backdrop({ moon = false }: { moon?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0f3326_0%,_#061812_45%,_#030d0a_100%)]" />
      {GLOWS.map((g) => (
        <div
          key={g.delay}
          className={`absolute animate-drift rounded-full will-change-transform ${g.className}`}
          style={{
            background: `radial-gradient(closest-side, rgb(${g.colour} / ${g.alpha}), rgb(${g.colour} / 0))`,
            animationDelay: g.delay,
          }}
        />
      ))}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute animate-twinkle rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
      {moon && (
        // Only where there is empty space beside the centred login card.
        <div className="absolute right-[8%] top-[10%] hidden h-24 w-24 rounded-full bg-gradient-to-br from-white to-gold-300 opacity-80 shadow-[0_0_80px_20px_rgba(253,230,138,0.25)] lg:block">
          <div className="absolute left-[22%] top-[30%] h-4 w-4 rounded-full bg-black/5" />
          <div className="absolute left-[55%] top-[55%] h-3 w-3 rounded-full bg-black/5" />
        </div>
      )}
    </div>
  );
}
