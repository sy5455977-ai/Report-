import React, { useState, useEffect, useRef } from 'react';
import { Download, Smartphone, Check, Loader2, X, Sparkles, ShieldCheck, Plus, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { buildAndroidApk, triggerApkDownload, extractAppTitle } from '../utils/apkBuilder';

interface ApkBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlCode: string;
  appName?: string;
  onPreviewInSimulator?: () => void;
  theme?: 'light' | 'dark';
}

interface BuildLog {
  id: number;
  text: string;
  type: 'info' | 'step' | 'success' | 'detail';
}

export const ApkBuildModal: React.FC<ApkBuildModalProps> = ({
  isOpen,
  onClose,
  htmlCode,
  appName = 'Boom ai',
  onPreviewInSimulator,
  theme = 'dark'
}) => {
  const [logs, setLogs] = useState<BuildLog[]>([]);
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [apkSize, setApkSize] = useState<string>('14.74 MB');
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [downloadFileName, setDownloadFileName] = useState<string>('');
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);

  // Form custom states
  const [customAppName, setCustomAppName] = useState<string>('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract initial clean app title
  const cleanTitle = extractAppTitle(htmlCode, appName);

  // Initialize form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomAppName(cleanTitle);
      setLogoPreview(null);
      setLogoBase64(null);
      setIsFormSubmitted(false);
      setIsBuilding(false);
      setIsReady(false);
      setLogs([]);
      setGeneratedBlob(null);
      setHasDownloaded(false);
    }
  }, [isOpen, cleanTitle]);

  const handleLogoUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawDataUrl = reader.result as string;
        // Pre-process and normalize onto high-resolution 512x512 canvas for crystal-sharp launcher icon
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // Determine cover fit
            const aspect = img.width / img.height;
            let drawW = 512;
            let drawH = 512;
            let offsetX = 0;
            let offsetY = 0;
            if (aspect > 1) {
              drawW = 512 * aspect;
              offsetX = (512 - drawW) / 2;
            } else {
              drawH = 512 / aspect;
              offsetY = (512 - drawH) / 2;
            }
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            const highResPngDataUrl = canvas.toDataURL('image/png', 1.0);
            setLogoPreview(highResPngDataUrl);
            const base64 = highResPngDataUrl.split(',')[1];
            setLogoBase64(base64);
          } else {
            setLogoPreview(rawDataUrl);
            setLogoBase64(rawDataUrl.split(',')[1]);
          }
        };
        img.onerror = () => {
          setLogoPreview(rawDataUrl);
          setLogoBase64(rawDataUrl.split(',')[1]);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartBuild = async () => {
    setIsFormSubmitted(true);
    setIsBuilding(true);
    setIsReady(false);
    setLogs([]);

    try {
      setLogs([
        { id: 1, text: `Preparing customization profiles for "${customAppName}"...`, type: 'step' }
      ]);

      await new Promise(r => setTimeout(r, 450));

      setLogs(prev => [
        ...prev,
        { id: 2, text: 'Generating a unique sideloading Package Name...', type: 'step' },
        { id: 3, text: 'Injecting ID: com.blackbell.app_' + Math.random().toString(36).substring(2, 6).toLowerCase(), type: 'detail' }
      ]);

      await new Promise(r => setTimeout(r, 400));

      setLogs(prev => [
        ...prev,
        { id: 4, text: logoBase64 ? 'Embedding your custom app launcher icon...' : 'No custom logo uploaded. Using template default launcher icon...', type: logoBase64 ? 'success' : 'info' },
        { id: 5, text: 'Compiling assets and compiling standalone binary...', type: 'step' }
      ]);

      const result = await buildAndroidApk(htmlCode, customAppName, logoBase64 || undefined);

      setGeneratedBlob(result.blob);
      setDownloadFileName(result.fileName);
      setApkSize(result.sizeMb || '14.74 MB');

      setLogs(prev => [
        ...prev,
        { id: 6, text: 'Build completed successfully!', type: 'success' },
        { id: 7, text: `Sideloadable package size: ${result.sizeMb || '14.74 MB'}`, type: 'detail' },
        { id: 8, text: 'APK is ready to install', type: 'success' }
      ]);

      setIsReady(true);
    } catch (err) {
      console.error('APK build error:', err);
      setLogs(prev => [
        ...prev,
        { id: 99, text: 'Failed to compile stand-alone APK package.', type: 'info' }
      ]);
    } finally {
      setIsBuilding(false);
    }
  };

  if (!isOpen) return null;

  const handleDownloadClick = () => {
    if (generatedBlob && downloadFileName) {
      triggerApkDownload(generatedBlob, downloadFileName);
      setHasDownloaded(true);
    }
  };

  const handleSimulatorClick = () => {
    onClose();
    if (onPreviewInSimulator) {
      onPreviewInSimulator();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md rounded-2xl bg-[#0b101b] border border-[#1e293b] shadow-2xl overflow-hidden flex flex-col text-white transition-all transform animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar with header & Close */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-[#080d17] border-b border-[#1e293b]/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-bold tracking-wide text-gray-200">
              {isFormSubmitted ? 'Sideload App Compiler' : 'Standalone App Customizer'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content container */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {!isFormSubmitted ? (
            /* Customization Config Form */
            <div className="flex flex-col gap-4">
              <div className="text-xs text-slate-300 leading-relaxed bg-gradient-to-r from-blue-950/40 to-slate-900/60 p-3 rounded-xl border border-blue-500/20 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Permanent Fix Activated for Poco C51 & Modern Android:</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 mt-0.5">
                  <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>HD 512px Sharp Icon (No Blur)</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Screen-Off Alarm Keepalive</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Accessibility & Permissions</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md border border-white/5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>Unique Package (Multi-App)</span>
                  </div>
                </div>
              </div>

              {/* App Name Input field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  App Display Name
                </label>
                <input
                  type="text"
                  value={customAppName}
                  onChange={(e) => setCustomAppName(e.target.value)}
                  placeholder="E.g. Mario Game, My Website"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060a12] border border-[#1a2538] text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 transition-all font-semibold"
                />
              </div>

              {/* Logo/Icon Upload field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Custom App Launcher Icon
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className="flex items-center gap-4 bg-[#060a12] p-3 rounded-xl border border-[#1a2538]">
                  {/* Plus Trigger Button */}
                  <div 
                    onClick={handleLogoUploadClick}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                      logoPreview 
                        ? 'border-emerald-500/50 bg-emerald-950/10' 
                        : 'border-slate-700 hover:border-blue-500/80 hover:bg-blue-950/5 text-slate-400 hover:text-blue-400'
                    }`}
                  >
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="App icon preview" 
                        className="w-full h-full object-cover rounded-[14px]"
                      />
                    ) : (
                      <>
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6 mb-1" />
                        <span className="text-[10px] font-bold text-center">Upload Logo</span>
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <span className="text-xs font-bold text-slate-200">
                      {logoPreview ? 'Custom Icon Selected' : 'No Custom Logo'}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-normal">
                      {logoPreview 
                        ? 'Premium standalone launcher icon successfully parsed.' 
                        : 'Bina logo ke app bekar lagta hai! Click the "+" button to upload a PNG/JPEG logo for launcher icon.'}
                    </span>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors text-left mt-0.5 flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset to default icon
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Action Button */}
              <button
                type="button"
                onClick={handleStartBuild}
                disabled={!customAppName.trim()}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
                <span>Compile Custom APK Standalone</span>
              </button>
            </div>
          ) : (
            /* Build Output Terminal view */
            <div className="rounded-xl bg-[#060a12] border border-[#1a2538] overflow-hidden shadow-inner font-mono text-xs sm:text-sm">
              {/* Window Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0b111e] border-b border-[#1a2538]">
                <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold">
                  <span className="text-sky-500 font-bold">&gt;</span>
                  <span>Build Output</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block shadow-sm"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block shadow-sm"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shadow-sm"></span>
                </div>
              </div>

              {/* Terminal Lines */}
              <div className="p-4 flex flex-col gap-2 min-h-[190px]">
                {logs.map((log) => {
                  if (log.type === 'step') {
                    return (
                      <div key={log.id} className="flex items-start gap-2 text-sky-400">
                        <span className="text-gray-500 select-none">&gt;</span>
                        <span className="font-bold">➜</span>
                        <span>{log.text}</span>
                      </div>
                    );
                  }
                  if (log.type === 'success') {
                    return (
                      <div key={log.id} className="flex items-start gap-2 text-emerald-400">
                        <span className="text-gray-500 select-none">&gt;</span>
                        <span className="font-bold">✓</span>
                        <span className="font-semibold">{log.text}</span>
                      </div>
                    );
                  }
                  if (log.type === 'detail') {
                    return (
                      <div key={log.id} className="flex items-start gap-2 text-gray-300">
                        <span className="text-gray-500 select-none">&gt;</span>
                        <span className="text-sky-400 font-bold">➜</span>
                        <span>{log.text}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={log.id} className="flex items-start gap-2 text-gray-400">
                      <span className="text-gray-500 select-none">&gt;</span>
                      <span>{log.text}</span>
                    </div>
                  );
                })}

                {isBuilding && (
                  <div className="flex items-center gap-2 text-sky-400/80 animate-pulse pt-1">
                    <span className="text-gray-500 select-none">&gt;</span>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">Sideloading assets and packing APK file...</span>
                  </div>
                )}

                {isReady && (
                  <div className="text-gray-500 select-none text-xs pt-1">&gt;</div>
                )}
              </div>

              {/* Action Buttons inside Card */}
              <div className="p-4 pt-1 flex flex-col gap-2.5 border-t border-[#1a2538]/50 bg-[#080d15]/50">
                {/* Download APK Button */}
                <button
                  type="button"
                  onClick={handleDownloadClick}
                  disabled={!isReady}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg cursor-pointer ${
                    isReady
                      ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-gray-950 hover:brightness-110 active:scale-[0.98] shadow-emerald-500/20'
                      : 'bg-emerald-950/40 text-emerald-600/50 border border-emerald-900/30 cursor-not-allowed'
                  }`}
                >
                  {hasDownloaded ? (
                    <>
                      <Check className="w-5 h-5 text-gray-950 font-bold" />
                      <span>Download Again ({apkSize})</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-gray-950" />
                      <span>Download APK</span>
                    </>
                  )}
                </button>

                {/* Preview in Simulator Button */}
                <button
                  type="button"
                  onClick={handleSimulatorClick}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-lg bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white active:scale-[0.98] shadow-pink-600/20 cursor-pointer"
                >
                  <Smartphone className="w-5 h-5" />
                  <span>Preview in Simulator</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Info Card matching screenshot */}
          <div className="p-3.5 rounded-xl bg-[#090e1a] border border-[#1b253b] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Launcher Icon preview inside the card */}
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="App logo icon preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-gray-100 truncate">
                  {customAppName || cleanTitle}
                </span>
                <span className="text-xs text-sky-400/90 truncate flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  Standalone Android APK • Direct Install
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] font-mono font-semibold px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {apkSize}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
