import React from 'react';
import { motion } from 'motion/react';
import { Scan, Plus, Shield, Zap, Sparkles, QrCode } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: 'create' | 'scan') => void;
}

export default function HomeView({ onNavigate }: HomeViewProps) {
  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 md:py-20 lg:py-24" id="home-view-container">
      {/* Hero Welcome Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl px-4 mb-16 sm:mb-20"
        id="home-hero-header"
      >
        <div className="inline-flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-blue-400 mb-6 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-spin-slow" />
          <span className="font-mono tracking-wider uppercase">Next-Gen Utility Suite</span>
        </div>
        
        <h2 className="font-sans text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white leading-tight mb-6">
          The Future of <span className="font-bold italic text-blue-500">Connectivity.</span>
        </h2>
        
        <p className="font-sans text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Create customized QR codes instantly or scan any image and live camera feeds. 
          Enjoy maximum privacy, lighting-fast decoding, and full offline-first functionality.
        </p>
      </motion.div>

      {/* Two Large Animated Interactive Buttons */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl px-4 sm:px-6"
        id="home-main-options"
      >
        {/* Option 1: Create QR Code (High contrast white button) */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -8, scale: 1.02 }}
          onClick={() => onNavigate('create')}
          className="group relative cursor-pointer rounded-2xl border border-white/5 bg-[#0a0a0a] p-8 text-center transition-all duration-300 hover:border-white/20 hover:bg-[#0f0f0f] shadow-2xl backdrop-blur-sm"
          id="btn-create-option"
        >
          {/* Subtle decorative background gradient */}
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-600/0 to-blue-600/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <Plus className="h-8 w-8" />
          </div>
          
          <h3 className="font-sans text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
            Create QR Code
          </h3>
          
          <p className="font-sans text-sm text-gray-400 leading-relaxed mb-6">
            Generate high-fidelity QR codes for text, URLs, phone numbers, email drafts, Wi-Fi configurations, and custom images.
          </p>
          
          <div className="inline-flex items-center space-x-2 rounded-xl bg-white text-black font-bold px-5 py-3 text-xs tracking-wider uppercase transition-all group-hover:bg-blue-600 group-hover:text-white shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <span>LAUNCH CREATOR</span>
            <Plus className="h-3.5 w-3.5" />
          </div>
        </motion.div>

        {/* Option 2: Scan QR Code (Outline dark button) */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -8, scale: 1.02 }}
          onClick={() => onNavigate('scan')}
          className="group relative cursor-pointer rounded-2xl border border-white/5 bg-[#0a0a0a] p-8 text-center transition-all duration-300 hover:border-white/20 hover:bg-[#0f0f0f] shadow-2xl backdrop-blur-sm"
          id="btn-scan-option"
        >
          {/* Subtle decorative background gradient */}
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-600/0 to-blue-600/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white transition-transform duration-300 group-hover:scale-110 group-hover:bg-blue-600/20 group-hover:text-blue-400">
            <Scan className="h-8 w-8" />
          </div>
          
          <h3 className="font-sans text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
            Scan QR Code
          </h3>
          
          <p className="font-sans text-sm text-gray-400 leading-relaxed mb-6">
            Point your device camera or upload an image file to instantly decode websites, Wi-Fi keys, emails, contacts, or texts.
          </p>
          
          <div className="inline-flex items-center space-x-2 rounded-xl border-2 border-white/20 hover:border-blue-500 text-white font-bold px-5 py-3 text-xs tracking-wider uppercase transition-all group-hover:bg-blue-500/5">
            <span>LAUNCH SCANNER</span>
            <Scan className="h-3.5 w-3.5" />
          </div>
        </motion.div>
      </motion.div>

      {/* Feature Badges Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-20 border-t border-white/5 pt-10 w-full max-w-4xl px-4"
        id="home-feature-badges"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div className="flex flex-col items-center sm:items-start p-4">
            <div className="flex items-center space-x-2 text-blue-500 mb-2">
              <Zap className="h-5 w-5" />
              <h4 className="font-sans font-semibold text-white text-sm">Instant Processing</h4>
            </div>
            <p className="font-sans text-xs text-gray-500 leading-relaxed">
              QR codes are rendered and decoded fully in-browser, offering lightning speeds with zero latency.
            </p>
          </div>
          
          <div className="flex flex-col items-center sm:items-start p-4">
            <div className="flex items-center space-x-2 text-blue-500 mb-2">
              <Shield className="h-5 w-5" />
              <h4 className="font-sans font-semibold text-white text-sm">Secure & Private</h4>
            </div>
            <p className="font-sans text-xs text-gray-500 leading-relaxed">
              Your camera feed and uploaded images never leave your device. All computations happen locally.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-start p-4">
            <div className="flex items-center space-x-2 text-blue-500 mb-2">
              <QrCode className="h-5 w-5" />
              <h4 className="font-sans font-semibold text-white text-sm">High Reliability</h4>
            </div>
            <p className="font-sans text-xs text-gray-500 leading-relaxed">
              Supports scanning from uneven camera surfaces, off-angles, low lighting, and low-contrast media.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
