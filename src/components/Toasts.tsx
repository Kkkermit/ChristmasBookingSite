import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  show(message: string, tone?: Tone): void;
}

const ToastContext = createContext<ToastApi>({ show: () => {} });

export const useToast = () => useContext(ToastContext);

const ICON: Record<Tone, string> = { success: '🎉', error: '🙈', info: '🔔' };
const STYLE: Record<Tone, string> = {
  success: 'border-pine-500/40 bg-pine-700/90',
  error: 'border-holly-400/50 bg-holly-600/90',
  info: 'border-white/20 bg-night-800/95',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6500 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              type="button"
              key={t.id}
              layout
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium text-white shadow-2xl backdrop-blur-md ${STYLE[t.tone]}`}
            >
              <span className="text-xl">{ICON[t.tone]}</span>
              <span role={t.tone === 'error' ? 'alert' : 'status'}>{t.message}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
