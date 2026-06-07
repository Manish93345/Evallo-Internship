import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  /** Optional fallback override — defaults to the recovery screen. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Global error boundary.
 *
 * React error boundaries catch render-time crashes (not async / event
 * handler errors — those still belong in `try/catch`). In a take-home
 * project this is mostly insurance: if a component throws because the API
 * returned an unexpected shape, the user sees a sane recovery screen
 * instead of a white page.
 *
 *   • `componentDidCatch` is where we'd wire up Sentry / Logtail in prod.
 *   • The "Try again" button just resets local state — React will retry the
 *     subtree render. "Reload" is the harder reset for when state is bad.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep this lightweight — a production app would send to an error
    // reporting service here. We use console.error so it's still surfaced
    // in dev tools without polluting structured logs.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return <DefaultFallback error={this.state.error} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b1020]">
      <div className="w-full max-w-md rounded-2xl border border-rose-400/30 bg-[#121833] p-8 shadow-2xl">
        <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 border border-rose-400/40 flex items-center justify-center text-rose-300 mb-4">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold text-slate-100 text-center">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-slate-400 text-center">
          The page hit an unexpected error. You can try recovering, or reload the
          app if things still look off.
        </p>
        <pre className="mt-4 text-[11px] text-rose-200/80 bg-rose-500/5 border border-rose-400/20 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {error.message}
        </pre>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Reload app
          </Button>
          <Button size="sm" onClick={onReset}>
            <RotateCw className="h-3.5 w-3.5" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
