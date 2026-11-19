import { Eye, EyeOff, KeyRound, LockOpen } from 'lucide-react';
import { motion, useAnimationControls } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../lib/api';
import { celebrate } from '../lib/celebrate';
import { ChristmasTree } from './decor/ChristmasTree';
import { Spinner } from './Spinner';

/**
 * The only screen strangers can ever see. Deliberately says nothing about
 * the venue or the event details - those only load after logging in.
 */
export function LoginScreen({ onSuccess }: { onSuccess(): void }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const card = useAnimationControls();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.login(password);
      celebrate({ x: 0.5, y: 0.45 });
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong - please try again.');
      void card.start({ x: [0, -14, 12, -8, 6, 0], transition: { duration: 0.45 } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.main
      className="relative z-10 flex min-h-dvh items-center justify-center px-4 pb-48 pt-16 sm:pb-64"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      <motion.div animate={card} className="w-full max-w-md">
        <motion.div
          initial={{ y: 40, opacity: 0, rotate: -3 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.1 }}
          className="glass relative overflow-visible px-6 pb-8 pt-24 text-center sm:px-10"
        >
          <div className="absolute -top-20 left-1/2 -translate-x-1/2">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.35 }}
            >
              <ChristmasTree className="h-40 w-36 drop-shadow-[0_10px_30px_rgba(34,197,94,0.35)]" />
            </motion.div>
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-300">Private · Invite only</p>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
            <span className="text-candy">Christmas Feast</span>
            <br />
            <span className="text-white">2026</span>
          </h1>
          <p className="mt-3 text-white/70">Say the magic word to get in.</p>

          <form onSubmit={submit} className="mt-7 space-y-3 text-left" noValidate aria-busy={busy}>
            <label htmlFor="password" className="block text-sm font-semibold text-white/80">
              Password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold-300" aria-hidden="true" />
              <input
                id="password"
                name="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`field pl-12 pr-14 ${error ? 'field-error' : ''}`}
                placeholder="The magic word…"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {error && (
              <motion.p
                id="password-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-holly-400"
              >
                {error}
              </motion.p>
            )}
            <button type="submit" className="btn-primary w-full text-lg" disabled={!password || busy}>
              <span className="candy-stripes absolute inset-0 opacity-40" />
              <span className="relative inline-flex items-center gap-2">
                {busy ? <Spinner /> : <LockOpen className="h-5 w-5" aria-hidden="true" />}
                {busy ? 'Checking the list…' : 'Unlock the grotto'}
              </span>
            </button>
          </form>
        </motion.div>
      </motion.div>
    </motion.main>
  );
}
