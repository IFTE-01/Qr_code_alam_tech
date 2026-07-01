import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Link2, AlignLeft, Phone, Wifi, Mail, MessageSquare,
  Download, Copy, Check, Sparkles, RefreshCw, ChevronRight, HelpCircle
} from 'lucide-react';
import { buildWiFiString, buildEmailString, buildSMSString } from '../utils';

interface CreateViewProps {
  onNavigate: (view: 'home' | 'scan') => void;
}

type TabType = 'url' | 'text' | 'phone' | 'wifi' | 'email' | 'sms';

export default function CreateView({ onNavigate }: CreateViewProps) {
  // Input form states
  const [activeTab, setActiveTab] = useState<TabType>('url');
  const [urlInput, setUrlInput] = useState('https://');
  const [textInput, setTextInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  // WiFi states
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSecurity, setWifiSecurity] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);

  // Email states
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // SMS states
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  // QR Customization States
  const [fgColor, setFgColor] = useState('#ffffff');
  const [bgColor, setBgColor] = useState('#0a0a0a'); // brand-card
  const [qrSize, setQrSize] = useState(350);
  const [qrMargin, setQrMargin] = useState(2);
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');

  // Generator result
  const [qrValue, setQrValue] = useState('https://alamtech.com');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedImg, setCopiedImg] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Color preset options
  const colorPresets = [
    { name: 'Classic Black/White', fg: '#000000', bg: '#ffffff' },
    { name: 'Sophisticated Blue', fg: '#3b82f6', bg: '#050505' },
    { name: 'Luxe Platinum', fg: '#f4f4f5', bg: '#0a0a0a' },
    { name: 'Glow Indigo', fg: '#6366f1', bg: '#0a0a0a' },
    { name: 'Pure White Glow', fg: '#ffffff', bg: '#0a0a0a' },
  ];

  // Map inputs to a single QR string value based on active tab
  useEffect(() => {
    let finalValue = '';
    switch (activeTab) {
      case 'url':
        finalValue = urlInput.trim();
        break;
      case 'text':
        finalValue = textInput;
        break;
      case 'phone':
        finalValue = phoneInput.trim() ? `tel:${phoneInput.trim()}` : '';
        break;
      case 'wifi':
        if (wifiSsid.trim()) {
          finalValue = buildWiFiString({
            ssid: wifiSsid.trim(),
            password: wifiPassword,
            encryption: wifiSecurity,
            hidden: wifiHidden,
          });
        }
        break;
      case 'email':
        if (emailAddress.trim()) {
          finalValue = buildEmailString({
            address: emailAddress.trim(),
            subject: emailSubject,
            body: emailBody,
          });
        }
        break;
      case 'sms':
        if (smsPhone.trim()) {
          finalValue = buildSMSString({
            phone: smsPhone.trim(),
            message: smsMessage,
          });
        }
        break;
    }

    if (finalValue) {
      setQrValue(finalValue);
    } else {
      setQrValue('Alam Tech'); // Default fallback placeholder
    }
  }, [
    activeTab, urlInput, textInput, phoneInput, 
    wifiSsid, wifiPassword, wifiSecurity, wifiHidden,
    emailAddress, emailSubject, emailBody,
    smsPhone, smsMessage
  ]);

  // Generate QR Code onto canvas and as Data URL
  useEffect(() => {
    if (!qrValue) return;

    const generate = async () => {
      try {
        // Render QR using 'qrcode' library options
        const opts = {
          errorCorrectionLevel: errorCorrection,
          margin: qrMargin,
          width: qrSize,
          color: {
            dark: fgColor,
            light: bgColor,
          },
        };

        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, qrValue, opts);
        }

        const dataUrl = await QRCode.toDataURL(qrValue, opts);
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    };

    generate();
  }, [qrValue, fgColor, bgColor, qrSize, qrMargin, errorCorrection]);

  // Download QR Code as PNG
  const downloadQRCode = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `alamtech-qr-${activeTab}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy PNG image to clipboard
  const copyQRImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopiedImg(true);
          setTimeout(() => setCopiedImg(false), 2000);
        } catch (e) {
          // Fallback to copying DataURL text if direct image copy fails (useful in safe sandboxes/iframes)
          await navigator.clipboard.writeText(qrDataUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Copy raw text value of QR code
  const copyRawTextValue = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const applyColorPreset = (fg: string, bg: string) => {
    setFgColor(fg);
    setBgColor(bg);
  };

  // Form field renderers
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10" id="create-view-main">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="create-view-title-section">
        <div>
          <h2 className="font-sans text-3xl font-bold uppercase text-white tracking-tight flex items-center gap-2">
            <span className="text-blue-500">Create</span>
            <span>QR Code</span>
          </h2>
          <p className="font-sans text-sm text-gray-400 mt-1">
            Choose a source type, fill out the payload parameters, and render your dynamic codes locally.
          </p>
        </div>
        <button
          onClick={() => onNavigate('scan')}
          className="self-start sm:self-center inline-flex items-center space-x-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-all cursor-pointer"
          id="btn-switch-to-scanner"
        >
          <span>Need to Scan? Open Scanner</span>
          <ChevronRight className="h-3.5 w-3.5 text-blue-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="creator-workspace-grid">
        
        {/* Left Side: Parameters Form (8 cols on lg) */}
        <div className="lg:col-span-7 space-y-6" id="params-form-panel">
          
          {/* Tabs Container */}
          <div className="overflow-x-auto pb-1" id="tabs-scroller">
            <div className="flex border-b border-white/5 min-w-max space-x-2">
              {[
                { id: 'url', label: 'URL', icon: Link2 },
                { id: 'text', label: 'Plain Text', icon: AlignLeft },
                { id: 'phone', label: 'Phone', icon: Phone },
                { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'sms', label: 'SMS', icon: MessageSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center space-x-2 border-b-2 px-4 py-3 font-sans text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                        : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    id={`tab-btn-${tab.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Container */}
          <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 sm:p-8 backdrop-blur-md" id="input-fields-container">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* 1. URL Form */}
                {activeTab === 'url' && (
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-semibold text-gray-300">Website Address (URL)</label>
                    <div className="relative rounded-xl border border-white/10 bg-[#050505] focus-within:border-blue-500/50 transition-colors">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-transparent px-4 py-3.5 font-sans text-sm text-white placeholder-gray-500 outline-none"
                        id="input-url-field"
                      />
                    </div>
                    <span className="font-sans text-[11px] text-gray-500">Must begin with https:// or http://</span>
                  </div>
                )}

                {/* 2. Text Form */}
                {activeTab === 'text' && (
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-semibold text-gray-300">Text Content</label>
                    <div className="relative rounded-xl border border-white/10 bg-[#050505] focus-within:border-blue-500/50 transition-colors">
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type or paste plain text here..."
                        rows={4}
                        className="w-full bg-transparent p-4 font-sans text-sm text-white placeholder-gray-500 outline-none resize-none"
                        id="input-text-field"
                      />
                    </div>
                    <span className="font-sans text-[11px] text-gray-500">Supports alphanumeric values, special symbols, and notes.</span>
                  </div>
                )}

                {/* 3. Phone Form */}
                {activeTab === 'phone' && (
                  <div className="space-y-2">
                    <label className="font-sans text-xs font-semibold text-gray-300">Telephone Number</label>
                    <div className="relative rounded-xl border border-white/10 bg-[#050505] focus-within:border-blue-500/50 transition-colors">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full bg-transparent px-4 py-3.5 font-sans text-sm text-white placeholder-gray-500 outline-none"
                        id="input-phone-field"
                      />
                    </div>
                    <span className="font-sans text-[11px] text-gray-500">Scanning this triggers the phone call dialogue automatically.</span>
                  </div>
                )}

                {/* 4. WiFi Form */}
                {activeTab === 'wifi' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="font-sans text-xs font-semibold text-gray-300">Network Name (SSID)</label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        placeholder="MyHomeWifi_5G"
                        className="w-full rounded-xl border border-white/10 bg-[#050505] px-4 py-3 font-sans text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
                        id="input-wifi-ssid"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="font-sans text-xs font-semibold text-gray-300">Security Type</label>
                        <select
                          value={wifiSecurity}
                          onChange={(e) => setWifiSecurity(e.target.value as any)}
                          className="w-full rounded-xl border border-white/10 bg-[#050505] px-4 py-3 font-sans text-sm text-white outline-none focus:border-blue-500/50 transition-colors"
                          id="input-wifi-security"
                        >
                          <option value="WPA" className="bg-[#050505]">WPA / WPA2 (Recommended)</option>
                          <option value="WEP" className="bg-[#050505]">WEP</option>
                          <option value="nopass" className="bg-[#050505]">No Password / Open</option>
                        </select>
                      </div>

                      {wifiSecurity !== 'nopass' && (
                        <div className="space-y-2">
                          <label className="font-sans text-xs font-semibold text-gray-300">Password</label>
                          <input
                            type="password"
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            placeholder="WPA Key..."
                            className="w-full rounded-xl border border-white/10 bg-[#050505] px-4 py-3 font-sans text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
                            id="input-wifi-pass"
                          />
                        </div>
                      )}
                    </div>

                    <label className="flex items-center space-x-3 cursor-pointer pt-2" id="input-wifi-hidden-container">
                      <input
                        type="checkbox"
                        checked={wifiHidden}
                        onChange={(e) => setWifiHidden(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-white/10 bg-[#050505] text-blue-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="font-sans text-xs text-gray-300">Hidden Network (SSID is broadcast-masked)</span>
                    </label>
                  </div>
                )}

                {/* 5. Email Form */}
                {activeTab === 'email' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="font-sans text-xs font-semibold text-gray-300">Recipient Email</label>
                      <input
                        type="email"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        placeholder="support@alamtech.com"
                        className="w-full rounded-xl border border-white/10 bg-[#050505] px-4 py-3 font-sans text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
                        id="input-email-address"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="font-sans text-xs font-semibold text-gray-300">Subject (Optional)</label>
                      <input
                        type="text"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        placeholder="Inquiry about services"
                        className="w-full rounded-xl border border-white/10 bg-[#050505] px-4 py-3 font-sans text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
                        id="input-email-subject"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="font-sans text-xs font-semibold text-gray-300">Message Body (Optional)</label>
                      <textarea
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Write your email body draft here..."
                        rows={3}
                        className="w-full bg-transparent rounded-xl border border-white/10 bg-[#050505] p-4 font-sans text-sm text-white placeholder-gray-500 outline-none resize-none focus:border-blue-500/50 transition-colors"
                        id="input-email-body"
                      />
                    </div>
                  </div>
                )}

                {/* 6. SMS Form */}
                {activeTab === 'sms' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="font-sans text-xs font-semibold text-gray-300">Recipient Phone Number</label>
                      <input
                        type="tel"
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        className="w-full rounded-xl border border-white/10 bg-[#050505] px-4 py-3 font-sans text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500/50 transition-colors"
                        id="input-sms-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="font-sans text-xs font-semibold text-gray-300">Pre-composed SMS Message (Optional)</label>
                      <textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        placeholder="I'm interested in buying this item!"
                        rows={3}
                        className="w-full bg-transparent rounded-xl border border-white/10 bg-[#050505] p-4 font-sans text-sm text-white placeholder-gray-500 outline-none resize-none focus:border-blue-500/50 transition-colors"
                        id="input-sms-body"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* QR Code Styling customization section */}
          <div className="rounded-2xl border border-white/5 bg-[#0a0a0a]/50 p-6 space-y-5" id="custom-design-panel">
            <h4 className="font-sans text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span>Design & Customization</span>
            </h4>

            {/* Quick Presets */}
            <div className="space-y-2">
              <span className="font-sans text-xs text-gray-400">Color Presets</span>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((preset) => {
                  const isMatch = fgColor === preset.fg && bgColor === preset.bg;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => applyColorPreset(preset.fg, preset.bg)}
                      className={`flex items-center space-x-1.5 rounded-lg border px-2.5 py-1.5 font-sans text-xs transition-all cursor-pointer ${
                        isMatch 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : 'border-white/10 bg-white/5 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex space-x-1">
                        <span className="h-3 w-3 rounded-full border border-gray-700" style={{ backgroundColor: preset.fg }} />
                        <span className="h-3 w-3 rounded-full border border-gray-700" style={{ backgroundColor: preset.bg }} />
                      </div>
                      <span className="hidden sm:inline text-[10px]">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Foreground Color */}
              <div className="space-y-2">
                <label className="font-sans text-xs text-gray-400 block">Foreground Color</label>
                <div className="flex items-center space-x-2 bg-[#050505] border border-white/10 rounded-xl px-3 py-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-transparent bg-transparent"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="bg-transparent text-white font-mono text-xs outline-none w-20"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <label className="font-sans text-xs text-gray-400 block">Background Color</label>
                <div className="flex items-center space-x-2 bg-[#050505] border border-white/10 rounded-xl px-3 py-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border border-transparent bg-transparent"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="bg-transparent text-white font-mono text-xs outline-none w-20"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quiet Zone Margin */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="font-sans text-xs text-gray-400">Quiet Zone (Margin)</label>
                  <span className="font-mono text-xs text-gray-500">{qrMargin} blocks</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={qrMargin}
                  onChange={(e) => setQrMargin(parseInt(e.target.value))}
                  className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>

              {/* Error Correction Level */}
              <div className="space-y-2">
                <label className="font-sans text-xs text-gray-400 block">Error Correction Level</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['L', 'M', 'Q', 'H'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setErrorCorrection(level)}
                      className={`rounded-lg py-1.5 font-sans text-xs font-semibold cursor-pointer border ${
                        errorCorrection === level
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Generated Preview (5 cols on lg) */}
        <div className="lg:col-span-5" id="generated-preview-panel">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-white/5 bg-[#0a0a0a] p-6 sm:p-8 flex flex-col items-center justify-center glow-indigo" id="preview-box">
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500 mb-6">Interactive Preview</span>
              
              {/* Interactive QR Display Canvas */}
              <div className="relative rounded-2xl border border-white/5 bg-[#050505] p-6 mb-6">
                <canvas 
                  ref={canvasRef} 
                  className="mx-auto rounded-lg max-w-full h-auto aspect-square object-contain bg-[#050505]"
                  style={{ width: '260px', height: '260px' }}
                  id="rendered-qr-canvas"
                />
              </div>

              {/* Payload Raw Content Display */}
              <div className="w-full space-y-1 mb-6 text-center">
                <p className="font-sans text-[11px] text-gray-500 uppercase tracking-wider">Payload Content</p>
                <div className="mx-auto max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-white bg-[#050505] border border-white/10 rounded-lg px-3 py-1.5 flex items-center justify-between">
                  <span className="truncate pr-2">{qrValue}</span>
                  <button 
                    onClick={copyRawTextValue} 
                    className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
                    title="Copy Raw Content"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-3" id="preview-actions">
                {/* Download Button */}
                <button
                  onClick={downloadQRCode}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all py-3.5 font-sans text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] cursor-pointer"
                  id="btn-download-qr"
                >
                  <Download className="h-4.5 w-4.5" />
                  <span>Download PNG</span>
                </button>

                {/* Copy Image Button */}
                <button
                  onClick={copyQRImage}
                  className="w-full flex items-center justify-center space-x-2 rounded-xl border border-white/10 bg-[#050505]/40 hover:bg-[#050505]/80 active:scale-[0.98] transition-all py-3.5 font-sans text-sm font-semibold text-gray-200 cursor-pointer"
                  id="btn-copy-qr-img"
                >
                  {copiedImg ? <Check className="h-4.5 w-4.5 text-green-500" /> : <Copy className="h-4.5 w-4.5 text-gray-400" />}
                  <span>{copiedImg ? 'Copied Image!' : 'Copy QR Image'}</span>
                </button>
              </div>

              {/* Prompt Help */}
              <p className="font-sans text-[11px] text-gray-500 text-center mt-5 leading-normal max-w-[280px]">
                You can also press and hold the QR code preview or right-click to copy or save it directly.
              </p>
            </div>

            {/* Quick Guide */}
            <div className="rounded-xl border border-white/5 bg-[#0a0a0a]/20 p-5 flex space-x-3 items-start">
              <HelpCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h5 className="font-sans font-semibold text-xs text-white">How does offline generation work?</h5>
                <p className="font-sans text-[11px] text-gray-400 leading-normal">
                  All rendering vectors are compiled directly in your web browser. Absolutely no input values or files are transmitted to external cloud systems.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
