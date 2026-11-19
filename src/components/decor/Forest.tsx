import { ChristmasTree } from './ChristmasTree';

function Snowman({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 110" className={className} aria-hidden="true">
      <ellipse cx="40" cy="86" rx="24" ry="21" fill="#f8fafc" />
      <circle cx="40" cy="52" r="17" fill="#f1f5f9" />
      <circle cx="40" cy="25" r="13" fill="#f8fafc" />
      {/* hat */}
      <rect x="27" y="11" width="26" height="4" rx="1.5" fill="#0f172a" />
      <rect x="31" y="-3" width="18" height="15" rx="2" fill="#0f172a" />
      <rect x="31" y="7" width="18" height="3" fill="#e11d48" />
      {/* face */}
      <circle cx="35" cy="23" r="1.6" fill="#0f172a" />
      <circle cx="45" cy="23" r="1.6" fill="#0f172a" />
      <path d="M40 27 l10 2.5 -10 1.5z" fill="#f97316" />
      <path d="M34 31 q6 4 12 0" stroke="#0f172a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* scarf */}
      <path d="M26 36 q14 6 28 0 l0 5 q-14 6 -28 0z" fill="#e11d48" />
      <rect x="44" y="39" width="6" height="16" rx="2" fill="#be123c" />
      {/* buttons */}
      <circle cx="40" cy="50" r="1.8" fill="#0f172a" />
      <circle cx="40" cy="58" r="1.8" fill="#0f172a" />
      {/* arms - the right one waves */}
      <path d="M24 52 L6 42 M10 44 l-4 -6" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <g className="animate-wave" style={{ transformBox: 'view-box', transformOrigin: '56px 52px' }}>
        <path d="M56 52 L74 40 M70 42 l3 -7" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

function Gift({ className, box, ribbon, delay = 0 }: { className?: string; box: string; ribbon: string; delay?: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={`${className ?? ''} animate-float`}
      style={{ animationDelay: `${delay}s`, animationDuration: '3.2s' }}
      aria-hidden="true"
    >
      <rect x="4" y="14" width="32" height="24" rx="3" fill={box} />
      <rect x="2" y="10" width="36" height="8" rx="2" fill={box} style={{ filter: 'brightness(1.15)' }} />
      <rect x="17" y="10" width="6" height="28" fill={ribbon} />
      <path d="M20 10 C12 0 4 6 14 10 M20 10 C28 0 36 6 26 10" stroke={ribbon} strokeWidth="3" fill="none" />
    </svg>
  );
}

/** Snowy treeline along the very bottom of the page. */
export function Forest() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-56 overflow-hidden sm:h-72">
      {/* back row */}
      <div className="absolute inset-x-0 bottom-10 flex items-end justify-between px-2 opacity-70">
        {Array.from({ length: 9 }, (_, i) => (
          <ChristmasTree
            key={i}
            tone="dark"
            lights={false}
            star={false}
            className={`${i % 2 ? 'h-24 sm:h-36' : 'h-32 sm:h-44'} ${i > 5 ? 'hidden sm:block' : ''}`}
          />
        ))}
      </div>
      {/* front row */}
      <div className="absolute inset-x-0 bottom-4 flex items-end justify-around">
        <ChristmasTree tone="mid" className="h-28 animate-sway sm:h-40" delay={0.2} />
        <div className="flex items-end gap-1">
          <Snowman className="h-24 sm:h-32" />
          <Gift className="h-8 w-8 sm:h-10 sm:w-10" box="#e11d48" ribbon="#fcd34d" />
        </div>
        <ChristmasTree tone="bright" className="h-36 sm:h-52" delay={0.7} />
        <div className="hidden items-end gap-1 sm:flex">
          <Gift className="h-10 w-10" box="#16a34a" ribbon="#f8fafc" delay={0.4} />
          <Gift className="h-7 w-7" box="#38bdf8" ribbon="#e11d48" delay={0.9} />
        </div>
        <ChristmasTree tone="mid" className="hidden h-44 animate-sway sm:block" delay={1.1} />
      </div>
      {/* snow drift */}
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full sm:h-14">
        <path d="M0 40 Q180 10 360 34 T720 30 T1080 36 T1440 26 V80 H0 Z" fill="#f8fafc" />
        <path d="M0 56 Q240 36 480 52 T960 50 T1440 48 V80 H0 Z" fill="#e2e8f0" />
      </svg>
    </div>
  );
}
