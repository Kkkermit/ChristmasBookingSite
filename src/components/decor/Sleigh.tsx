import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

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
            className="absolute top-0 flex items-center text-3xl sm:text-4xl"
            style={{ scaleX: leftToRight ? -1 : 1 }}
            initial={{ left: leftToRight ? '-30%' : '110%', y: 70, rotate: leftToRight ? 6 : -6 }}
            animate={{ left: leftToRight ? '110%' : '-30%', y: [70, 10, 40, 0], rotate: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 9, ease: 'linear' }}
          >
            <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">🦌</span>
            <span className="-ml-1 drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">🦌</span>
            <span className="ml-1">🛷</span>
            <span className="-ml-6 -mt-5 text-2xl sm:text-3xl">🎅</span>
            <span className="ml-1 flex gap-1 text-xs text-gold-300">
              {['✦', '✧', '✦', '·', '✧'].map((s, i) => (
                <span key={i} className="animate-twinkle" style={{ animationDelay: `${i * 0.15}s` }}>
                  {s}
                </span>
              ))}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
