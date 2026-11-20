import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Glyph, type GlyphName } from './ascii/Glyph';

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

const GLYPH: Record<Tone, GlyphName> = { success: 'ok', error: 'error', info: 'info' };
const STYLE: Record<Tone, string> = {
  success: 'border-white/70 bg-black/95 [&_.toast-glyph]:text-pine-400',
  error: 'border-holly-400 bg-holly-700/95 [&_.toast-glyph]:text-white',
  info: 'border-white/25 bg-night-800/95 [&_.toast-glyph]:text-holly-400',
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
          {toasts.map((t) => {
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-[3px] border py-3 pl-4 pr-2 text-left text-xs font-medium text-white shadow-2xl shadow-black ${STYLE[t.tone]}`}
              >
                <Glyph name={GLYPH[t.tone]} className="toast-glyph" />
                <span role={t.tone === 'error' ? 'alert' : 'status'} className="flex-1">
                  {t.message}
                </span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] font-mono text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss"
                >
                  <span aria-hidden="true">x</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
