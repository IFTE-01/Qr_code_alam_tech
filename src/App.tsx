import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Analytics } from '@vercel/analytics/react';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import CreateView from './components/CreateView';
import ScanView from './components/ScanView';
import { Cpu, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'create' | 'scan'>('home');

  const handleNavigate = (view: 'home' | 'create' | 'scan') => {
    setCurrentView(view);
  };

  // Standard slide-fade animation transition settings
  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  return (
    <div className="relative min-h-screen bg-brand-bg text-slate-100 flex flex-col overflow-hidden font-sans select-none" id="app-root-container">
      {/* Premium ambient decorative glow blobs (hidden on mobile for performance, gorgeous on desktop) */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-brand-cyan/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-brand-purple/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] left-[35%] h-[400px] w-[400px] rounded-full bg-brand-indigo/5 blur-[110px] pointer-events-none -z-10" />

      {/* Grid line overlay */}
      <div className="absolute inset-0 grid-bg opacity-45 pointer-events-none -z-10" />

      {/* Primary Brand Navigation Header */}
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Container Workspace */}
      <main className="flex-grow flex flex-col relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-grow flex flex-col justify-start"
          >
            {currentView === 'home' && (
              <HomeView onNavigate={(view) => handleNavigate(view)} />
            )}

            {currentView === 'create' && (
              <CreateView onNavigate={handleNavigate} />
            )}

            {currentView === 'scan' && (
              <ScanView onNavigate={handleNavigate} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Simple, Professional, Literal Tech Footer */}
      <footer className="border-t border-brand-border/40 bg-[#04060b]/60 backdrop-blur-md py-6 px-4" id="app-footer">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-slate-500">
          
          <div className="flex items-center space-x-2">
            <Cpu className="h-3.5 w-3.5 text-brand-cyan" />
            <span className="font-semibold text-slate-400">Alam Tech Suite</span>
            <span className="text-slate-600">|</span>
            <span>v1.0.0</span>
          </div>

          <div className="flex items-center space-x-1 text-slate-500 text-center sm:text-right">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-indigo inline-block" />
            <span>Local sandbox decryption. No cloud data ingestion pipelines.</span>
          </div>

          <div>
            <span>© {new Date().getFullYear()} Alam Tech. All rights reserved.</span>
          </div>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
