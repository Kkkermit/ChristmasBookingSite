import { motion } from 'motion/react';
import { COURSES, SKIP } from '../../shared/menu';
import type { Order } from '../../shared/types';

const BAR = ['from-holly-500 to-holly-400', 'from-pine-600 to-pine-500', 'from-gold-500 to-gold-400'];

/** Kitchen tally - how many of each dish, handy when phoning the restaurant. */
export function Tally({ orders }: { orders: Order[] }) {
  if (orders.length === 0) return null;
  return (
    <section aria-labelledby="tally-title" className="glass p-5 sm:p-6">
      <h2 id="tally-title" className="font-display text-2xl">
        Kitchen tally <span aria-hidden="true">👨‍🍳</span>
      </h2>
      <div className="mt-4 space-y-5">
        {COURSES.map((course, ci) => {
          const skipped = orders.filter((o) => o[course.id] === SKIP).length;
          const max = Math.max(1, ...course.dishes.map((d) => orders.filter((o) => o[course.id] === d.id).length));
          return (
            <div key={course.id}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-white/60">{course.title}</h3>
              <ul className="space-y-1.5">
                {course.dishes.map((dish) => {
                  const n = orders.filter((o) => o[course.id] === dish.id).length;
                  return (
                    <li key={dish.id} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-sm">
                      <span aria-hidden="true">{dish.emoji}</span>
                      <div className="relative h-7 overflow-hidden rounded-lg bg-white/5">
                        <motion.div
                          className={`absolute inset-y-0 left-0 rounded-lg bg-gradient-to-r ${BAR[ci]} opacity-80`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(n / max) * 100}%` }}
                          transition={{ type: 'spring', stiffness: 80, damping: 16 }}
                        />
                        <span className="relative flex h-full items-center truncate px-2 font-medium">{dish.name}</span>
                      </div>
                      <span className="text-right font-display text-lg tabular-nums">{n}</span>
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
    </section>
  );
}
