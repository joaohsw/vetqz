/**
 * Layout — Application shell.
 *
 * Quiet header with wordmark, no emoji, no gradient text.
 * Follows Warm Humanist × Modern Tool language.
 */

import { PawPrint } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <PawPrint className="w-4 h-4 text-surface-0" />
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-lg font-800 tracking-tight text-text-1">
              vetQz
            </span>
          </div>

          <span className="text-xs text-text-3 font-mono">
            v0.1
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="max-w-2xl mx-auto px-6 py-4 text-center text-xs text-text-3">
          vetQz &middot; Anatomia Veterinária com IA
        </div>
      </footer>
    </div>
  );
}
