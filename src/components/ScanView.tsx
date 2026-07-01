import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, Upload, AlertCircle, Copy, Check, ExternalLink, Phone, Wifi, 
  Mail, MessageSquare, Image as ImageIcon, Sparkles, RefreshCw, ChevronRight, 
  RotateCcw, Info, Globe, Smartphone, Download
} from 'lucide-react';
import { parseQRContent } from '../utils';
import { DecodedResult } from '../types';

interface ScanViewProps {
  onNavigate: (view: 'home' | 'create') => void;
}

export default function ScanView({ onNavigate }: ScanViewProps) {
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Results
  const [decodedResult, setDecodedResult] = useState<DecodedResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera streaming completely
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Play a beautiful tactile sci-fi beep sound using Web Audio API
  const playSuccessBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); // High pitch success tone
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio Context beep prevented:', e);
    }
  };

  // Initialize and start Camera Media Streams
  const startCamera = async () => {
    setCameraError(null);
    setDecodedResult(null);
    
    try {
      // First, stop any existing streams
      if (streamRef.current) {
        stopCamera();
      }

      const constraints = {
        video: { 
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS
        videoRef.current.play();
        setCameraActive(true);
        setCameraError(null);
        
        // Start scanning loop once video plays
        videoRef.current.onloadedmetadata = () => {
          animationFrameRef.current = requestAnimationFrame(scanLoop);
        };
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permission Denied. Please enable camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No video camera was detected on this device.');
      } else {
        setCameraError('Could not connect to camera: ' + (err.message || 'Unknown error'));
      }
      setCameraActive(false);
    }
  };

  // Primary requestAnimationFrame scanning cycle
  const scanLoop = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      animationFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
      // Match canvas sizes with video feed
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw current video frame onto offscreen canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Decode with jsQR
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        // Success! Stop camera, beep, and parse results
        playSuccessBeep();
        const parsed = parseQRContent(code.data);
        setDecodedResult(parsed);
        stopCamera();
        return; // Break scan loop
      }
    }

    // Keep loop active
    animationFrameRef.current = requestAnimationFrame(scanLoop);
  };

  // Manage transitions between Camera and Upload Tabs
  useEffect(() => {
    if (scanMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanMode]);

  // Handle uploaded image scanning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setDecodedResult(null);
    setIsProcessingUpload(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            playSuccessBeep();
            const parsed = parseQRContent(code.data);
            setDecodedResult(parsed);
          } else {
            setUploadError('No QR Code was found in this picture. Try adjusting the lighting or cropping closer to the QR grid.');
          }
        } else {
          setUploadError('Unable to process the image format.');
        }
        setIsProcessingUpload(false);
      };
      img.onerror = () => {
        setUploadError('Failed to read the file as an image.');
        setIsProcessingUpload(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Action helpers based on QR Type
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const getQRTypeIcon = (type: string) => {
    switch (type) {
      case 'url': return <Globe className="h-5 w-5 text-blue-400" />;
      case 'phone': return <Phone className="h-5 w-5 text-green-400" />;
      case 'wifi': return <Wifi className="h-5 w-5 text-blue-400" />;
      case 'email': return <Mail className="h-5 w-5 text-purple-400" />;
      case 'sms': return <MessageSquare className="h-5 w-5 text-pink-400" />;
      case 'image': return <ImageIcon className="h-5 w-5 text-yellow-400" />;
      default: return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleDownloadImagePayload = (base64Data: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = `alamtech-decoded-image.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10" id="scan-view-main">
      {/* Title & Swap Action header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="scan-view-title">
        <div>
          <h2 className="font-sans text-3xl font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
            <span className="text-blue-500">Scan</span>
            <span>QR Code</span>
          </h2>
          <p className="font-sans text-sm text-gray-400 mt-1">
            Scan via real-time camera stream or upload high-resolution images for local instant decoding.
          </p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="self-start sm:self-center inline-flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer uppercase tracking-wider"
          id="btn-switch-to-creator"
        >
          <span>Need to Generate? Create QR</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Switch Controls (Camera vs File) */}
      <div className="flex rounded-xl bg-[#0a0a0a] p-1 border border-white/5 max-w-md mx-auto mb-8" id="scan-mode-tabs">
        <button
          onClick={() => setScanMode('camera')}
          className={`flex-1 flex items-center justify-center space-x-2 rounded-lg py-2.5 font-sans text-xs font-bold transition-all cursor-pointer ${
            scanMode === 'camera'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
          id="btn-camera-tab"
        >
          <Camera className="h-4 w-4" />
          <span>Device Camera</span>
        </button>
        
        <button
          onClick={() => setScanMode('upload')}
          className={`flex-1 flex items-center justify-center space-x-2 rounded-lg py-2.5 font-sans text-xs font-bold transition-all cursor-pointer ${
            scanMode === 'upload'
              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
          id="btn-upload-tab"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Image</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* VIEW 1: RESULTS LAYOUT */}
        {decodedResult ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 sm:p-8 max-w-2xl mx-auto"
            id="scanner-results-container"
          >
            {/* Header */}
            <div className="flex items-center space-x-3 border-b border-white/5 pb-5 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                {getQRTypeIcon(decodedResult.type)}
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Successfully Decoded</span>
                <h3 className="font-sans text-lg font-bold text-white uppercase tracking-wider">{decodedResult.parsedData.title}</h3>
              </div>
            </div>

            {/* Core Decoded Payload */}
            <div className="mb-6 space-y-2">
              <label className="font-sans text-xs font-semibold text-gray-400">Decoded Content</label>
              
              {/* Type-Specific Smart Rendering */}
              {decodedResult.type === 'image' && decodedResult.parsedData.value.startsWith('data:image/') ? (
                <div className="rounded-xl border border-white/10 bg-[#050505]/40 p-4 space-y-4">
                  <div className="flex items-center justify-center">
                    <img 
                      src={decodedResult.parsedData.value} 
                      alt="Scanned Compressed payload" 
                      className="max-h-64 rounded-lg object-contain bg-white p-2 border border-white/10 max-w-full"
                    />
                  </div>
                  <button
                    onClick={() => handleDownloadImagePayload(decodedResult.parsedData.value)}
                    className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 font-sans text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Image File</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-[#050505] p-4 sm:p-5 font-mono text-sm text-gray-100 whitespace-pre-wrap break-all select-all leading-relaxed relative">
                  {decodedResult.parsedData.displayValue}
                </div>
              )}
            </div>

            {/* Smart Contextual Action Button */}
            {decodedResult.parsedData.actionUrl && (
              <a
                href={decodedResult.parsedData.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all py-3.5 font-sans text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] mb-4 cursor-pointer uppercase tracking-wider"
                id="btn-result-smart-action"
              >
                {decodedResult.type === 'url' && <ExternalLink className="h-4.5 w-4.5" />}
                {decodedResult.type === 'phone' && <Phone className="h-4.5 w-4.5" />}
                {decodedResult.type === 'email' && <Mail className="h-4.5 w-4.5" />}
                {decodedResult.type === 'sms' && <MessageSquare className="h-4.5 w-4.5" />}
                <span>{decodedResult.parsedData.actionLabel}</span>
              </a>
            )}

            {/* Quick Secondary Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => copyToClipboard(decodedResult.rawText)}
                className="flex items-center justify-center space-x-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all py-3 font-sans text-xs font-semibold text-gray-200 cursor-pointer"
                id="btn-copy-result-text"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                <span>{copied ? 'Copied Content' : 'Copy Text'}</span>
              </button>

              <button
                onClick={() => {
                  setDecodedResult(null);
                  if (scanMode === 'camera') startCamera();
                }}
                className="flex items-center justify-center space-x-2 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 active:scale-[0.98] transition-all py-3 font-sans text-xs font-semibold text-blue-400 cursor-pointer"
                id="btn-scan-again"
              >
                <RotateCcw className="h-4 w-4 animate-spin-slow" />
                <span>Scan Another</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* VIEW 2: INTERACTIVE DECODERS (Camera or File upload) */
          <motion.div
            key="scanner-workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Tab 1: Camera Scanning Workspace */}
            {scanMode === 'camera' && (
              <div className="relative max-w-xl mx-auto" id="camera-workspace-panel">
                <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden border-2 border-white/10 bg-[#050505] shadow-2xl flex items-center justify-center">
                  
                  {/* Invisible working canvas used for grabbing raw video frame vectors */}
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Real-time HTML Video Feed */}
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    muted
                    playsInline
                  />

                  {/* Neon Tech Overlay Frame */}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 bg-[#050505]/30">
                      {/* Interactive box corners highlighting target bounds */}
                      <div className="relative w-64 h-64 border border-blue-500/20 rounded-xl flex items-center justify-center">
                        {/* Scanning Moving laser line */}
                        <div className="scanner-line absolute left-[5%] right-[5%] h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-md shadow-blue-500" />
                        
                        {/* Corner Brackets */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                      </div>
                      
                      <div className="mt-6 text-center rounded-lg bg-[#050505]/90 border border-white/10 px-4 py-1.5 backdrop-blur-sm">
                        <p className="font-sans text-xs text-blue-400 font-bold tracking-wide animate-pulse uppercase">
                          Detecting live QR signatures...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fallback state when Camera is denied or errored */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-[#0a0a0a]/90 flex flex-col items-center justify-center p-8 text-center" id="camera-error-message">
                      <AlertCircle className="h-12 w-12 text-red-500/80 mb-4" />
                      <h4 className="font-sans text-lg font-bold text-white mb-2 uppercase">Camera Access Restricted</h4>
                      <p className="font-sans text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
                        {cameraError}
                      </p>
                      <button
                        onClick={startCamera}
                        className="inline-flex items-center space-x-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-5 py-2.5 font-sans text-xs font-semibold text-blue-400 hover:bg-blue-500/25 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Retry Authorization</span>
                      </button>
                    </div>
                  )}

                  {/* Camera loading/booting state */}
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 bg-[#0a0a0a]/95 flex flex-col items-center justify-center p-8 text-center" id="camera-loading-state">
                      <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                      <h4 className="font-sans text-sm font-bold text-white mb-1 uppercase tracking-wider">Activating Camera Feed</h4>
                      <p className="font-sans text-xs text-gray-500 max-w-xs">
                        Connecting to device lens and starting browser sandbox...
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center space-x-2.5 rounded-xl border border-white/5 bg-[#0a0a0a]/20 p-4 max-w-xl mx-auto">
                  <Info className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                  <p className="font-sans text-[11px] text-gray-400 leading-normal">
                    For optimal scan rate, position the QR code directly inside the scanning frame corners. Keep the camera steady with bright lighting.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: File Upload Scanning Workspace */}
            {scanMode === 'upload' && (
              <div className="max-w-xl mx-auto space-y-6" id="upload-workspace-panel">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative cursor-pointer border-2 border-dashed border-white/10 hover:border-blue-500/30 rounded-2xl bg-[#0a0a0a]/20 p-10 flex flex-col items-center justify-center text-center transition-all shadow-xl"
                  id="scanner-upload-dropzone"
                >
                  <Upload className="h-12 w-12 text-gray-500 group-hover:text-blue-500 group-hover:scale-110 transition-all mb-4" />
                  <h4 className="font-sans text-base font-extrabold text-white mb-2 uppercase tracking-wide">Import QR Code Image</h4>
                  <p className="font-sans text-sm text-gray-400 max-w-xs mb-1">
                    Select a photo, screenshot, or downloaded image from your gallery.
                  </p>
                  <p className="font-sans text-xs text-slate-500">
                    Supports JPG, PNG, WEBP, or SVG
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {isProcessingUpload && (
                  <div className="flex items-center justify-center space-x-2.5 bg-[#0a0a0a]/30 border border-white/10 p-4 rounded-xl text-gray-300 font-sans text-xs max-w-md mx-auto">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    <span>Analyzing image grid matrix and decoding vectors...</span>
                  </div>
                )}

                {uploadError && !isProcessingUpload && (
                  <div className="flex items-start space-x-3 bg-red-500/10 border border-red-500/20 p-4 rounded-xl max-w-md mx-auto text-red-400" id="upload-error-banner">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="font-sans font-bold text-xs text-white">Detection Failure</h5>
                      <p className="font-sans text-[11px] leading-relaxed">{uploadError}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
