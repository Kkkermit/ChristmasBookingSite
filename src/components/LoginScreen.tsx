import { motion, useAnimationControls } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { ApiError, api } from '../lib/api';
import { celebrate } from '../lib/celebrate';
import { Banner } from './ascii/Banner';
import { BANNER_FEAST, BANNER_XMAS } from './ascii/banners';
import { Glyph } from './ascii/Glyph';
import { TreeArt } from './ascii/TreeArt';
import { Spinner } from './Spinner';

/**
 * The only screen strangers can ever see. Deliberately says nothing about
 * the venue or the event details - those only load after logging in.
 */
export function LoginScreen({ onSuccess, beside = false }: { onSuccess(): void; /** Card to the right of the backdrop tree on wide screens. */ beside?: boolean }) {
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
      className={`relative z-10 flex min-h-dvh flex-col items-center px-4 pb-40 pt-36 sm:pb-48 ${beside ? 'min-[1180px]:items-end min-[1180px]:pr-[9vw]' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, filter: 'blur(8px)' }}
      transition={{ duration: 0.5 }}
    >
      <motion.div animate={card} className="my-auto w-full max-w-md">
        <motion.div
          initial={{ y: 40, opacity: 0, rotate: -3 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.1 }}
          className="glass relative overflow-visible px-6 pb-8 pt-40 text-center sm:px-10"
        >
          <div className="absolute -top-24 left-1/2 -translate-x-1/2">
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.35 }}
              className="relative"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-[-30%] bottom-0 h-28 rounded-full bg-[radial-gradient(closest-side,rgba(255,43,70,0.28),transparent)]"
              />
              <TreeArt rows={48} fontPx={4.4} className="relative" />
            </motion.div>
          </div>

          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.3em] text-holly-400">
            <span className="text-white/40">[</span> private · invite only <span className="text-white/40">]</span>
          </p>
          <h1 className="mt-4 flex flex-col items-center gap-1.5">
            <span className="sr-only">Christmas Feast 2026</span>
            <Banner lines={BANNER_XMAS} maxPx={13} gutter="6rem" className="text-holly-500 drop-shadow-[0_0_14px_rgba(255,43,70,0.45)]" />
            <Banner lines={BANNER_FEAST} maxPx={13} gutter="6rem" delay={200} className="text-white" />
            <span aria-hidden="true" className="mt-1 flex items-center gap-3 font-display text-3xl leading-none text-holly-400">
              <span className="font-mono text-sm text-white/40">*~*</span>
              2026
              <span className="font-mono text-sm text-white/40">*~*</span>
            </span>
          </h1>
          <p className="mt-4 text-sm text-white/65">
            <span className="text-holly-500">&gt;</span> say the magic word to get in<span className="animate-blink">_</span>
          </p>

          <form onSubmit={submit} className="mt-7 space-y-3 text-left" noValidate aria-busy={busy}>
            <label htmlFor="password" className="block font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/70">
              Password
            </label>
            <div className="relative">
              <Glyph name="key" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-holly-500" />
              <input
                id="password"
                name="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`field pl-14 pr-14 ${error ? 'field-error' : ''}`}
                placeholder="The magic word…"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[3px] text-white/70 hover:bg-white/10 hover:text-white"
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                <Glyph name={show ? 'eyeOff' : 'eye'} className="text-sm" />
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
            <button type="submit" className="btn-primary w-full text-sm" disabled={!password || busy}>
              <span className="candy-sheen opacity-40" aria-hidden="true" />
              <span className="relative inline-flex items-center gap-2">
                {busy ? <Spinner /> : <Glyph name="unlock" />}
                {busy ? 'Checking the list…' : 'Unlock the grotto'}
              </span>
            </button>
          </form>
        </motion.div>
      </motion.div>
    </motion.main>
  );
}
