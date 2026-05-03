import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex h-[calc(100vh-40px)] items-center justify-center bg-gray-900"
        >
          <div className="bg-gray-800 border border-red-900/50 rounded-xl p-8 max-w-md w-full mx-4 text-center">
            <svg
              className="w-12 h-12 text-red-400 mx-auto mb-4"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <h1 className="font-heading font-bold text-2xl text-white mb-2">
              Something went wrong.
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              An unexpected error occurred and this part of the app could not load. Reload the app
              to recover — your dynasty data is safe.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors mb-4"
            >
              Reload App
            </button>
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-400 underline cursor-pointer transition-colors"
              aria-expanded={this.state.showDetails}
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
            >
              {this.state.showDetails ? 'Hide error details' : 'Show error details'}
            </button>
            {this.state.showDetails && (
              <pre className="mt-2 text-left bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-400 font-mono overflow-auto max-h-32">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
