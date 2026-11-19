import { motion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import type { Order } from '../../shared/types';
import { useBookingData } from '../hooks/useBookingData';
import { useNow } from '../hooks/useNow';
import { ApiError, api } from '../lib/api';
import { bigCelebration, celebrate } from '../lib/celebrate';
import { forgetMyOrder, myOrderIds, rememberMyOrder } from '../lib/mine';
import { ConfirmDialog } from './ConfirmDialog';
import { Header } from './Header';
import { Hero } from './Hero';
import { NiceList } from './NiceList';
import { OrderForm } from './OrderForm';
import { Tally } from './Tally';
import { useToast } from './Toasts';
import { Workshop } from './Workshop';

function SetupNeeded({ message }: { message: string }) {
  return (
    <div className="glass mx-auto mt-16 max-w-xl p-8 text-center">
      <div className="text-6xl">🧰</div>
      <h2 className="mt-3 font-display text-3xl">One more step</h2>
      <p className="mt-3 text-white/75">{message}</p>
    </div>
  );
}

function HowItWorks({ partySize }: { partySize: number }) {
  const steps = [
    { icon: '🎅', text: 'Pop your name in' },
    { icon: '🍽️', text: 'Pick a starter, main and dessert' },
    { icon: '✨', text: 'Edit or delete any time before the deadline' },
    { icon: '🧾', text: `Once all ${partySize} are in, download the filled booking form` },
  ];
  return (
    <div className="glass p-6">
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-xl">{step.icon}</span>
            <span className="text-white/80">{step.text}</span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status">
      <motion.div
        className="text-6xl"
        animate={{ rotate: [0, 15, -15, 0], y: [0, -12, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        🎁
      </motion.div>
      <p className="font-semibold text-white/70">Unwrapping the orders…</p>
    </div>
  );
}

export function Dashboard({ onLoggedOut }: { onLoggedOut(): void }) {
  const { state, error, reload, upsertOrder, removeOrder, setDetails } = useBookingData(onLoggedOut);
  const [editing, setEditing] = useState<Order | null>(null);
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [mine, setMine] = useState(() => myOrderIds());
  const formRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const now = useNow(1000);

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
      setTimeout(() => setHighlightId(null), 2000);
      if (wasNew) {
        rememberMyOrder(order.id);
        setMine(myOrderIds());
        const total = (state?.orders.length ?? 0) + 1;
        if (state && total === state.config.partySize) {
          bigCelebration();
          toast.show(`That's everyone! All ${total} orders are in - time to download the booking form 🎉`, 'success');
        } else {
          celebrate();
          toast.show(`Ho ho ho! ${order.name}'s order is on the Nice List 🎄`, 'success');
        }
      } else {
        celebrate({ x: 0.5, y: 0.4 });
        toast.show(`${order.name}'s order has been updated ✨`, 'success');
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

  const cancelDelete = useCallback(() => setToDelete(null), []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10">
      <Header onLogout={logout} loggingOut={loggingOut} />
      <main className="mx-auto max-w-6xl px-4 pb-72 sm:pb-80">
        {!state && error?.code === 'NO_STORAGE' && <SetupNeeded message={error.message} />}
        {!state && error && error.code !== 'NO_STORAGE' && (
          <div className="glass mx-auto mt-16 max-w-xl p-8 text-center">
            <div className="text-6xl">🥶</div>
            <p className="mt-3 text-white/80">{error.message}</p>
            <button type="button" className="btn-primary mt-5" onClick={() => void reload()}>
              Try again
            </button>
          </div>
        )}
        {!state && !error && <Loading />}
        {state && (
          <>
            <Hero config={state.config} orders={state.orders} now={now} />

            <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
              <div id="order" ref={formRef} className="scroll-mt-24">
                <h2 className="section-title mb-4">
                  {editing ? 'Change of heart?' : 'Place your order'}{' '}
                  <span className="inline-block animate-float">🍽️</span>
                </h2>
                <OrderForm
                  config={state.config}
                  orders={state.orders}
                  editing={editing}
                  onSaved={handleSaved}
                  onCancelEdit={() => setEditing(null)}
                />
              </div>
              <aside className="hidden space-y-6 lg:sticky lg:top-24 lg:block lg:pt-14">
                {state.orders.length === 0 ? <HowItWorks partySize={state.config.partySize} /> : <Tally orders={state.orders} />}
              </aside>
            </div>

            <div id="nice-list" className="mt-16 scroll-mt-24">
              <NiceList
                orders={state.orders}
                mine={mine}
                canEdit={state.config.ordersOpen}
                editingId={editing?.id ?? null}
                highlightId={highlightId}
                onEdit={startEdit}
                onDelete={setToDelete}
              />
              <div className="mt-6 lg:hidden">
                <Tally orders={state.orders} />
              </div>
            </div>

            <div className="mt-16">
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
