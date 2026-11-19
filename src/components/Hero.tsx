import { CalendarClock, Lock, MapPin, PoundSterling } from 'lucide-react';
import { motion } from 'motion/react';
import { PRICE_PER_HEAD, RESTAURANT, formatPrice } from '../../shared/menu';
import type { Order, PublicConfig } from '../../shared/types';
import { formatLongDate, sleepsUntilChristmas } from '../lib/format';
import { BaubleGarland } from './BaubleGarland';
import { Countdown } from './Countdown';

const WORDS = ['Christmas', 'Feast'];

export function Hero({ config, orders, now }: { config: PublicConfig; orders: Order[]; now: Date }) {
  const count = orders.length;
  const complete = count >= config.partySize;
  const sleeps = sleepsUntilChristmas(now);
  const remaining = Math.max(0, config.partySize - count);

  return (
    <section id="top" className="relative pt-12 text-center sm:pt-16">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex flex-wrap items-center justify-center gap-2"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/40 bg-gold-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-gold-300">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {RESTAURANT.name}, {RESTAURANT.location}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-white/80">
          <PoundSterling className="h-3.5 w-3.5" aria-hidden="true" />
          {formatPrice(PRICE_PER_HEAD)} pp + 10% service
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-white/80">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          {sleeps === 0 ? "It's Christmas!" : `${sleeps} sleep${sleeps === 1 ? '' : 's'} till Christmas`}
        </span>
      </motion.div>

      <h1 className="mt-5 font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
        {WORDS.map((word, i) => (
          <motion.span
            key={word}
            className="inline-block px-2"
            initial={{ opacity: 0, y: 40, rotate: i ? 6 : -6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, rotate: i ? 2 : -2, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 + i * 0.15 }}
          >
            <span className={i ? 'text-white' : 'text-candy'}>{word}</span>
          </motion.span>
        ))}
        <motion.span
          className="mt-1 block text-3xl text-gold-300 sm:text-5xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.45 }}
        >
          ✦ 2026 ✦
        </motion.span>
      </h1>

      <motion.p
        className="mx-auto mt-5 max-w-xl text-base text-white/75 sm:text-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Pick your starter, main and dessert from the Christmas menu below. Change your mind? Edit or delete your order any time before the deadline.
      </motion.p>

      <motion.div
        className="glass mx-auto mt-8 grid max-w-4xl gap-6 p-5 sm:p-7 md:grid-cols-[auto_1fr] md:items-center md:gap-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 120, damping: 18 }}
      >
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-gold-300">
            {config.ordersOpen ? 'Orders close in' : 'Orders are closed'}
          </p>
          {config.ordersOpen ? (
            <Countdown deadline={new Date(config.deadline)} now={now} />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-gold-300">
              <Lock className="h-8 w-8" aria-hidden="true" />
            </span>
          )}
          <p className="mt-3 text-sm text-white/60">Deadline: {formatLongDate(config.deadline)}</p>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-left text-lg font-bold">
              <span className="font-display text-3xl text-gold-300">{count}</span>
              <span className="text-white/70"> / {config.partySize} elves have ordered</span>
            </p>
            <p className="text-sm font-semibold text-white/60">
              {complete ? 'Everyone’s in!' : `${remaining} to go`}
            </p>
          </div>
          <BaubleGarland orders={orders} partySize={config.partySize} />
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="candy-stripes h-full rounded-full bg-gradient-to-r from-holly-500 via-gold-400 to-pine-500"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (count / config.partySize) * 100)}%` }}
              transition={{ type: 'spring', stiffness: 60, damping: 16 }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
