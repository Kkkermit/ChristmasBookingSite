import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Spinner } from './Spinner';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  // Portalled to <body> so it sits above everything (incl. toasts), whatever stacking context it was opened from.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-body"
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-night-900 p-6 text-center shadow-2xl shadow-black/60 sm:p-7"
            initial={{ y: 60, scale: 0.9, rotate: -2 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-holly-500/20 text-holly-400">
              <Trash2 className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 id="confirm-title" className="font-display text-2xl">
              {title}
            </h2>
            <p id="confirm-body" className="mt-2 text-white/70">
              {body}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button ref={cancelRef} type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
                Keep it
              </button>
              <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
                {busy && <Spinner className="h-4 w-4" />}
                {busy ? 'Removing…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
