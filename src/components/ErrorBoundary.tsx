import { RefreshCw, TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defence: if a component crashes, show a friendly page instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="relative z-10 flex min-h-dvh items-center justify-center p-6">
        <div className="glass max-w-md p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-holly-500/20 text-holly-400">
            <TriangleAlert className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-display text-3xl">Oh crumbs!</h1>
          <p className="mt-2 text-white/70">
            Something broke on this page. Your orders are safe - reloading usually sorts it out.
          </p>
          <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
