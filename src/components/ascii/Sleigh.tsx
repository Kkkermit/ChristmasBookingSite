import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { ArtCanvas } from './ArtCanvas';
import { sleigh } from './engine/art';

const FLIGHT_SECONDS = 10;
const TRAIL = ' * . + . * .  +  .';

/**
 * Every so often Santa's ASCII sleigh swoops across the sky behind the page,
 * trailing sparkles. Transform-only, always flies fully off-screen, and is
 * removed from the page once it has gone.
 */
export function Sleigh({ everyMs = 28000 }: { everyMs?: number }) {
  const reduced = useReducedMotion();
  const art = useMemo(() => sleigh(), []);
  const [flight, setFlight] = useState<{ id: number; width: number } | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const launch = () => {
      if (document.hidden) return;
      setCount((n) => n + 1);
      setFlight((f) => f ?? { id: Date.now(), width: window.innerWidth });
    };
    const first = setTimeout(launch, 5000);
    const timer = setInterval(launch, everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [everyMs, reduced]);

  if (!flight) return null;
  const leftToRight = count % 2 === 0;
  // The sleigh + trail is at most ~460px wide; start and finish well beyond the edges.
  const offLeft = -560;
  const offRight = flight.width + 40;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-28 z-[5] h-32 overflow-hidden">
      <motion.div
        key={flight.id}
        className="absolute left-0 top-0 flex items-center will-change-transform"
        initial={{ x: leftToRight ? offLeft : offRight, y: 56, scaleX: leftToRight ? -1 : 1 }}
        animate={{ x: leftToRight ? offRight : offLeft, y: [56, 10, 34, 4] }}
        transition={{ duration: FLIGHT_SECONDS, ease: 'linear', y: { duration: FLIGHT_SECONDS, ease: 'easeInOut' } }}
        onAnimationComplete={() => setFlight(null)}
      >
        <ArtCanvas art={art} fontPx={flight.width < 768 ? 6 : 8} />
        <span className="ml-1 font-mono text-[13px] text-star">
          {TRAIL.split('').map((c, i) => (
            <span key={i} className="inline-block animate-twinkle" style={{ animationDelay: `${(i * 0.12).toFixed(2)}s`, opacity: 1 - i / TRAIL.length }}>
              {c}
            </span>
          ))}
        </span>
      </motion.div>
    </div>
  );
}
