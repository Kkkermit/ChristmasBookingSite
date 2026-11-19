import { AnimatePresence, motion } from 'motion/react';
import type { Order } from '../../shared/types';
import { colourFor, initials } from '../lib/format';

/**
 * Progress as a garland of baubles - one per expected guest. Each bauble
 * lights up (with the person's initials) as soon as they place their order.
 */
export function BaubleGarland({ orders, partySize }: { orders: Order[]; partySize: number }) {
  const slots = Math.max(partySize, orders.length);
  return (
    <div className="relative">
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-5 w-full" aria-hidden="true">
        <path d="M0 1 Q 25 9 50 5 T 100 1" fill="none" stroke="#fcd34d" strokeOpacity="0.55" strokeWidth="0.35" vectorEffect="non-scaling-stroke" strokeDasharray="2 2" />
      </svg>
      <ol className="relative flex flex-wrap justify-center gap-x-1.5 gap-y-3 pt-2 sm:flex-nowrap sm:justify-between sm:gap-1" aria-label="Who has ordered">
        {Array.from({ length: slots }, (_, i) => {
          const order = orders[i];
          const colour = order ? colourFor(order.name) : undefined;
          return (
            <li
              key={i}
              className="flex animate-sway flex-col items-center"
              style={{ transformOrigin: 'top center', animationDelay: `${(i % 6) * 0.3}s`, animationDuration: `${3 + (i % 4) * 0.5}s` }}
            >
              <span className="h-2 w-px bg-gold-300/60 sm:h-3" aria-hidden="true" />
              <span className="h-1.5 w-2.5 rounded-sm bg-gold-400/90" aria-hidden="true" />
              <AnimatePresence mode="wait" initial={false}>
                {order ? (
                  <motion.span
                    key={`filled-${order.id}`}
                    title={order.name}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[0.7rem] font-extrabold text-white sm:h-11 sm:w-11 sm:text-xs"
                    style={{
                      background: `radial-gradient(circle at 32% 28%, #ffffffcc 0%, ${colour} 28%, ${colour} 62%, #00000099 135%)`,
                      boxShadow: `0 0 18px ${colour}aa`,
                    }}
                  >
                    <span className="drop-shadow">{initials(order.name)}</span>
                    <span className="sr-only">{order.name} has ordered</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key={`empty-${i}`}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/30 bg-white/5 text-xs text-white/30 sm:h-11 sm:w-11"
                  >
                    <span aria-hidden="true">?</span>
                    <span className="sr-only">Waiting for guest {i + 1}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
