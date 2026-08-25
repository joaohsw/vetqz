/**
 * Layout — Shell principal da aplicação.
 * Header com logo e branding + container principal.
 */

import { PawPrint, Sparkles } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card mx-4 mt-4 mb-2 px-6 py-4 flex items-center justify-between rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
              <PawPrint className="w-5 h-5 text-white" />
            </div>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 absolute -top-1 -right-1" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              vetQz
            </h1>
            <p className="text-xs text-text-secondary -mt-0.5">
              Anatomia Veterinária com IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted px-3 py-1.5 rounded-full bg-bg-glass border border-border-glass">
            MVP v0.1
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-text-muted py-4 border-t border-border-glass">
        vetQz © {new Date().getFullYear()} — Powered by Gemini AI
      </footer>
    </div>
  );
}
