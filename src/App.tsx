import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { AsciiArt } from './components/ascii/AsciiArt';
import { Backdrop } from './components/ascii/Backdrop';
import { FooterScene } from './components/ascii/FooterScene';
import { HangingOrnaments } from './components/ascii/HangingOrnaments';
import { ART_SNOWFLAKE } from './components/ascii/pieces';
import { Sleigh } from './components/ascii/Sleigh';
import { Dashboard } from './components/Dashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { OfflineBanner } from './components/states';
import { ToastProvider } from './components/Toasts';
import { api } from './lib/api';

type AuthState = 'checking' | 'signed-out' | 'signed-in';

export default function App() {
  const [auth, setAuth] = useState<AuthState>('checking');

  useEffect(() => {
    let cancelled = false;
    api
      .session()
      .then((s) => !cancelled && setAuth(s.authenticated ? 'signed-in' : 'signed-out'))
      .catch(() => !cancelled && setAuth('signed-out'));
    return () => {
      cancelled = true;
    };
  }, []);

  const signedOut = useCallback(() => setAuth('signed-out'), []);
  const signedIn = useCallback(() => setAuth('signed-in'), []);

  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="relative min-h-dvh overflow-x-clip">
          <Backdrop />
          <HangingOrnaments />
          <Sleigh />
          <OfflineBanner />
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              {auth === 'checking' && (
                <motion.div
                  key="checking"
                  className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-3"
                  exit={{ opacity: 0 }}
                  role="status"
                  aria-label="Loading"
                >
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                    <AsciiArt lines={ART_SNOWFLAKE.lines} mask={ART_SNOWFLAKE.mask} className="text-xl" />
                  </motion.span>
                  <span aria-hidden="true" className="font-mono text-xs uppercase tracking-[0.3em] text-white/50">
                    loading<span className="animate-blink">_</span>
                  </span>
                </motion.div>
              )}
              {auth === 'signed-out' && <LoginScreen key="login" onSuccess={signedIn} />}
              {auth === 'signed-in' && <Dashboard key="dashboard" onLoggedOut={signedOut} />}
            </AnimatePresence>
          </ErrorBoundary>
          <FooterScene />
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}
