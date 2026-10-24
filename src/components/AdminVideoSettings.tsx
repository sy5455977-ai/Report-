import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Film, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Play, Eye, Video } from 'lucide-react';

interface VideoInfo {
  url: string;
  name: string;
  index: number;
}

export function AdminVideoSettings() {
  const [selectedPersonality, setSelectedPersonality] = useState<'black' | 'bell'>('black');
  
  // Status states from server
  const [bellTalkingUrls, setBellTalkingUrls] = useState<string[]>([]);
  const [bellSunnaUrls, setBellSunnaUrls] = useState<string[]>([]);
  const [blackTalkingUrls, setBlackTalkingUrls] = useState<string[]>([]);
  const [blackSunnaUrls, setBlackSunnaUrls] = useState<string[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  
  // Upload states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Video Preview Modal / Player
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  // Helper to convert blob/file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Fetch current server video status
  const fetchVideoStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`/api/bell-video/status?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setBellTalkingUrls(Array.isArray(data.talkingUrls) ? data.talkingUrls : []);
        setBellSunnaUrls(Array.isArray(data.sunnaUrls) ? data.sunnaUrls : []);
        setBlackTalkingUrls(Array.isArray(data.blackTalkingUrls) ? data.blackTalkingUrls : []);
        setBlackSunnaUrls(Array.isArray(data.blackSunnaUrls) ? data.blackSunnaUrls : []);
      }
    } catch (err: any) {
      console.warn("Error fetching video status:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchVideoStatus();
  }, []);

  const isBlack = selectedPersonality === 'black';
  const activeTalkingUrls = isBlack ? blackTalkingUrls : bellTalkingUrls;
  const activeSunnaUrls = isBlack ? blackSunnaUrls : bellSunnaUrls;

  // Handle uploading talking video files
  const handleUploadTalking = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const persLabel = isBlack ? 'Black' : 'Bell';
    setUploadMessage(`Uploading ${files.length} Talking video(s) for ${persLabel}...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await fileToBase64(file);
        
        const response = await fetch('/api/bell-video/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'talking',
            personality: selectedPersonality,
            videoBase64: base64,
            filename: file.name,
            index: i
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setSuccessMessage(`✅ Successfully uploaded ${files.length} Talking video(s) for ${persLabel}! All users will now receive these videos.`);
      await fetchVideoStatus();
    } catch (err: any) {
      setErrorMessage(`❌ Upload Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadMessage(null);
      e.target.value = '';
    }
  };

  // Handle uploading sunna / listening video files
  const handleUploadSunna = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const persLabel = isBlack ? 'Black' : 'Bell';
    setUploadMessage(`Uploading ${files.length} Sunna / Listening video(s) for ${persLabel}...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await fileToBase64(file);
        
        const response = await fetch('/api/bell-video/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'sunna',
            personality: selectedPersonality,
            videoBase64: base64,
            filename: file.name,
            index: i
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setSuccessMessage(`✅ Successfully uploaded ${files.length} Sunna video(s) for ${persLabel}! All users will now receive these videos.`);
      await fetchVideoStatus();
    } catch (err: any) {
      setErrorMessage(`❌ Upload Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadMessage(null);
      e.target.value = '';
    }
  };

  // Reset/Clear videos
  const handleResetVideos = async (type?: 'talking' | 'sunna') => {
    const persLabel = isBlack ? 'Black' : 'Bell';
    const typeLabel = type ? (type === 'talking' ? 'Talking' : 'Sunna') : 'All';
    const confirm = window.confirm(`Are you sure you want to reset ${typeLabel} videos for ${persLabel}? Default system videos will be used.`);
    if (!confirm) return;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/bell-video/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personality: selectedPersonality,
          type
        })
      });

      if (!res.ok) throw new Error("Reset failed");
      setSuccessMessage(`✅ ${typeLabel} videos for ${persLabel} have been reset to default.`);
      await fetchVideoStatus();
    } catch (err: any) {
      setErrorMessage(`❌ Reset failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-[#0b0e24] rounded-2xl border border-white/5 p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xs font-black text-gray-200 uppercase tracking-widest flex items-center gap-2">
            <Video className="w-4.5 h-4.5 text-pink-400" />
            Black & Bell Video Upload & Stream Manager
          </h3>
          <p className="text-[10px] text-gray-500 mt-1">
            Upload custom Talking & Sunna videos for Black and Bell. Videos uploaded here will play for all new and existing users globally.
          </p>
        </div>

        <button
          onClick={fetchVideoStatus}
          disabled={isLoadingStatus}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Server Status</span>
        </button>
      </div>

      {/* Personality Tab Selector */}
      <div className="flex items-center gap-3 p-1.5 bg-[#060818] rounded-2xl border border-white/5 max-w-md">
        <button
          type="button"
          onClick={() => setSelectedPersonality('black')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedPersonality === 'black'
              ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>⚫</span>
          <span>Black Videos ({blackTalkingUrls.length + blackSunnaUrls.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedPersonality('bell')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            selectedPersonality === 'bell'
              ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span>🔵</span>
          <span>Bell Videos ({bellTalkingUrls.length + bellSunnaUrls.length})</span>
        </button>
      </div>

      {/* Status Messages */}
      {uploadMessage && (
        <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs flex items-center gap-2.5 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span className="font-semibold">{uploadMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Video Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* 1. TALKING VIDEOS */}
        <div className="bg-[#060818] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isBlack ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]'}`} />
              <h4 className="text-xs font-bold text-white">
                1. Talking Videos ({activeTalkingUrls.length} on Server)
              </h4>
            </div>
            {activeTalkingUrls.length > 0 && (
              <button
                onClick={() => handleResetVideos('talking')}
                disabled={isUploading}
                title="Reset talking videos to default"
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-400">
            AI bolte samay (when speaking) yeh video loop / round-robin me play hoti hai. Select 1 to 5 video clips.
          </p>

          {/* Upload Button */}
          <label
            htmlFor="admin-upload-talking"
            className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 border ${
              isBlack
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600/50'
                : 'bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 border-pink-500/40'
            } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading to Server...' : `Upload ${isBlack ? 'Black' : 'Bell'} Talking Videos`}</span>
            <input
              id="admin-upload-talking"
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="sr-only"
              disabled={isUploading}
              onChange={handleUploadTalking}
            />
          </label>

          {/* Uploaded List */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Active Files on Server:</span>
            {activeTalkingUrls.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto [scrollbar-width:thin]">
                {activeTalkingUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/50 border border-white/5 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Film className={`w-3.5 h-3.5 flex-shrink-0 ${isBlack ? 'text-amber-400' : 'text-pink-400'}`} />
                      <span className="truncate text-gray-300 font-mono text-[11px]">
                        Clip #{idx + 1}: {url.split('/').pop()}
                      </span>
                    </div>
                    <button
                      onClick={() => setPreviewVideoUrl(url)}
                      className="p-1 text-gray-400 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                      title="Preview video"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white/[0.02] border border-dashed border-white/5 rounded-xl text-center text-xs text-gray-500">
                Default fallback video ({isBlack ? 'black_talking.mp4' : 'talking.mp4'}) is currently active.
              </div>
            )}
          </div>
        </div>

        {/* 2. SUNNA / LISTENING VIDEOS */}
        <div className="bg-[#060818] border border-white/5 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <h4 className="text-xs font-bold text-white">
                2. Sunna / Listening Videos ({activeSunnaUrls.length} on Server)
              </h4>
            </div>
            {activeSunnaUrls.length > 0 && (
              <button
                onClick={() => handleResetVideos('sunna')}
                disabled={isUploading}
                title="Reset sunna videos to default"
                className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-400">
            User jab bol raha hota hai ya idle hota hai (listening/idle) tab yeh videos loop me play hoti hain bina freeze huye.
          </p>

          {/* Upload Button */}
          <label
            htmlFor="admin-upload-sunna"
            className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 border bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-blue-500/30 ${
              isUploading ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading to Server...' : `Upload ${isBlack ? 'Black' : 'Bell'} Sunna Videos`}</span>
            <input
              id="admin-upload-sunna"
              type="file"
              multiple
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="sr-only"
              disabled={isUploading}
              onChange={handleUploadSunna}
            />
          </label>

          {/* Uploaded List */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Active Files on Server:</span>
            {activeSunnaUrls.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto [scrollbar-width:thin]">
                {activeSunnaUrls.map((url, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-black/50 border border-white/5 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Film className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      <span className="truncate text-gray-300 font-mono text-[11px]">
                        Clip #{idx + 1}: {url.split('/').pop()}
                      </span>
                    </div>
                    <button
                      onClick={() => setPreviewVideoUrl(url)}
                      className="p-1 text-gray-400 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
                      title="Preview video"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-white/[0.02] border border-dashed border-white/5 rounded-xl text-center text-xs text-gray-500">
                Default fallback video ({isBlack ? 'black_sunna.mp4' : 'sunna.mp4'}) is currently active.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Global Persistence Assurance Banner */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          <strong className="text-gray-200">Global Sync Active:</strong> Jab Admin yahan video upload karta hai, toh server automatically updated video files store karta hai aur sabhi naye aur purane users ke device par video call screen kholte hi fresh uploaded videos play hoti hain.
        </p>
      </div>

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0f1118] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Play className="w-3.5 h-3.5 text-pink-400" />
                Video Preview: {previewVideoUrl.split('/').pop()}
              </h4>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/10">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
