import { ChefHat, PoundSterling } from 'lucide-react';
import { motion } from 'motion/react';
import { COURSES, PRICE_PER_HEAD, SKIP, estimatedBill, formatPrice, optionField } from '../../shared/menu';
import type { Order } from '../../shared/types';
import { DishIcon } from './icons';

const BAR = ['from-holly-500 to-holly-400', 'from-pine-600 to-pine-500', 'from-gold-500 to-gold-400'];

/** Kitchen tally - how many of each dish (and option), handy when phoning the restaurant. */
export function Tally({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return null;
  const bill = estimatedBill(orders.length);
  return (
    <section aria-labelledby="tally-title" className="glass card-pad">
      <h2 id="tally-title" className="flex items-center gap-2 font-display text-2xl">
        <ChefHat className="h-6 w-6 text-gold-300" aria-hidden="true" />
        Kitchen tally
      </h2>
      <div className="mt-4 space-y-5">
        {COURSES.map((course, ci) => {
          const skipped = orders.filter((o) => o[course.id] === SKIP).length;
          const counts = course.dishes.map((d) => orders.filter((o) => o[course.id] === d.id).length);
          const max = Math.max(1, ...counts);
          return (
            <div key={course.id}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">{course.title}</h3>
              <ul className="space-y-1.5">
                {course.dishes.map((dish, di) => {
                  const n = counts[di];
                  const optionBreakdown =
                    dish.options && n > 0
                      ? dish.options.choices
                          .map((choice) => {
                            const c = orders.filter(
                              (o) => o[course.id] === dish.id && o[optionField(course.id)] === choice.id,
                            ).length;
                            return c ? `${c} ${choice.label.toLowerCase()}` : '';
                          })
                          .filter(Boolean)
                          .join(' · ')
                      : '';
                  return (
                    <li key={dish.id} className="text-sm">
                      <div className="grid grid-cols-[1.25rem_1fr_2rem] items-center gap-2">
                        <DishIcon icon={dish.icon} className="h-4 w-4 text-gold-300" />
                        <div className="relative min-h-7 overflow-hidden rounded-lg bg-white/5">
                          <motion.div
                            className={`absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r ${BAR[ci]} opacity-80`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(n / max) * 100}%` }}
                            transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                          />
                          <span className="relative flex min-h-7 items-center px-2 py-1 font-medium leading-tight">{dish.shortName}</span>
                        </div>
                        <span className="text-right font-display text-lg tabular-nums">{n}</span>
                      </div>
                      {optionBreakdown && <p className="ml-7 mt-0.5 text-xs text-white/55">{optionBreakdown}</p>}
                    </li>
                  );
                })}
              </ul>
              {skipped > 0 && (
                <p className="mt-1 text-xs text-white/50">
                  {skipped} skipping {course.singular}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <PoundSterling className="h-4 w-4 text-gold-300" aria-hidden="true" />
          Food bill estimate
        </p>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-white/75">
          <dt>
            {orders.length} × {formatPrice(PRICE_PER_HEAD)}
          </dt>
          <dd className="text-right tabular-nums">{formatPrice(bill.food)}</dd>
          <dt>10% service charge</dt>
          <dd className="text-right tabular-nums">{formatPrice(bill.service)}</dd>
          <dt className="font-bold text-white">Total (drinks extra)</dt>
          <dd className="text-right font-bold tabular-nums text-white">{formatPrice(bill.total)}</dd>
        </dl>
      </div>
    </section>
  );
}
