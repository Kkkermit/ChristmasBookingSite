import { Snowflake } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Backdrop } from './components/decor/Backdrop';
import { Forest } from './components/decor/Forest';
import { HangingOrnaments } from './components/decor/HangingOrnaments';
import { Sleigh } from './components/decor/Sleigh';
import { Snowfall } from './components/decor/Snowfall';
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
          <Snowfall />
          <HangingOrnaments />
          <Sleigh />
          <OfflineBanner />
          <ErrorBoundary>
          <AnimatePresence mode="wait">
            {auth === 'checking' && (
              <motion.div
                key="checking"
                className="relative z-10 flex min-h-dvh items-center justify-center text-ice-300"
                exit={{ opacity: 0 }}
                role="status"
                aria-label="Loading"
              >
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}>
                  <Snowflake className="h-14 w-14" aria-hidden="true" />
                </motion.span>
              </motion.div>
            )}
            {auth === 'signed-out' && <LoginScreen key="login" onSuccess={signedIn} />}
            {auth === 'signed-in' && <Dashboard key="dashboard" onLoggedOut={signedOut} />}
          </AnimatePresence>
          </ErrorBoundary>
          <Forest />
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}
