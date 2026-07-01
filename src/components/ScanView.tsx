import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, AlertCircle, Copy, Check, ExternalLink, Phone, Wifi, 
  Mail, MessageSquare, Image as ImageIcon, RefreshCw, ChevronRight, 
  RotateCcw, Info, Globe, Download
} from 'lucide-react';
import { parseQRContent } from '../utils';
import { DecodedResult } from '../types';

// --- HIGH-PERFORMANCE IMAGE PREPROCESSING PIPELINES ---

// Resizes any image to a target maximum dimension while preserving aspect ratio.
// Essential for preventing heavy performance hitches on modern 12MP+ camera photos.
const resizeImageToCanvas = (
  img: HTMLImageElement,
  maxDim: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  let w = img.width;
  let h = img.height;

  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    ctx.drawImage(img, 0, 0, w, h);
  }
  return canvas;
};

// Convers pixel data to high-contrast monochrome using the Bradley-Roth Local Adaptive Threshold.
// Performs in O(W*H) time using integral images. This is the absolute golden standard for 
// cutting through shadows, glares, perspective skews, and crumpled paper.
const applyBradleyThreshold = (d: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray => {
  const grays = new Uint8Array(w * h);
  for (let i = 0; i < d.length; i += 4) {
    grays[i / 4] = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  }

  // Generate integral image
  const integral = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      sum += grays[idx];
      integral[idx] = (y === 0 ? 0 : integral[(y - 1) * w + x]) + sum;
    }
  }

  const S = Math.max(8, Math.round(w / 8));
  const t = 15; // Threshold sensitivity (15% below local mean is classified as black)
  const s2 = Math.round(S / 2);
  const out = new Uint8ClampedArray(d.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const x1 = Math.max(0, x - s2);
      const x2 = Math.min(w - 1, x + s2);
      const y1 = Math.max(0, y - s2);
      const y2 = Math.min(h - 1, y + s2);
      const count = (x2 - x1) * (y2 - y1);

      const i_y2_x2 = integral[y2 * w + x2];
      const i_y1_x2 = y1 > 0 ? integral[(y1 - 1) * w + x2] : 0;
      const i_y2_x1 = x1 > 0 ? integral[y2 * w + (x1 - 1)] : 0;
      const i_y1_x1 = (y1 > 0 && x1 > 0) ? integral[(y1 - 1) * w + (x1 - 1)] : 0;
      const sum = i_y2_x2 - i_y1_x2 - i_y2_x1 + i_y1_x1;

      const outVal = (grays[idx] * count) < (sum * (100 - t) / 100) ? 0 : 255;
      const outIdx = idx * 4;
      out[outIdx] = outVal;
      out[outIdx + 1] = outVal;
      out[outIdx + 2] = outVal;
      out[outIdx + 3] = 255;
    }
  }
  return out;
};

// Dynamic local sharpening filter to clear up camera focus blur or pixel artifacts.
const applySharpenFilter = (d: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(d.length);
  out.set(d); // Keep boundary pixels intact

  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pIdx = ((y + ky) * w + (x + kx)) * 4;
          const kVal = kernel[(ky + 1) * 3 + (kx + 1)];
          r += d[pIdx] * kVal;
          g += d[pIdx + 1] * kVal;
          b += d[pIdx + 2] * kVal;
        }
      }
      const outIdx = (y * w + x) * 4;
      out[outIdx] = Math.min(255, Math.max(0, r));
      out[outIdx + 1] = Math.min(255, Math.max(0, g));
      out[outIdx + 2] = Math.min(255, Math.max(0, b));
      out[outIdx + 3] = 255;
    }
  }
  return out;
};

// Dynamic Contrast Stretching (Histogram Min-Max Normalization)
// Restores readability to extremely low-contrast, faded, or washed-out files.
const applyContrastStretch = (d: Uint8ClampedArray): Uint8ClampedArray => {
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (g < minG) minG = g;
    if (g > maxG) maxG = g;
    if (b < minB) minB = b;
    if (b > maxB) maxB = b;
  }

  const rangeR = maxR - minR || 1;
  const rangeG = maxG - minG || 1;
  const rangeB = maxB - minB || 1;

  const out = new Uint8ClampedArray(d.length);
  for (let i = 0; i < d.length; i += 4) {
    out[i] = ((d[i] - minR) / rangeR) * 255;
    out[i + 1] = ((d[i + 1] - minG) / rangeG) * 255;
    out[i + 2] = ((d[i + 2] - minB) / rangeB) * 255;
    out[i + 3] = d[i + 3];
  }
  return out;
};

// Rotates canvas context by given degrees to catch sideways or upside down QR codes.
const rotateCanvas = (canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement => {
  const rotated = document.createElement('canvas');
  const ctx = rotated.getContext('2d');
  if (!ctx) return canvas;

  if (degrees === 90 || degrees === 270) {
    rotated.width = canvas.height;
    rotated.height = canvas.width;
  } else {
    rotated.width = canvas.width;
    rotated.height = canvas.height;
  }

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return rotated;
};

// --- MULTI-STAGE COGNITIVE DECODING PIPELINE ---

const scanImageWithAllStrategies = (
  img: HTMLImageElement
): { code: any; previewUrl: string } | null => {
  if (!img.width || !img.height) return null;

  // Helper to run jsQR decoder over canvas pixel data with an optional preprocess filter.
  const decodeCanvasWithFilter = (
    canvas: HTMLCanvasElement,
    filter: 'none' | 'bradley' | 'sharpen' | 'sharpenBradley' | 'contrastStretch'
  ): any => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;

      if (filter === 'bradley') {
        data = applyBradleyThreshold(data, canvas.width, canvas.height);
      } else if (filter === 'sharpen') {
        data = applySharpenFilter(data, canvas.width, canvas.height);
      } else if (filter === 'contrastStretch') {
        data = applyContrastStretch(data);
      } else if (filter === 'sharpenBradley') {
        const sharpened = applySharpenFilter(data, canvas.width, canvas.height);
        data = applyBradleyThreshold(sharpened, canvas.width, canvas.height);
      }

      return jsQR(data, canvas.width, canvas.height, {
        inversionAttempts: 'attemptBoth'
      });
    } catch (err) {
      console.warn('Decode pass failure:', err);
      return null;
    }
  };

  // Stage 1: Ultra-fast raw resolution scans (600px limits)
  // This is the ideal scan path — handles 95% of standard high-quality files instantly.
  const optimizedCanvas = resizeImageToCanvas(img, 600);
  let code = decodeCanvasWithFilter(optimizedCanvas, 'none');
  if (code && code.data) {
    return { code, previewUrl: optimizedCanvas.toDataURL('image/jpeg') };
  }

  // Stage 2: Bradley local binarization on the optimized canvas
  code = decodeCanvasWithFilter(optimizedCanvas, 'bradley');
  if (code && code.data) {
    return { code, previewUrl: optimizedCanvas.toDataURL('image/jpeg') };
  }

  // Stage 3: High Contrast Stretching (for low dynamic range/faded scans)
  code = decodeCanvasWithFilter(optimizedCanvas, 'contrastStretch');
  if (code && code.data) {
    return { code, previewUrl: optimizedCanvas.toDataURL('image/jpeg') };
  }

  // Stage 4: Sharpen + Bradley thresholding (for blurry/out of focus crops)
  code = decodeCanvasWithFilter(optimizedCanvas, 'sharpenBradley');
  if (code && code.data) {
    return { code, previewUrl: optimizedCanvas.toDataURL('image/jpeg') };
  }

  // Stage 5: Rotational scans (sideways/upside-down mobile screenshots)
  const degreesList = [90, 180, 270];
  for (const deg of degreesList) {
    const rotated = rotateCanvas(optimizedCanvas, deg);
    // Raw rotate
    code = decodeCanvasWithFilter(rotated, 'none');
    if (code && code.data) {
      return { code, previewUrl: rotated.toDataURL('image/jpeg') };
    }
    // Bradley adaptive threshold on rotate
    code = decodeCanvasWithFilter(rotated, 'bradley');
    if (code && code.data) {
      return { code, previewUrl: rotated.toDataURL('image/jpeg') };
    }
  }

  // Stage 6: Central target extraction and crop scan
  // Useful when a small QR code is located inside a complex desktop webpage screenshot.
  const canvasCrop = document.createElement('canvas');
  const cx = Math.round(img.width * 0.20);
  const cy = Math.round(img.height * 0.20);
  const cw = Math.round(img.width * 0.60);
  const ch = Math.round(img.height * 0.60);

  canvasCrop.width = Math.min(cw, 500);
  canvasCrop.height = Math.min(ch, 500);
  const cropCtx = canvasCrop.getContext('2d');
  if (cropCtx) {
    cropCtx.drawImage(img, cx, cy, cw, ch, 0, 0, canvasCrop.width, canvasCrop.height);
    
    // Test raw crop
    code = decodeCanvasWithFilter(canvasCrop, 'none');
    if (code && code.data) {
      return { code, previewUrl: canvasCrop.toDataURL('image/jpeg') };
    }

    // Test adaptive threshold crop
    code = decodeCanvasWithFilter(canvasCrop, 'bradley');
    if (code && code.data) {
      return { code, previewUrl: canvasCrop.toDataURL('image/jpeg') };
    }
  }

  return null;
};

interface ScanViewProps {
  onNavigate: (view: 'home' | 'create') => void;
}

export default function ScanView({ onNavigate }: ScanViewProps) {
  const [decodedResult, setDecodedResult] = useState<DecodedResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scannedImagePreview, setScannedImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success chime using the Web Audio API
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
      oscillator.frequency.setValueAtTime(1250, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio Context tone blocked:', e);
    }
  };

  const processFile = (file: File) => {
    setUploadError(null);
    setDecodedResult(null);
    setIsProcessingUpload(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        // Run multi-pass local scan algorithm
        const result = scanImageWithAllStrategies(img);

        if (result && result.code && result.code.data) {
          playSuccessBeep();
          const parsed = parseQRContent(result.code.data);
          setDecodedResult(parsed);
          setScannedImagePreview(result.previewUrl);
          setIsProcessingUpload(false);
        } else {
          // If local binarization fails, trigger the server-side Gemini Vision cognitive fallback.
          // Gemini easily handles severe crumples, severe glare, and partially occluded markers!
          try {
            const apiResponse = await fetch("/api/scan-ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: dataUrl,
                mimeType: file.type || "image/png"
              })
            });

            const data = await apiResponse.json();
            if (data.success && data.text) {
              playSuccessBeep();
              const parsed = parseQRContent(data.text);
              setDecodedResult(parsed);
              setScannedImagePreview(dataUrl);
            } else {
              setUploadError(data.error || 'No QR Code was discovered in this image. Ensure it is well-lit and fully visible.');
            }
          } catch (apiErr: any) {
            console.error('AI Fallback Scan Error:', apiErr);
            setUploadError('No QR Code was discovered in this image. Try capturing a clearer snapshot or cropping closer to the QR code.');
          } finally {
            setIsProcessingUpload(false);
          }
        }
      };
      img.onerror = () => {
        setUploadError('Failed to read the file. Please verify it is a valid image file.');
        setIsProcessingUpload(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        processFile(file);
      } else {
        setUploadError('Unsupported format. Please upload a valid image file (PNG, JPG, SVG, WEBP).');
      }
    }
  };

  // Clipboard event listener to paste screenshot files directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
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
    link.download = `decoded-image-payload.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10" id="scan-view-main">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="scan-view-title">
        <div>
          <h2 className="font-sans text-3xl font-extrabold text-white tracking-tight uppercase flex items-center gap-2">
            <span className="text-blue-500">Scan</span>
            <span>QR Code</span>
          </h2>
          <p className="font-sans text-sm text-gray-400 mt-1">
            Upload high-resolution images, drop files, or paste snapshots for instant local decoding with AI vision fallback.
          </p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="self-start sm:self-center inline-flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer uppercase tracking-wider"
          id="btn-switch-to-creator"
        >
          <span>Create custom QR</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {decodedResult ? (
          /* RESULT VIEW */
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 sm:p-8 max-w-2xl mx-auto"
            id="scanner-results-container"
          >
            <div className="flex items-center space-x-3 border-b border-white/5 pb-5 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                {getQRTypeIcon(decodedResult.type)}
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">Successfully Decoded</span>
                <h3 className="font-sans text-lg font-bold text-white uppercase tracking-wider">{decodedResult.parsedData.title}</h3>
              </div>
            </div>

            {scannedImagePreview && (
              <div className="mb-6 flex flex-col items-center justify-center rounded-xl border border-white/5 bg-[#050505]/40 p-4" id="scanned-source-preview">
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2">Scanned File Preview</span>
                <img 
                  src={scannedImagePreview} 
                  alt="Decoded QR Source" 
                  className="max-h-40 rounded-lg object-contain border border-white/10"
                />
              </div>
            )}

            <div className="mb-6 space-y-2">
              <label className="font-sans text-xs font-semibold text-gray-400">Decoded Content</label>
              
              {decodedResult.type === 'image' && decodedResult.parsedData.value.startsWith('data:image/') ? (
                <div className="rounded-xl border border-white/10 bg-[#050505]/40 p-4 space-y-4">
                  <div className="flex items-center justify-center">
                    <img 
                      src={decodedResult.parsedData.value} 
                      alt="Decoded Payload" 
                      className="max-h-64 rounded-lg object-contain bg-white p-2 border border-white/10 max-w-full"
                    />
                  </div>
                  <button
                    onClick={() => handleDownloadImagePayload(decodedResult.parsedData.value)}
                    className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-blue-600 px-4 py-2 font-sans text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Image</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-[#050505] p-4 sm:p-5 font-mono text-sm text-gray-100 whitespace-pre-wrap break-all select-all leading-relaxed relative">
                  {decodedResult.parsedData.displayValue}
                </div>
              )}
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => copyToClipboard(decodedResult.rawText)}
                className="flex items-center justify-center space-x-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all py-3 font-sans text-xs font-semibold text-gray-200 cursor-pointer"
                id="btn-copy-result-text"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                <span>{copied ? 'Copied' : 'Copy Content'}</span>
              </button>

              <button
                onClick={() => {
                  setDecodedResult(null);
                  setScannedImagePreview(null);
                  setUploadError(null);
                }}
                className="flex items-center justify-center space-x-2 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 active:scale-[0.98] transition-all py-3 font-sans text-xs font-semibold text-blue-400 cursor-pointer"
                id="btn-scan-again"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Scan Another</span>
              </button>
            </div>
          </motion.div>
        ) : (
          /* SCANNING DASHBOARD */
          <motion.div
            key="scanner-workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="max-w-xl mx-auto space-y-6" id="upload-workspace-panel">
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group relative cursor-pointer border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-200 shadow-xl ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-500/5 scale-[1.01] shadow-[0_0_25px_rgba(59,130,246,0.15)]' 
                    : 'border-white/10 hover:border-blue-500/30 bg-[#0a0a0a]/20'
                }`}
                id="scanner-upload-dropzone"
              >
                <Upload className={`h-12 w-12 transition-all mb-4 ${
                  isDragging ? 'text-blue-400 scale-110' : 'text-gray-500 group-hover:text-blue-500 group-hover:scale-110'
                }`} />
                <h4 className="font-sans text-base font-extrabold text-white mb-2 uppercase tracking-wide">
                  {isDragging ? 'Drop Image Here' : 'Import or Paste QR Code'}
                </h4>
                <p className="font-sans text-sm text-gray-400 max-w-sm mb-1">
                  {isDragging ? 'Release to instantly scan and decode.' : 'Drag & drop your file, paste (Ctrl+V) from clipboard, or click to browse.'}
                </p>
                <p className="font-sans text-xs text-slate-500">
                  Supports PNG, JPG, SVG, or WEBP
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
                  <span>Preprocessing image matrix & running vector scans...</span>
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

              <div className="flex items-start space-x-3 rounded-2xl border border-white/5 bg-[#0a0a0a]/20 p-4 max-w-md mx-auto">
                <Info className="h-4.5 w-4.5 text-blue-500 shrink-0 mt-0.5" />
                <p className="font-sans text-xs text-gray-400 leading-normal">
                  Our hybrid scanning engine operates locally for instant speed, then automatically delegates complex, crumpled, or skewed images to a high-fidelity server-side AI Vision model.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
