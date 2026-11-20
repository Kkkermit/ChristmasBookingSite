import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AsciiArt } from './ascii/AsciiArt';
import { Glyph } from './ascii/Glyph';
import { ART_CRASH } from './ascii/pieces';

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
        <div className="glass flex max-w-md flex-col items-center p-8 text-center">
          <AsciiArt lines={ART_CRASH.lines} mask={ART_CRASH.mask} className="text-sm" />
          <h1 className="mt-4 font-display text-4xl leading-none">Oh crumbs!</h1>
          <p className="mt-3 text-sm text-white/70">
            Something broke on this page. Your orders are safe - reloading usually sorts it out.
          </p>
          <button type="button" className="btn-primary mt-6" onClick={() => window.location.reload()}>
            <Glyph name="refresh" />
            Reload
          </button>
        </div>
      </div>
    );
  }
}
