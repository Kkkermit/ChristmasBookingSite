import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/** Golden silhouette of Santa's sleigh pulled by two reindeer (faces left). */
function SleighSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 70" className={className} aria-hidden="true" fill="currentColor">
      {[0, 58].map((x) => (
        <g key={x} transform={`translate(${x} 0)`}>
          {/* reindeer body, neck, head */}
          <ellipse cx="30" cy="38" rx="15" ry="7" />
          <path d="M18 35 Q12 26 9 21 L14 19 Q19 27 23 33 Z" />
          <ellipse cx="9" cy="19" rx="6" ry="3.6" transform="rotate(-18 9 19)" />
          {/* antlers */}
          <path d="M11 16 L14 6 M14 6 L18 3 M14 6 L11 2 M13 12 L17 10" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {/* galloping legs + tail */}
          <path
            d="M20 42 L13 52 M24 43 L22 55 M38 42 L44 52 M42 41 L50 47 M44 35 L50 31"
            stroke="currentColor"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* reins */}
      <path d="M44 36 Q80 44 102 36 Q140 30 156 38" stroke="currentColor" strokeWidth="1.2" fill="none" />
      {/* sleigh */}
      <path d="M150 34 H200 Q212 34 214 22 L222 20 Q222 46 200 48 H160 Q150 48 150 40 Z" />
      <path d="M146 56 H206 Q220 56 224 46" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M162 48 V56 M196 48 V56" stroke="currentColor" strokeWidth="2.4" />
      {/* Santa + sack */}
      <circle cx="186" cy="20" r="6" />
      <path d="M180 18 L192 18 L198 8 Z" />
      <circle cx="198" cy="8" r="2.2" />
      <path d="M178 34 Q178 24 186 24 Q194 24 194 34 Z" />
      <path d="M198 34 Q196 18 206 16 Q214 20 210 34 Z" />
    </svg>
  );
}

/** Every so often Santa's sleigh swoops across the sky, trailing sparkles. */
export function Sleigh({ everyMs = 26000 }: { everyMs?: number }) {
  const reduced = useReducedMotion();
  const [flight, setFlight] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const first = setTimeout(() => setFlight((n) => n + 1), 4000);
    const timer = setInterval(() => setFlight((n) => n + 1), everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [everyMs, reduced]);

  const leftToRight = flight % 2 === 1;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-24 z-40 h-40 overflow-hidden">
      <AnimatePresence>
        {flight > 0 && (
          <motion.div
            key={flight}
            className="absolute top-0 flex items-center text-gold-300"
            style={{ scaleX: leftToRight ? -1 : 1 }}
            initial={{ left: leftToRight ? '-30%' : '110%', y: 70, rotate: leftToRight ? 6 : -6 }}
            animate={{ left: leftToRight ? '110%' : '-30%', y: [70, 10, 40, 0], rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 9, ease: 'linear' }}
          >
            <SleighSilhouette className="h-10 w-36 drop-shadow-[0_0_10px_rgba(253,224,71,0.7)] sm:h-14 sm:w-48" />
            <span className="ml-1 flex gap-1.5">
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 animate-twinkle rounded-full bg-gold-300"
                  style={{ animationDelay: `${i * 0.15}s`, opacity: 1 - i * 0.14 }}
                />
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
