import React from 'react';
import { QrCode, Cpu, Home, Scan, Plus } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'create' | 'scan';
  onNavigate: (view: 'home' | 'create' | 'scan') => void;
}

export default function Navbar({ currentView, onNavigate }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('home')}
          className="flex cursor-pointer items-center space-x-3 transition-opacity hover:opacity-90"
          id="navbar-brand-container"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold italic text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white">
            A
          </div>
          <div>
            <h1 className="font-sans text-xl font-bold tracking-tight uppercase text-white flex items-center gap-1.5">
              <span>Alam</span>
              <span className="text-blue-500">Tech</span>
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">QR PLATFORM</p>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center space-x-4">
          <nav className="flex items-center space-x-2" id="navbar-nav-actions">
            {currentView !== 'home' && (
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-sans text-xs font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                id="nav-btn-home"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('scan')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-sans text-xs font-semibold transition-all duration-200 ${
                currentView === 'scan'
                  ? 'bg-blue-600/15 text-blue-500 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
              id="nav-btn-scan"
            >
              <Scan className="h-4 w-4" />
              <span>Scan QR</span>
            </button>

            <button
              onClick={() => onNavigate('create')}
              className={`flex items-center space-x-1.5 rounded-lg px-3 py-1.5 font-sans text-xs font-semibold transition-all duration-200 ${
                currentView === 'create'
                  ? 'bg-blue-600/15 text-blue-500 border border-blue-500/30'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
              id="nav-btn-create"
            >
              <Plus className="h-4 w-4" />
              <span>Create QR</span>
            </button>
          </nav>

          {/* System Online badge */}
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10" id="system-online-badge">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">System Online</span>
          </div>
        </div>
      </div>
    </header>
  );
}
