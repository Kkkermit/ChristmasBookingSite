import { AnimatePresence, motion } from 'motion/react';
import { COURSES, SKIP, choiceLabel, findDish, optionField } from '../../shared/menu';
import type { Order } from '../../shared/types';
import { colourFor, initials } from '../lib/format';
import { Glyph } from './ascii/Glyph';
import { DishGlyph } from './icons';
import { Spinner } from './Spinner';
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
        boxShadow: highlight ? ['0 0 0px #ffffff00', '0 0 40px #ffffffaa', '0 0 0px #ffffff00'] : '0 0 0px #ffffff00',
      }}
      exit={{ opacity: 0, x: 80, rotate: 8, scale: 0.8, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 28, boxShadow: { duration: 1.8 } }}
      className={`ticks relative flex flex-col overflow-hidden rounded-[4px] border bg-night-800/95 p-4 sm:p-5 ${
        isEditing ? 'border-white' : 'border-white/12'
      }`}
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: colour }} aria-hidden="true" />
      <p aria-hidden="true" className="-mt-1 mb-2 pl-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-white/30">
        ticket #{String(index + 1).padStart(2, '0')}
      </p>
      <div className="flex items-start gap-3 pl-1">
        <span
          className="flex h-11 shrink-0 items-center justify-center whitespace-pre font-mono text-base font-extrabold"
          style={{ color: colour, textShadow: `0 0 12px ${colour}` }}
          aria-hidden="true"
        >
          ({initials(order.name)})
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-11 flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words font-display text-[1.75rem] leading-none">{order.name}</h3>
            {isMine && (
              <span className="rounded-[2px] bg-white px-1.5 py-0.5 font-mono text-[0.7rem] font-extrabold uppercase tracking-wide text-black">
                You
              </span>
            )}
          </div>
          <ul className="mt-1 space-y-1.5 text-[0.8rem]">
            {COURSES.map((course) => {
              const value = order[course.id];
              const dish = findDish(course.id, value);
              const choice = dish?.options?.choices.find((c) => c.id === order[optionField(course.id)]);
              const option = choice?.formNote ? choice.label : '';
              return (
                <li key={course.id} className="flex items-start gap-2">
                  {dish ? (
                    <DishGlyph icon={dish.icon} className="mt-0.5 text-xs text-holly-500" />
                  ) : (
                    <Glyph name="skip" className="mt-0.5 w-[3ch] text-xs text-white/35" />
                  )}
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
            <p className="mt-2 flex items-start gap-2 rounded-[3px] border border-holly-500/40 bg-holly-500/10 px-3 py-1.5 text-xs font-medium text-holly-300">
              <Glyph name="warn" className="mt-px text-holly-500" />
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
          <button type="button" onClick={onEdit} className="btn-ghost min-h-11 px-3 py-2 text-xs" aria-label={`Edit ${order.name}'s order`}>
            <Glyph name="edit" className="text-holly-500" />
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn min-h-11 border border-holly-500/40 bg-holly-500/10 px-3 py-2 text-xs text-holly-400 hover:bg-holly-500/20"
            aria-label={`Delete ${order.name}'s order`}
          >
            <Glyph name="delete" />
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
        glyph="list"
        title="The Nice List"
        aside={
          <>
            <span className="hidden font-mono text-xs font-bold uppercase tracking-wider text-white/55 min-[400px]:inline">{orders.length} ordered</span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[3px] border border-white/20 bg-black/60 text-white/75 transition hover:border-white/50 hover:text-white disabled:opacity-60"
                aria-label="Refresh the list"
                title="Refresh"
              >
                {refreshing ? <Spinner className="text-holly-500" /> : <Glyph name="refresh" className="text-sm" />}
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
            className="mb-3 flex items-center gap-2 overflow-hidden rounded-[3px] border border-white/25 bg-white/[0.06] px-4 py-2 text-xs text-white/80"
          >
            <Glyph name="offline" className="text-holly-500" />
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
