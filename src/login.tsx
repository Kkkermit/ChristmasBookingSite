// Entry point for login.html - the only page served to visitors without a
// session. It must not import anything about the event itself (menu, orders):
// scripts/check-public-assets.mjs fails the build if it does.
import { MotionConfig } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Backdrop } from './components/ascii/Backdrop';
import { FooterScene } from './components/ascii/FooterScene';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginScreen } from './components/LoginScreen';
import { OfflineBanner } from './components/states';
import { ToastProvider } from './components/Toasts';
import './index.css';

function LoginPage() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <div className="relative min-h-dvh overflow-x-clip">
          <Backdrop beside />
          <OfflineBanner position="top-4" />
          <ErrorBoundary>
            {/* Load the real app once the session cookie is set. */}
            <LoginScreen beside onSuccess={() => setTimeout(() => window.location.replace('/'), 450)} />
          </ErrorBoundary>
          <FooterScene />
        </div>
      </ToastProvider>
    </MotionConfig>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>,
);
