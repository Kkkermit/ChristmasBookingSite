import { CircleAlert, DatabaseZap, Gift, RefreshCw, ServerCrash, WifiOff, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { Spinner } from './Spinner';

/* ------------------------------------------------------------------ skeletons */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-2xl ${className}`} />;
}

/** Placeholder layout shown while the orders load - mirrors the real dashboard. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading the orders" className="pt-10 sm:pt-14">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-40 rounded-full" />
          <Skeleton className="h-7 w-44 rounded-full" />
        </div>
        <Skeleton className="h-16 w-[min(36rem,90%)] sm:h-24" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-5 w-[min(30rem,80%)]" />
      </div>
      <div className="glass card-pad mx-auto mt-8 grid max-w-4xl gap-7 lg:grid-cols-[auto_1fr]">
        <div className="flex justify-center gap-2 sm:gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-14 sm:h-20 sm:w-20" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-7 w-56" />
          <div className="grid grid-cols-6 justify-items-center gap-y-3 sm:grid-cols-12">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-full sm:h-9 sm:w-9 lg:h-8 lg:w-8" />
            ))}
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
      </div>
      <div className="mt-16 grid gap-6 sm:mt-20 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <div className="glass card-pad space-y-5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
        <div className="glass card-pad hidden space-y-3 lg:block">
          <Skeleton className="h-8 w-40" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- empty / error */

interface PanelProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  tone?: 'neutral' | 'error' | 'warning';
  action?: ReactNode;
  className?: string;
}

const TONE: Record<NonNullable<PanelProps['tone']>, string> = {
  neutral: 'from-pine-500/30 to-pine-700/20 text-pine-500',
  error: 'from-holly-500/30 to-holly-600/20 text-holly-400',
  warning: 'from-gold-400/30 to-gold-500/20 text-gold-300',
};

/** A friendly, illustrated message used for empty states and errors. */
export function StatePanel({ icon: Icon, title, children, tone = 'neutral', action, className = '' }: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass flex flex-col items-center px-5 py-8 text-center sm:px-8 sm:py-10 ${className}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <span className={`flex h-16 w-16 animate-float items-center justify-center rounded-3xl bg-gradient-to-br ${TONE[tone]}`}>
        <Icon className="h-8 w-8" aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-display text-2xl sm:text-3xl">{title}</h3>
      {children && <div className="mt-2 max-w-md text-white/70">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <StatePanel icon={Gift} title={title}>
      {children}
    </StatePanel>
  );
}

/** Picks the right message and icon for an API failure, with a retry button. */
export function ErrorState({ error, onRetry, retrying }: { error: unknown; onRetry?: () => void; retrying?: boolean }) {
  const apiError = error instanceof ApiError ? error : null;
  const code = apiError?.code;
  const offline = code === 'NETWORK' || (typeof navigator !== 'undefined' && navigator.onLine === false);

  const { icon, title, tone } = offline
    ? { icon: WifiOff, title: "You're offline", tone: 'warning' as const }
    : code === 'NO_STORAGE'
      ? { icon: DatabaseZap, title: 'One more setup step', tone: 'warning' as const }
      : code === 'DB_UNAVAILABLE'
        ? { icon: DatabaseZap, title: 'The database is napping', tone: 'error' as const }
        : apiError && apiError.status >= 500
          ? { icon: ServerCrash, title: 'The elves dropped something', tone: 'error' as const }
          : { icon: CircleAlert, title: 'Something went wrong', tone: 'error' as const };

  const message = offline
    ? 'Check your connection - everything will load again once you are back online.'
    : (apiError?.message ?? 'Please try again in a moment.');

  return (
    <StatePanel
      icon={icon}
      title={title}
      tone={tone}
      className="mx-auto mt-16 max-w-xl"
      action={
        onRetry && (
          <button type="button" className="btn-primary" onClick={onRetry} disabled={retrying}>
            {retrying ? <Spinner label="Retrying" /> : <RefreshCw className="h-5 w-5" aria-hidden="true" />}
            <span>{retrying ? 'Trying again…' : 'Try again'}</span>
          </button>
        )
      }
    >
      <p>{message}</p>
    </StatePanel>
  );
}

/* ---------------------------------------------------------------- offline */

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

/** Shown just below the sticky header (or near the top on the login page) - never on top of it. */
export function OfflineBanner({ position = 'top-[5.75rem] sm:top-[6.25rem]' }: { position?: string }) {
  const online = useOnline();
  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          role="status"
          initial={{ y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          className={`pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4 ${position}`}
        >
          <span className="flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-night-950 shadow-lg shadow-black/40">
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            You&apos;re offline - changes won&apos;t save until you reconnect.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
