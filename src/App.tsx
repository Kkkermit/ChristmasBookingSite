import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Backdrop } from './components/decor/Backdrop';
import { Forest } from './components/decor/Forest';
import { HangingOrnaments } from './components/decor/HangingOrnaments';
import { Sleigh } from './components/decor/Sleigh';
import { Snowfall } from './components/decor/Snowfall';
import { LoginScreen } from './components/LoginScreen';
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
          <AnimatePresence mode="wait">
            {auth === 'checking' && (
              <motion.div
                key="checking"
                className="relative z-10 flex min-h-dvh items-center justify-center text-6xl"
                exit={{ opacity: 0 }}
                role="status"
                aria-label="Loading"
              >
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                  ❄️
                </motion.span>
              </motion.div>
            )}
            {auth === 'signed-out' && <LoginScreen key="login" onSuccess={signedIn} />}
            {auth === 'signed-in' && <Dashboard key="dashboard" onLoggedOut={signedOut} />}
          </AnimatePresence>
          <Forest />
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}
