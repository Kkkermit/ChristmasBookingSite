import { AnimatePresence, motion } from 'motion/react';
import { timeLeft } from '../lib/format';

function Tile({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-white/15 to-white/5 shadow-inner sm:h-20 sm:w-20">
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/30" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ y: '-100%', opacity: 0, rotateX: 80 }}
            animate={{ y: '0%', opacity: 1, rotateX: 0 }}
            exit={{ y: '100%', opacity: 0, rotateX: -80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="font-display text-2xl tabular-nums text-white sm:text-4xl"
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-white/60 sm:text-xs">{label}</span>
    </div>
  );
}

export function Countdown({ deadline, now }: { deadline: Date; now: Date }) {
  const left = timeLeft(deadline, now);
  return (
    <div className="flex items-start justify-center gap-2 sm:gap-3" role="timer" aria-label={`${left.days} days, ${left.hours} hours and ${left.minutes} minutes left to order`}>
      <Tile value={left.days} label="Days" />
      <Tile value={left.hours} label="Hours" />
      <Tile value={left.minutes} label="Mins" />
      <Tile value={left.seconds} label="Secs" />
    </div>
  );
}
