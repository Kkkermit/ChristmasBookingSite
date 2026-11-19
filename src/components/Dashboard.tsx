import { ListChecks, Pencil, Send, UserRound, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import type { Order } from '../../shared/types';
import { useActiveSection } from '../hooks/useActiveSection';
import { useBookingData } from '../hooks/useBookingData';
import { ApiError, api } from '../lib/api';
import { bigCelebration, celebrate } from '../lib/celebrate';
import { forgetMyOrder, myOrderIds, rememberMyOrder } from '../lib/mine';
import { ConfirmDialog } from './ConfirmDialog';
import { Header } from './Header';
import { Hero } from './Hero';
import { NiceList } from './NiceList';
import { OrderForm } from './OrderForm';
import { SectionHeading } from './SectionHeading';
import { DashboardSkeleton, ErrorState } from './states';
import { Tally } from './Tally';
import { useToast } from './Toasts';
import { Workshop } from './Workshop';

const SECTIONS = ['order', 'nice-list', 'workshop'] as const;

/** Bring a card into view once it has rendered (after the list animation starts). */
function revealOrder(id: string) {
  setTimeout(() => {
    document.getElementById(`order-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 250);
}

function HowItWorks({ partySize }: { partySize: number }) {
  const steps: Array<{ Icon: LucideIcon; text: string }> = [
    { Icon: UserRound, text: 'Pop your name in' },
    { Icon: UtensilsCrossed, text: 'Pick a starter, main and dessert' },
    { Icon: Send, text: 'Send it to Santa - it appears on the Nice List' },
    { Icon: Pencil, text: 'Edit or delete any time before the deadline' },
    { Icon: ListChecks, text: `Once all ${partySize} are in, download the filled booking form` },
  ];
  return (
    <div className="glass card-pad">
      <h2 className="font-display text-2xl">How it works</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <motion.li
            key={step.text}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12 }}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-gold-300">
              <step.Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-white/80">{step.text}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

export function Dashboard({ onLoggedOut }: { onLoggedOut(): void }) {
  const { state, error, refreshing, refreshFailed, reload, upsertOrder, removeOrder, setDetails } = useBookingData(onLoggedOut);
  const [editing, setEditing] = useState<Order | null>(null);
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [mine, setMine] = useState(() => myOrderIds());
  const formRef = useRef<HTMLElement>(null);
  const toast = useToast();

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      // Cookie expires anyway.
    }
    onLoggedOut();
  }, [onLoggedOut]);

  const handleSaved = useCallback(
    (order: Order, wasNew: boolean) => {
      upsertOrder(order);
      setEditing(null);
      setHighlightId(order.id);
      setTimeout(() => setHighlightId(null), 2200);
      // Show them their order on the Nice List.
      revealOrder(order.id);
      if (wasNew) {
        rememberMyOrder(order.id);
        setMine(myOrderIds());
        const total = (state?.orders.length ?? 0) + 1;
        if (state && total === state.config.partySize) {
          bigCelebration();
          toast.show(`That's everyone! All ${total} orders are in - time to download the booking form`, 'success');
        } else {
          celebrate();
          toast.show(`Ho ho ho! ${order.name}'s order is on the Nice List`, 'success');
        }
      } else {
        celebrate({ x: 0.5, y: 0.4 });
        toast.show(`${order.name}'s order has been updated`, 'success');
      }
    },
    [state, toast, upsertOrder],
  );

  const startEdit = useCallback((order: Order) => {
    setEditing(order);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteOrder(toDelete.id);
      removeOrder(toDelete.id);
      forgetMyOrder(toDelete.id);
      setMine(myOrderIds());
      if (editing?.id === toDelete.id) setEditing(null);
      toast.show(`${toDelete.name}'s order has been removed`, 'info');
      setToDelete(null);
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Could not delete - please try again.', 'error');
      if (err instanceof ApiError && err.code === 'NOT_FOUND') {
        setToDelete(null);
        void reload();
      }
    } finally {
      setDeleting(false);
    }
  }, [editing, reload, removeOrder, toDelete, toast]);

  const activeSection = useActiveSection(SECTIONS, state !== null);
  const cancelDelete = useCallback(() => setToDelete(null), []);
  const refresh = useCallback(() => void reload(), [reload]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10">
      <Header onLogout={logout} loggingOut={loggingOut} active={activeSection} />
      <main className="mx-auto max-w-6xl px-4 pb-72 sm:pb-80">
        {!state && error && <ErrorState error={error} onRetry={() => void reload()} retrying={refreshing} />}
        {!state && !error && <DashboardSkeleton />}
        {state && (
          <>
            <Hero config={state.config} orders={state.orders} onDeadline={refresh} />

            <section id="order" ref={formRef} aria-labelledby="order-title" className="mt-16 sm:mt-20">
              <SectionHeading
                id="order-title"
                icon={UtensilsCrossed}
                title={editing ? 'Change of heart?' : 'Place your order'}
              />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
                <OrderForm
                  config={state.config}
                  orders={state.orders}
                  editing={editing}
                  onSaved={handleSaved}
                  onCancelEdit={() => setEditing(null)}
                  onStale={refresh}
                />
                <aside className="hidden lg:sticky lg:top-28 lg:block">
                  {state.orders.length === 0 ? <HowItWorks partySize={state.config.partySize} /> : <Tally orders={state.orders} />}
                </aside>
              </div>
            </section>

            <div id="nice-list" className="mt-16 sm:mt-20">
              <NiceList
                orders={state.orders}
                mine={mine}
                canEdit={state.config.ordersOpen}
                editingId={editing?.id ?? null}
                highlightId={highlightId}
                onEdit={startEdit}
                onDelete={setToDelete}
                refreshing={refreshing}
                refreshFailed={refreshFailed}
                onRefresh={() => void reload()}
              />
              {state.orders.length > 0 && (
                <div className="mt-6 lg:hidden">
                  <Tally orders={state.orders} />
                </div>
              )}
            </div>

            <div className="mt-16 sm:mt-20">
              <Workshop config={state.config} orders={state.orders} details={state.details} onDetailsSaved={setDetails} />
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Remove ${toDelete?.name ?? ''}'s order?`}
        body="This takes them off the Nice List. They can always order again before the deadline."
        confirmLabel="Yes, remove"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={cancelDelete}
      />
    </motion.div>
  );
}
