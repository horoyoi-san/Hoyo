import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '../ui';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Describes the fenced area, e.g. the page name. */
  area?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Keeps a single failing view from white-screening the whole app: the
 * boundary renders a recovery card and preserves navigation.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.area ? `:${this.props.area}` : ''}]`, error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="card-surface card-hover rounded-xl p-8 max-w-md text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-bold text-white">
              {this.props.area ? `${this.props.area} crashed` : 'Something went wrong'}
            </h2>
            <p className="mt-2 text-xs text-ink-3 font-mono break-all leading-relaxed">
              {this.state.error.message || String(this.state.error)}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button variant="primary" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={this.reset}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
