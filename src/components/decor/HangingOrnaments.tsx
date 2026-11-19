const ORNAMENTS = [
  { side: 'left', offset: '2%', length: 70, colour: '#f43f5e', size: 34, delay: 0 },
  { side: 'left', offset: '6%', length: 130, colour: '#fcd34d', size: 26, delay: 0.8 },
  { side: 'right', offset: '3%', length: 100, colour: '#22c55e', size: 32, delay: 0.4 },
  { side: 'right', offset: '7.5%', length: 50, colour: '#38bdf8', size: 24, delay: 1.2 },
] as const;

/** Glossy baubles dangling from the top corners (wide screens only). */
export function HangingOrnaments() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-16 z-10 hidden xl:block">
      {ORNAMENTS.map((o, i) => (
        <div
          key={i}
          className="absolute top-0 animate-sway"
          style={{
            [o.side]: o.offset,
            transformOrigin: 'top center',
            animationDelay: `${o.delay}s`,
            animationDuration: `${3.5 + i * 0.4}s`,
          }}
        >
          <div className="mx-auto w-px bg-gradient-to-b from-gold-300/0 to-gold-300/70" style={{ height: o.length }} />
          <div className="mx-auto -mb-0.5 h-2 w-3 rounded-sm bg-gold-400" />
          <div
            className="rounded-full"
            style={{
              width: o.size,
              height: o.size,
              background: `radial-gradient(circle at 30% 30%, #fff 0%, ${o.colour} 30%, ${o.colour} 60%, #000 140%)`,
              boxShadow: `0 0 24px ${o.colour}66`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
