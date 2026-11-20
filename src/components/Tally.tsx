import { motion } from 'motion/react';
import { COURSES, PRICE_PER_HEAD, SKIP, estimatedBill, formatPrice, optionField } from '../../shared/menu';
import type { Order } from '../../shared/types';
import { Glyph } from './ascii/Glyph';
import { DishGlyph } from './icons';

const BAR_COLOUR = ['text-holly-500', 'text-white', 'text-holly-300'];
const BAR_CHAR = ['#', '=', '*'];

/** [#####.....] - an ASCII bar that grows smoothly. */
function AsciiBar({ value, max, course }: { value: number; max: number; course: number }) {
  return (
    <span aria-hidden="true" className="flex min-w-0 items-center font-mono text-xs leading-none text-white/25">
      <span>[</span>
      <span className="relative block min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        <span>{'.'.repeat(80)}</span>
        <motion.span
          className={`absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap bg-night-900 font-bold ${BAR_COLOUR[course]}`}
          initial={{ width: 0 }}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 16 }}
        >
          {BAR_CHAR[course].repeat(80)}
        </motion.span>
      </span>
      <span>]</span>
    </span>
  );
}

/** Kitchen tally - how many of each dish (and option), handy when phoning the restaurant. */
export function Tally({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return null;
  const bill = estimatedBill(orders.length);
  return (
    <section aria-labelledby="tally-title" className="glass card-pad">
      <h2 id="tally-title" className="flex items-center gap-2 font-display text-3xl leading-none">
        <Glyph name="chef" className="text-base text-holly-500" />
        Kitchen tally
      </h2>
      <div className="mt-5 space-y-5">
        {COURSES.map((course, ci) => {
          const skipped = orders.filter((o) => o[course.id] === SKIP).length;
          const counts = course.dishes.map((d) => orders.filter((o) => o[course.id] === d.id).length);
          const max = Math.max(1, ...counts);
          return (
            <div key={course.id}>
              <h3 className="mb-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em] text-white/55">
                <span className="text-holly-500">//</span> {course.title}
              </h3>
              <ul className="space-y-2">
                {course.dishes.map((dish, di) => {
                  const n = counts[di];
                  const optionBreakdown =
                    dish.options && n > 0
                      ? dish.options.choices
                          .map((choice) => {
                            const c = orders.filter((o) => o[course.id] === dish.id && o[optionField(course.id)] === choice.id).length;
                            return c ? `${c} ${choice.label.toLowerCase()}` : '';
                          })
                          .filter(Boolean)
                          .join(' · ')
                      : '';
                  return (
                    <li key={dish.id} className="text-sm">
                      <div className="grid grid-cols-[3ch_minmax(0,1fr)_2.25rem] items-center gap-x-2 gap-y-1">
                        <DishGlyph icon={dish.icon} className={`text-xs ${n ? 'text-holly-500' : 'text-white/35'}`} />
                        <span className={`truncate text-[0.8rem] font-bold leading-tight ${n ? 'text-white' : 'text-white/55'}`}>{dish.shortName}</span>
                        <span className="text-right font-display text-2xl leading-none tabular-nums">{n}</span>
                        <span />
                        <AsciiBar value={n} max={max} course={ci} />
                      </div>
                      {optionBreakdown && <p className="ml-[calc(3ch+0.5rem)] mt-1 text-[0.7rem] text-white/55">{optionBreakdown}</p>}
                    </li>
                  );
                })}
              </ul>
              {skipped > 0 && (
                <p className="mt-1.5 text-[0.7rem] text-white/50">
                  {skipped} skipping {course.singular}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-[3px] border border-dashed border-white/20 bg-black/60 p-4 font-mono text-xs">
        <p className="flex items-center gap-2 font-bold uppercase tracking-wider">
          <Glyph name="money" className="text-holly-500" />
          Food bill estimate
        </p>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-white/75">
          <dt>
            {orders.length} × {formatPrice(PRICE_PER_HEAD)}
          </dt>
          <dd className="text-right tabular-nums">{formatPrice(bill.food)}</dd>
          <dt>10% service charge</dt>
          <dd className="text-right tabular-nums">{formatPrice(bill.service)}</dd>
          <dt className="mt-1 border-t border-dashed border-white/25 pt-1.5 font-bold text-white">Total (drinks extra)</dt>
          <dd className="mt-1 border-t border-dashed border-white/25 pt-1.5 text-right font-bold tabular-nums text-holly-400">{formatPrice(bill.total)}</dd>
        </dl>
      </div>
    </section>
  );
}
