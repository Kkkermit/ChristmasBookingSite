import { AnimatePresence, motion } from 'motion/react';
import type { Order } from '../../shared/types';
import { colourFor, initials } from '../lib/format';

/**
 * Progress as an ASCII garland of baubles - one per expected guest. Each
 * bauble lights up (with the person's initials) as soon as they order.
 *
 * An even grid (6 per row on phones, 12 on wider screens): every cell draws
 * its own piece of the garland, so each row is one continuous string.
 */
export function BaubleGarland({ orders, partySize }: { orders: Order[]; partySize: number }) {
  const slots = Math.max(partySize, orders.length);
  return (
    <ol className="flex flex-wrap justify-center gap-y-2" aria-label="Who has ordered">
      {Array.from({ length: slots }, (_, i) => {
        const order = orders[i];
        const colour = order ? colourFor(order.name) : undefined;
        return (
          <li key={i} className="relative flex w-1/6 flex-col items-center font-mono leading-none sm:w-1/12 lg:w-1/6">
            <span aria-hidden="true" className="block w-full overflow-hidden whitespace-nowrap text-[11px] text-pine-600">
              {i % 2 ? '~-~*~-~-~*~-~' : '-~*~-~-~*~-~-'}
            </span>
            <span
              className="flex animate-sway flex-col items-center"
              style={{ transformOrigin: 'top center', animationDelay: `${(i % 6) * 0.3}s`, animationDuration: `${3 + (i % 4) * 0.5}s` }}
            >
              <span aria-hidden="true" className="text-[11px] text-white/35">
                |
              </span>
              <AnimatePresence mode="wait" initial={false}>
                {order ? (
                  <motion.span
                    key={`filled-${order.id}`}
                    title={order.name}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                    className="flex h-7 items-center whitespace-pre text-[12px] font-extrabold sm:text-[13px]"
                    style={{ color: colour, textShadow: `0 0 10px ${colour}` }}
                  >
                    <span aria-hidden="true">({initials(order.name)})</span>
                    <span className="sr-only">{order.name} has ordered</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key={`empty-${i}`}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-7 items-center whitespace-pre text-[12px] text-white/30 sm:text-[13px]"
                  >
                    <span aria-hidden="true">(..)</span>
                    <span className="sr-only">Waiting for guest {i + 1}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
