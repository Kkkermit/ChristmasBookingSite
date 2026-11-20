import { motion } from 'motion/react';
import { PRICE_PER_HEAD, RESTAURANT, formatPrice } from '../../shared/menu';
import type { Order, PublicConfig } from '../../shared/types';
import { formatLongDate, sleepsUntilChristmas } from '../lib/format';
import { useNow } from '../hooks/useNow';
import { AsciiArt } from './ascii/AsciiArt';
import { Banner } from './ascii/Banner';
import { BANNER_FEAST, BANNER_XMAS } from './ascii/banners';
import { Glyph, type GlyphName } from './ascii/Glyph';
import { ART_LOCK } from './ascii/pieces';
import { BaubleGarland } from './BaubleGarland';
import { Countdown } from './Countdown';

function Chip({ glyph, children, accent = false }: { glyph: GlyphName; children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5 text-[0.7rem] font-bold uppercase leading-none tracking-[0.12em] sm:text-xs ${
        accent ? 'border-holly-500/60 bg-holly-500/10 text-holly-300' : 'border-white/20 bg-black/60 text-white/80'
      }`}
    >
      <Glyph name={glyph} className={accent ? 'text-holly-500' : 'text-white/50'} />
      <span>{children}</span>
    </span>
  );
}

/** [=========>.....] - the ASCII progress bar under the garland. */
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div aria-hidden="true" className="flex items-center font-mono text-sm leading-none text-white/40">
      <span>[</span>
      <span className="relative mx-0.5 block min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        <span>{'.'.repeat(160)}</span>
        <motion.span
          className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap bg-black font-bold text-holly-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {'='.repeat(160)}
          {pct > 0 && <span className="absolute inset-y-0 right-0 bg-black pl-px text-white">{pct >= 100 ? '*' : '>'}</span>}
        </motion.span>
      </span>
      <span>]</span>
    </div>
  );
}

export function Hero({ config, orders, onDeadline }: { config: PublicConfig; orders: Order[]; onDeadline?(): void }) {
  // Minute resolution is plenty for "sleeps till Christmas"; only the countdown ticks every second.
  const now = useNow(60_000);
  const count = orders.length;
  const complete = count >= config.partySize;
  const sleeps = sleepsUntilChristmas(now);
  const remaining = Math.max(0, config.partySize - count);

  return (
    <section id="top" className="relative pt-10 text-center sm:pt-14">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-wrap items-center justify-center gap-2">
        <Chip glyph="pin" accent>
          {RESTAURANT.name}
          <span className="hidden min-[360px]:inline">, {RESTAURANT.location}</span>
        </Chip>
        <Chip glyph="money">{formatPrice(PRICE_PER_HEAD)} pp + 10% service</Chip>
        <Chip glyph="calendar">{sleeps === 0 ? "It's Christmas!" : `${sleeps} sleep${sleeps === 1 ? '' : 's'} till Christmas`}</Chip>
      </motion.div>

      {/* A dark halo behind the title so it reads clearly over the backdrop tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[-1rem] top-16 h-[30rem] bg-[radial-gradient(ellipse_closest-side,rgba(0,0,0,0.74),rgba(0,0,0,0.42)_55%,rgba(0,0,0,0))] sm:inset-x-[14%] lg:inset-x-[24%] lg:top-20 lg:h-[26rem]"
      />
      <h1 className="relative mt-8 flex flex-col items-center gap-2 sm:gap-3">
        <span className="sr-only">Christmas Feast 2026</span>
        <span className="animate-glitch">
          <Banner lines={BANNER_XMAS} maxPx={17} gutter="2.5rem" depth="text-holly-700" className="text-holly-500 drop-shadow-[0_0_18px_rgba(255,43,70,0.45)]" />
        </span>
        <Banner lines={BANNER_FEAST} maxPx={17} gutter="2.5rem" delay={200} depth="text-white/25" className="text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]" />
        <span aria-hidden="true" className="mt-1 flex items-center gap-3 font-display text-4xl leading-none text-holly-400 sm:text-5xl">
          <span className="font-mono text-sm text-white/40">*~*~</span>
          2026
          <span className="font-mono text-sm text-white/40">~*~*</span>
        </span>
      </h1>

      <motion.p
        className="relative mx-auto mt-7 max-w-xl text-sm leading-relaxed text-white/75 [text-shadow:0_0_10px_#000,0_0_3px_#000] sm:text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Pick your starter, main and dessert from the Christmas menu below. Change your mind? Edit or delete your order any time before the
        deadline.
      </motion.p>

      <motion.div
        className="glass card-pad mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-7 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 120, damping: 18 }}
      >
        <div className="flex flex-col items-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-holly-400">
            {config.ordersOpen ? '> orders close in' : 'Orders are closed'}
          </p>
          {config.ordersOpen ? (
            <Countdown deadline={config.deadline} onExpire={onDeadline} />
          ) : (
            <AsciiArt lines={ART_LOCK.lines} mask={ART_LOCK.mask} className="text-sm" />
          )}
          <p className="mt-3 text-xs text-white/55">Deadline: {formatLongDate(config.deadline)}</p>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-col items-center gap-1 lg:flex-row lg:items-baseline lg:justify-between lg:gap-3">
            <p className="text-base font-bold">
              <span className="font-display text-4xl leading-none text-holly-500">{count}</span>
              <span className="text-white/70"> / {config.partySize} elves have ordered</span>
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-white/55">{complete ? 'Everyone’s in!' : `${remaining} to go`}</p>
          </div>
          <BaubleGarland orders={orders} partySize={config.partySize} />
          <div className="mt-4">
            <ProgressBar value={count} max={config.partySize} />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
