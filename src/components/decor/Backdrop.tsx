/** Night sky: drifting aurora blobs, twinkling stars and a soft moon. */
const STARS = Array.from({ length: 46 }, (_, i) => ({
  left: (i * 37.7) % 100,
  top: (i * 19.3) % 62,
  size: 1 + ((i * 7) % 3),
  delay: (i % 9) * 0.4,
  duration: 2 + (i % 5) * 0.6,
}));

export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0f3326_0%,_#061812_45%,_#030d0a_100%)]" />
      <div className="absolute -left-1/4 -top-1/4 h-[70vmax] w-[70vmax] animate-drift rounded-full bg-pine-600/25 blur-[120px]" />
      <div
        className="absolute -right-1/4 top-1/4 h-[60vmax] w-[60vmax] animate-drift rounded-full bg-holly-600/20 blur-[130px]"
        style={{ animationDelay: '-8s' }}
      />
      <div
        className="absolute bottom-[-30%] left-1/4 h-[50vmax] w-[50vmax] animate-drift rounded-full bg-ice-300/10 blur-[120px]"
        style={{ animationDelay: '-15s' }}
      />
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
      <div className="absolute right-[4%] top-[11%] h-11 w-11 rounded-full sm:right-[8%] sm:top-[9%] bg-gradient-to-br from-white to-gold-300 opacity-80 shadow-[0_0_80px_20px_rgba(253,230,138,0.25)] sm:h-24 sm:w-24">
        <div className="absolute left-[22%] top-[30%] h-3 w-3 rounded-full bg-black/5 sm:h-4 sm:w-4" />
        <div className="absolute left-[55%] top-[55%] h-2 w-2 rounded-full bg-black/5 sm:h-3 sm:w-3" />
      </div>
    </div>
  );
}
