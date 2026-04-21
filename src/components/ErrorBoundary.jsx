import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-wa-bg p-8 text-center h-full w-full">
          <div className="bg-wa-panel p-6 rounded-2xl shadow-xl max-w-md w-full border border-wa-border animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-wa-text text-[20px] font-semibold mb-2">Terjadi Kesalahan</h2>
            <p className="text-wa-secondary text-[14px] leading-relaxed mb-6">
              Aplikasi mengalami kendala saat merender pesan ini. Kesalahan sudah dicatat di konsol browser.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-wa-green hover:bg-opacity-90 text-white font-medium rounded-xl w-full py-3 transition-colors shadow-sm"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
