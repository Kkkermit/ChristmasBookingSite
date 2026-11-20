import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { AsciiArt } from './ascii/AsciiArt';
import { Glyph } from './ascii/Glyph';
import { ART_CRASH, ART_DATABASE, ART_GIFT, ART_OFFLINE, ART_WARNING } from './ascii/pieces';
import type { AsciiArt as Art } from './ascii/tree';
import { Spinner } from './Spinner';

/* ------------------------------------------------------------------ skeletons */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-[3px] ${className}`} />;
}

/** Placeholder layout shown while the orders load - mirrors the real dashboard. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading the orders" className="pt-10 sm:pt-14">
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-7 w-44" />
        </div>
        <Skeleton className="h-16 w-[min(28rem,80%)] sm:h-24" />
        <Skeleton className="h-16 w-[min(34rem,90%)] sm:h-24" />
        <Skeleton className="h-5 w-[min(30rem,80%)]" />
        <p aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
          <Spinner className="text-holly-500" /> fetching orders<span className="animate-blink">_</span>
        </p>
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
              <Skeleton key={i} className="h-7 w-8 sm:w-9 lg:w-8" />
            ))}
          </div>
          <Skeleton className="h-3 w-full" />
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
  art: Art;
  title: string;
  children?: ReactNode;
  tone?: 'neutral' | 'error' | 'warning';
  action?: ReactNode;
  className?: string;
}

const TONE: Record<NonNullable<PanelProps['tone']>, string> = {
  neutral: 'border-white/15',
  error: 'border-holly-500/50 shadow-[0_0_40px_-16px_rgba(255,43,70,0.6)]',
  warning: 'border-white/40',
};

/** A friendly message with a piece of ASCII art, for empty states and errors. */
export function StatePanel({ art, title, children, tone = 'neutral', action, className = '' }: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass flex flex-col items-center px-5 py-8 text-center sm:px-8 sm:py-10 ${TONE[tone]} ${className}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <AsciiArt lines={art.lines} mask={art.mask} className="animate-float text-[13px] sm:text-sm" />
      <h3 className="mt-4 font-display text-[2rem] leading-none sm:text-[2.4rem]">{title}</h3>
      {children && <div className="mt-3 max-w-md text-sm text-white/70">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <StatePanel art={ART_GIFT} title={title}>
      {children}
    </StatePanel>
  );
}

/** Picks the right message and picture for an API failure, with a retry button. */
export function ErrorState({ error, onRetry, retrying }: { error: unknown; onRetry?: () => void; retrying?: boolean }) {
  const apiError = error instanceof ApiError ? error : null;
  const code = apiError?.code;
  const offline = code === 'NETWORK' || (typeof navigator !== 'undefined' && navigator.onLine === false);

  const { art, title, tone } = offline
    ? { art: ART_OFFLINE, title: "You're offline", tone: 'warning' as const }
    : code === 'NO_STORAGE'
      ? { art: ART_DATABASE, title: 'One more setup step', tone: 'warning' as const }
      : code === 'DB_UNAVAILABLE'
        ? { art: ART_DATABASE, title: 'The database is napping', tone: 'error' as const }
        : apiError && apiError.status >= 500
          ? { art: ART_CRASH, title: 'The elves dropped something', tone: 'error' as const }
          : { art: ART_WARNING, title: 'Something went wrong', tone: 'error' as const };

  const message = offline
    ? 'Check your connection - everything will load again once you are back online.'
    : (apiError?.message ?? 'Please try again in a moment.');

  return (
    <StatePanel
      art={art}
      title={title}
      tone={tone}
      className="mx-auto mt-16 max-w-xl"
      action={
        onRetry && (
          <button type="button" className="btn-primary" onClick={onRetry} disabled={retrying}>
            {retrying ? <Spinner label="Retrying" /> : <Glyph name="refresh" />}
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
export function OfflineBanner({ position = 'top-[5.25rem] sm:top-[5.75rem]' }: { position?: string }) {
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
          <span className="flex items-center gap-2 rounded-[3px] bg-white px-4 py-2 text-xs font-bold text-black shadow-lg shadow-black/60">
            <Glyph name="offline" className="text-holly-600" />
            You&apos;re offline - changes won&apos;t save until you reconnect.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
