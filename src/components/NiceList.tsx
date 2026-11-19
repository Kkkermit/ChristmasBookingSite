import { AnimatePresence, motion } from 'motion/react';
import { COURSES, choiceEmoji, choiceLabel } from '../../shared/menu';
import type { Order } from '../../shared/types';
import { colourFor, initials } from '../lib/format';

interface NiceListProps {
  orders: Order[];
  mine: Set<string>;
  canEdit: boolean;
  editingId: string | null;
  highlightId: string | null;
  onEdit(order: Order): void;
  onDelete(order: Order): void;
}

function OrderCard({
  order,
  index,
  isMine,
  canEdit,
  isEditing,
  highlight,
  onEdit,
  onDelete,
}: {
  order: Order;
  index: number;
  isMine: boolean;
  canEdit: boolean;
  isEditing: boolean;
  highlight: boolean;
  onEdit(): void;
  onDelete(): void;
}) {
  const colour = colourFor(order.name);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 30, rotate: index % 2 ? 3 : -3, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: 0,
        scale: 1,
        boxShadow: highlight ? ['0 0 0px #fcd34d00', '0 0 40px #fcd34dcc', '0 0 0px #fcd34d00'] : '0 0 0px #fcd34d00',
      }}
      exit={{ opacity: 0, x: 80, rotate: 8, scale: 0.8, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 220, damping: 20, boxShadow: { duration: 1.6 } }}
      className={`relative overflow-hidden rounded-3xl border bg-night-800/70 p-4 backdrop-blur-md ${
        isEditing ? 'border-gold-400' : 'border-white/10'
      }`}
    >
      {/* gift-tag ribbon */}
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: colour }} aria-hidden="true" />
      <div className="flex items-start gap-3 pl-1">
        <motion.span
          whileHover={{ rotate: [0, -10, 10, 0] }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
          style={{
            background: `radial-gradient(circle at 32% 28%, #ffffffcc 0%, ${colour} 30%, ${colour} 65%, #00000088 140%)`,
            boxShadow: `0 0 16px ${colour}88`,
          }}
          aria-hidden="true"
        >
          {initials(order.name)}
        </motion.span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold">{order.name}</h3>
            {isMine && (
              <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-night-950">
                You
              </span>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {COURSES.map((course) => (
              <li key={course.id} className="flex items-center gap-2">
                <span aria-hidden="true" className="w-6 text-center text-base">
                  {choiceEmoji(course.id, order[course.id])}
                </span>
                <span className="sr-only">{course.singular}: </span>
                <span className={order[course.id] === 'none' ? 'text-white/50 italic' : 'text-white/90'}>
                  {choiceLabel(course.id, order[course.id])}
                </span>
              </li>
            ))}
          </ul>
          {order.notes && (
            <p className="mt-2 rounded-xl bg-gold-400/10 px-3 py-1.5 text-xs font-medium text-gold-300">⚠️ {order.notes}</p>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onEdit} className="btn-ghost min-h-10 py-2 text-sm" aria-label={`Edit ${order.name}'s order`}>
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn min-h-10 border border-holly-400/30 bg-holly-500/10 py-2 text-sm text-holly-400 hover:bg-holly-500/20"
            aria-label={`Delete ${order.name}'s order`}
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </motion.li>
  );
}

export function NiceList({ orders, mine, canEdit, editingId, highlightId, onEdit, onDelete }: NiceListProps) {
  return (
    <section aria-labelledby="nice-list-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 id="nice-list-title" className="section-title">
          The Nice List <span className="inline-block animate-float">📜</span>
        </h2>
        <span className="pb-1 text-sm font-semibold text-white/60">{orders.length} ordered</span>
      </div>
      {orders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-8 text-center">
          <div className="inline-block animate-float text-6xl">🎁</div>
          <p className="mt-3 text-lg font-semibold">No orders yet</p>
          <p className="text-white/60">Be the first elf to order!</p>
        </motion.div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence initial={false}>
            {orders.map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                index={i}
                isMine={mine.has(order.id)}
                canEdit={canEdit}
                isEditing={editingId === order.id}
                highlight={highlightId === order.id}
                onEdit={() => onEdit(order)}
                onDelete={() => onDelete(order)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
