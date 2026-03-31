import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6 font-sans">
            <div className="max-w-md w-full space-y-6 text-center">
              <div className="inline-flex p-4 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                The application encountered an unexpected error. Please try refreshing the page.
              </p>
              {this.state.error && (
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left overflow-auto max-h-48">
                  <code className="text-xs text-red-400 font-mono break-all">
                    {this.state.error.toString()}
                  </code>
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 rounded-2xl bg-white text-black font-bold hover:bg-zinc-200 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
