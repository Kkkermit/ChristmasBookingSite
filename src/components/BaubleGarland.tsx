import { AnimatePresence, motion } from 'motion/react';
import type { Order } from '../../shared/types';
import { colourFor, initials } from '../lib/format';

/**
 * Progress as a garland of baubles - one per expected guest. Each bauble
 * lights up (with the person's initials) as soon as they place their order.
 *
 * Laid out as an even grid (6 per row on phones, 12 on wider screens). Every
 * cell draws its own scallop of garland, so each row is a continuous string
 * and every bauble hangs from it - however many rows there are.
 */
export function BaubleGarland({ orders, partySize }: { orders: Order[]; partySize: number }) {
  const slots = Math.max(partySize, orders.length);
  return (
    <ol className="grid grid-cols-6 gap-y-2 sm:grid-cols-12" aria-label="Who has ordered">
      {Array.from({ length: slots }, (_, i) => {
        const order = orders[i];
        const colour = order ? colourFor(order.name) : undefined;
        return (
          <li key={i} className="relative flex justify-center pt-2.5">
            <svg
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              className="absolute inset-x-0 top-0 h-4 w-full"
              aria-hidden="true"
            >
              <path
                d="M0 2 Q50 22 100 2"
                fill="none"
                stroke="#fcd34d"
                strokeOpacity="0.6"
                strokeWidth="1.25"
                strokeDasharray="3 2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div
              className="flex animate-sway flex-col items-center"
              style={{ transformOrigin: 'top center', animationDelay: `${(i % 6) * 0.3}s`, animationDuration: `${3 + (i % 4) * 0.5}s` }}
            >
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
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[0.7rem] font-extrabold text-white sm:h-9 sm:w-9 lg:h-8 lg:w-8 xl:h-9 xl:w-9"
                    style={{
                      background: `radial-gradient(circle at 32% 28%, #ffffffcc 0%, ${colour} 28%, ${colour} 62%, #00000099 135%)`,
                      boxShadow: `0 0 14px ${colour}aa`,
                    }}
                  >
                    <span aria-hidden="true">{initials(order.name)}</span>
                    <span className="sr-only">{order.name} has ordered</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key={`empty-${i}`}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/30 bg-white/5 text-xs text-white/35 sm:h-9 sm:w-9 lg:h-8 lg:w-8 xl:h-9 xl:w-9"
                  >
                    <span aria-hidden="true">?</span>
                    <span className="sr-only">Waiting for guest {i + 1}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
