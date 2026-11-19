import { Ban, CloudOff, Pencil, RefreshCw, ScrollText, Trash2, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { COURSES, SKIP, choiceLabel, findDish, optionField } from '../../shared/menu';
import type { Order } from '../../shared/types';
import { colourFor, initials } from '../lib/format';
import { DishIcon } from './icons';
import { SectionHeading } from './SectionHeading';
import { EmptyState } from './states';

interface NiceListProps {
  orders: Order[];
  mine: Set<string>;
  canEdit: boolean;
  editingId: string | null;
  highlightId: string | null;
  onEdit(order: Order): void;
  onDelete(order: Order): void;
  refreshing?: boolean;
  refreshFailed?: boolean;
  onRefresh?(): void;
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
      id={`order-${order.id}`}
      layout="position"
      initial={{ opacity: 0, y: 24, rotate: index % 2 ? 2 : -2, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: 0,
        scale: 1,
        boxShadow: highlight ? ['0 0 0px #fcd34d00', '0 0 40px #fcd34dcc', '0 0 0px #fcd34d00'] : '0 0 0px #fcd34d00',
      }}
      exit={{ opacity: 0, x: 80, rotate: 8, scale: 0.8, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, boxShadow: { duration: 1.8 } }}
      className={`relative flex flex-col overflow-hidden rounded-3xl border bg-night-800/90 p-4 sm:p-5 ${
        isEditing ? 'border-gold-400' : 'border-white/10'
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: colour }} aria-hidden="true" />
      <div className="flex items-start gap-3 pl-1">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
          style={{
            background: `radial-gradient(circle at 32% 28%, #ffffffcc 0%, ${colour} 30%, ${colour} 65%, #00000088 140%)`,
            boxShadow: `0 0 16px ${colour}88`,
          }}
          aria-hidden="true"
        >
          {initials(order.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words text-lg font-bold leading-tight">{order.name}</h3>
            {isMine && (
              <span className="rounded-full bg-gold-400 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-night-950">
                You
              </span>
            )}
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {COURSES.map((course) => {
              const value = order[course.id];
              const dish = findDish(course.id, value);
              const choice = dish?.options?.choices.find((c) => c.id === order[optionField(course.id)]);
              const option = choice?.formNote ? choice.label : '';
              return (
                <li key={course.id} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-0.5 text-gold-300">
                    {dish ? <DishIcon icon={dish.icon} className="h-4 w-4" /> : <Ban className="h-4 w-4 text-white/40" />}
                  </span>
                  <span className="sr-only">{course.singular}: </span>
                  <span className={value === SKIP ? 'italic text-white/50' : 'text-white/90'}>
                    {choiceLabel(course.id, value)}
                    {option && <span className="text-white/55"> · {option.toLowerCase()}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {order.notes && (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-gold-400/10 px-3 py-1.5 text-xs font-medium text-gold-300">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">Allergies or requests: </span>
                {order.notes}
              </span>
            </p>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <button type="button" onClick={onEdit} className="btn-ghost min-h-11 py-2 text-sm" aria-label={`Edit ${order.name}'s order`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn min-h-11 border border-holly-400/30 bg-holly-500/10 py-2 text-sm text-holly-400 hover:bg-holly-500/20"
            aria-label={`Delete ${order.name}'s order`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </motion.li>
  );
}

export function NiceList({
  orders,
  mine,
  canEdit,
  editingId,
  highlightId,
  onEdit,
  onDelete,
  refreshing,
  refreshFailed,
  onRefresh,
}: NiceListProps) {
  return (
    <section aria-labelledby="nice-list-title">
      <SectionHeading
        id="nice-list-title"
        icon={ScrollText}
        title="The Nice List"
        aside={
          <>
            <span className="hidden text-sm font-semibold text-white/60 min-[400px]:inline">{orders.length} ordered</span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
                aria-label="Refresh the list"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
              </button>
            )}
          </>
        }
      />
      <AnimatePresence>
        {refreshFailed && (
          <motion.p
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 flex items-center gap-2 overflow-hidden rounded-2xl border border-gold-400/30 bg-gold-400/10 px-4 py-2 text-sm text-gold-300"
          >
            <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            Couldn&apos;t refresh just now - showing the last list we loaded. We&apos;ll keep trying.
          </motion.p>
        )}
      </AnimatePresence>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet">Be the first elf to order - your bauble will light up at the top!</EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
