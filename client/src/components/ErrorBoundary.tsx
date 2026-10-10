// ─── ErrorBoundary component — Catches and isolates render errors ───
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-deep-surface border border-petrol/80 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-alert-amber/15 border border-alert-amber/30 text-alert-amber flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-primary-text">
                {this.props.fallbackTitle || 'Emergency Command Centre — Display Recovery'}
              </h2>
              <p className="text-xs text-muted-text">
                An unexpected display error occurred while rendering the map or incident telemetry.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-midnight/90 border border-petrol/60 rounded-xl p-3 text-left font-mono text-xs text-red-400 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-teal text-midnight font-bold text-xs hover:bg-accent-teal/90 transition-all shadow-lg shadow-accent-teal/20"
            >
              <RefreshCw className="w-4 h-4" />
              Reset & Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
