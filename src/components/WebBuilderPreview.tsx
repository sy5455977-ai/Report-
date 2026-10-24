import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Code, 
  Copy, 
  Check, 
  Download, 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Smartphone, 
  Monitor, 
  ExternalLink,
  FileCode,
  Trash2,
  Undo,
  Image as ImageIcon,
  X,
  Sparkles,
  ChevronDown,
  Globe
} from 'lucide-react';
import { ApkBuildModal } from './ApkBuildModal';

interface WebBuilderPreviewProps {
  htmlCode: string;
  theme: 'light' | 'dark';
  title?: string;
  onDelete?: () => void;
  onUpdateHtml?: (newHtml: string) => void;
  userEmail?: string;
  userSessionToken?: string;
}

export const WebBuilderPreview: React.FC<WebBuilderPreviewProps> = ({ 
  htmlCode, 
  theme, 
  title = "index.html", 
  onDelete,
  onUpdateHtml,
  userEmail,
  userSessionToken
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Download Options & APK Modal States
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);
  const [showFullscreenDownloadMenu, setShowFullscreenDownloadMenu] = useState<boolean>(false);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const fullscreenDownloadMenuRef = useRef<HTMLDivElement>(null);

  // Close download dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(target)) {
        setShowDownloadMenu(false);
      }
      if (fullscreenDownloadMenuRef.current && !fullscreenDownloadMenuRef.current.contains(target)) {
        setShowFullscreenDownloadMenu(false);
      }
    };
    if (showDownloadMenu || showFullscreenDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu, showFullscreenDownloadMenu]);

  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [selectedElementInfo, setSelectedElementInfo] = useState<{
    selector: string;
    tagName: string;
    textContent: string;
  } | null>(null);
  const [commandText, setCommandText] = useState<string>('');
  const [isRebuilding, setIsRebuilding] = useState<boolean>(false);
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [rebuildImage, setRebuildImage] = useState<{ base64: string; mimeType: string; name: string; previewUrl: string } | null>(null);
  const rebuildFileInputRef = useRef<HTMLInputElement>(null);

  const handleRebuildImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert("Please upload a valid image file (PNG, JPG, WebP, GIF).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("Image size exceeds 20MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          const commaIdx = dataUrl.indexOf(',');
          const rawBase64 = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl;
          setRebuildImage({
            base64: rawBase64,
            mimeType: 'image/jpeg',
            name: file.name,
            previewUrl: dataUrl
          });
        }
      };
    };
    reader.readAsDataURL(file);
    if (rebuildFileInputRef.current) rebuildFileInputRef.current.value = '';
  };

  // Listen to visual element selections from inside the iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElementInfo({
          selector: event.data.selector,
          tagName: event.data.tagName,
          textContent: event.data.textContent
        });
      }
    };
    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(htmlCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleDownloadWeb = () => {
    setShowDownloadMenu(false);
    setShowFullscreenDownloadMenu(false);
    try {
      const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'index.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download index.html:", err);
    }
  };

  const handleOpenApkModal = () => {
    setShowDownloadMenu(false);
    setShowFullscreenDownloadMenu(false);
    setShowApkModal(true);
  };

  // Keep handleDownload referencing web download for backwards compatibility
  const handleDownload = handleDownloadWeb;

  const handleOpenNewWindow = () => {
    try {
      const blob = new Blob([htmlCode], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error("Failed to open new window:", err);
    }
  };

  const handleClearSelection = () => {
    setSelectedElementInfo(null);
    setCommandText('');
    setRebuildImage(null);
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        iframe.contentWindow?.postMessage({ type: 'CLEAR_SELECTION' }, '*');
      });
    } catch (e) {}
  };

  const handleUndo = () => {
    if (htmlHistory.length === 0) return;
    const previousHtml = htmlHistory[htmlHistory.length - 1];
    setHtmlHistory(prev => prev.slice(0, -1));
    if (onUpdateHtml) {
      onUpdateHtml(previousHtml);
    }
    setIframeKey(prev => prev + 1);
    setSelectedElementInfo(null);
    setCommandText('');
    setRebuildImage(null);
  };

  const handleRebuildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElementInfo || (!commandText.trim() && !rebuildImage) || !onUpdateHtml) return;

    setIsRebuilding(true);
    try {
      const response = await fetch('/api/edit-element', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': userSessionToken || ''
        },
        body: JSON.stringify({
          htmlCode,
          selector: selectedElementInfo.selector,
          tagName: selectedElementInfo.tagName,
          command: commandText.trim() || (rebuildImage ? "Modify and style this element to match the layout, buttons, colors, spacing, and design shown in the attached visual reference image." : ""),
          email: userEmail,
          imageAttachment: rebuildImage ? {
            base64: rebuildImage.base64,
            mimeType: rebuildImage.mimeType
          } : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to edit element.');
      }

      const data = await response.json();
      if (data.success && data.updatedHtml) {
        // Add to history for Undo
        setHtmlHistory(prev => [...prev, htmlCode]);
        // Update html Code
        onUpdateHtml(data.updatedHtml);
        setSelectedElementInfo(null);
        setCommandText('');
        setRebuildImage(null);
        // Refresh Iframe
        setIframeKey(prev => prev + 1);
      }
    } catch (err: any) {
      console.error("Element edit error:", err);
      alert(err.message || "An error occurred while editing element.");
    } finally {
      setIsRebuilding(false);
    }
  };

  const getInjectedHtmlCode = (originalHtml: string) => {
    if (!isEditMode) return originalHtml;

    const scriptToInject = `
      <script id="blackbell-edit-script">
        (function() {
          let selectedElement = null;
          let hoverElement = null;

          function getUniqueSelector(el) {
            if (!el || el.nodeType !== 1) return '';
            if (el.id) return '#' + el.id;
            
            let path = [];
            while (el && el.nodeType === 1) {
              let tagName = el.tagName.toLowerCase();
              if (el.id) {
                path.unshift('#' + el.id);
                break;
              } else {
                let sibs = el.parentNode ? Array.from(el.parentNode.children).filter(c => c.tagName === el.tagName) : [];
                if (sibs.length > 1) {
                  let idx = sibs.indexOf(el) + 1;
                  path.unshift(tagName + ':nth-of-type(' + idx + ')');
                } else {
                  path.unshift(tagName);
                }
              }
              el = el.parentNode;
            }
            return path.join(' > ');
          }

          // Inject styling for hover and active selection
          const style = document.createElement('style');
          style.id = 'blackbell-edit-styles';
          style.innerHTML = \`
            .blackbell-hover {
              outline: 2px dashed #a855f7 !important;
              outline-offset: -2px !important;
              cursor: crosshair !important;
              transition: outline 0.1s ease !important;
            }
            .blackbell-selected {
              outline: 3px solid #5b3eff !important;
              outline-offset: -2px !important;
              box-shadow: 0 0 10px rgba(91, 62, 255, 0.6) !important;
              animation: bb-pulse 1.5s infinite alternate !important;
            }
            @keyframes bb-pulse {
              0% { outline-color: #5b3eff; }
              100% { outline-color: #a855f7; }
            }
          \`;
          document.head.appendChild(style);

          document.addEventListener('mouseover', function(e) {
            e.stopPropagation();
            const target = e.target;
            if (target === document.documentElement || target === document.body || target.id === 'blackbell-edit-styles' || target.id === 'blackbell-edit-script') return;
            if (hoverElement && hoverElement !== target) {
              hoverElement.classList.remove('blackbell-hover');
            }
            hoverElement = target;
            if (!hoverElement.classList.contains('blackbell-selected')) {
              hoverElement.classList.add('blackbell-hover');
            }
          });

          document.addEventListener('mouseout', function(e) {
            e.stopPropagation();
            if (hoverElement) {
              hoverElement.classList.remove('blackbell-hover');
              hoverElement = null;
            }
          });

          document.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const target = e.target;
            if (target === document.documentElement || target === document.body || target.id === 'blackbell-edit-styles' || target.id === 'blackbell-edit-script') return;

            if (selectedElement) {
              selectedElement.classList.remove('blackbell-selected');
            }

            if (hoverElement) {
              hoverElement.classList.remove('blackbell-hover');
            }

            selectedElement = target;
            selectedElement.classList.add('blackbell-selected');

            const selector = getUniqueSelector(selectedElement);
            window.parent.postMessage({
              type: 'ELEMENT_SELECTED',
              selector: selector,
              tagName: selectedElement.tagName,
              textContent: (selectedElement.innerText || selectedElement.textContent || '').substring(0, 50).trim()
            }, '*');
          }, true);

          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'CLEAR_SELECTION') {
              if (selectedElement) {
                selectedElement.classList.remove('blackbell-selected');
                selectedElement = null;
              }
            }
          });
        })();
      </script>
    `;

    const bodyIdx = originalHtml.toLowerCase().lastIndexOf('</body>');
    if (bodyIdx !== -1) {
      return originalHtml.substring(0, bodyIdx) + scriptToInject + originalHtml.substring(bodyIdx);
    } else {
      return originalHtml + scriptToInject;
    }
  };

  const renderContent = (isModal: boolean = false) => (
    <div className={`flex flex-col ${isModal ? 'h-[calc(100vh-80px)]' : 'h-[540px]'} w-full`}>
      {activeTab === 'preview' ? (
        <div className={`w-full h-full flex flex-col p-2 sm:p-3 overflow-hidden ${
          theme === 'light' ? 'bg-gray-100/80' : 'bg-black/40'
        }`}>
          <div className={`transition-all duration-300 flex-1 flex flex-col ${
            viewMode === 'mobile' 
              ? 'w-[360px] max-w-full mx-auto rounded-2xl border-4 border-gray-800 shadow-2xl overflow-hidden' 
              : 'w-full rounded-xl shadow-md overflow-hidden'
          }`}>
            <iframe
              key={`${iframeKey}-${isModal ? 'modal' : 'inline'}-${isEditMode ? 'edit' : 'normal'}`}
              srcDoc={getInjectedHtmlCode(htmlCode)}
              sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-popups"
              allow="autoplay; microphone; camera; midi; geolocation; encrypted-media;"
              className="w-full h-full border-0 bg-white"
              title="Web Application Preview"
            />
          </div>

          {/* Edit Panel at Bottom */}
          {isEditMode && (
            <div className={`w-full mt-3 p-3 rounded-xl border flex flex-col gap-2.5 transition-all animate-slide-up ${
              theme === 'light' ? 'bg-white border-gray-200 shadow-sm' : 'bg-[#151515] border-white/10 shadow-lg'
            }`}>
              {!selectedElementInfo ? (
                <div className="text-center py-3 text-xs text-purple-400 font-semibold flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                  <span>Click any element in the preview above to select and edit it</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2 border-b pb-1.5 border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {selectedElementInfo.tagName}
                      </span>
                      <span className="text-xs font-mono text-gray-400 truncate max-w-[250px] sm:max-w-md">
                        {selectedElementInfo.selector}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-xs text-gray-500 hover:text-gray-300 font-semibold cursor-pointer transition"
                    >
                      Deselect
                    </button>
                  </div>

                  {/* Hidden file input for Rebuild Image Upload */}
                  <input 
                    type="file" 
                    ref={rebuildFileInputRef} 
                    onChange={handleRebuildImageChange} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  {/* Reference Image Preview Chip */}
                  {rebuildImage && (
                    <div className={`flex items-center gap-2.5 p-2 rounded-xl border animate-fade-in ${
                      theme === 'light' ? 'bg-purple-50/70 border-purple-200 text-gray-900' : 'bg-purple-950/20 border-purple-500/25 text-purple-200'
                    }`}>
                      <img 
                        src={rebuildImage.previewUrl} 
                        alt="Reference preview" 
                        className="w-10 h-10 rounded-lg object-cover bg-black border border-purple-500/30 flex-shrink-0 shadow-sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Visual Reference
                          </span>
                        </div>
                        <p className="text-xs font-semibold truncate mt-0.5">{rebuildImage.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRebuildImage(null)}
                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove reference image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleRebuildSubmit} className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => rebuildFileInputRef.current?.click()}
                      disabled={isRebuilding}
                      className={`p-2.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer flex-shrink-0 ${
                        rebuildImage 
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-400 shadow-sm'
                          : theme === 'light' 
                            ? 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600 hover:text-purple-600' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                      }`}
                      title="Upload reference image for AI design & layout guidance"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      value={commandText}
                      onChange={(e) => setCommandText(e.target.value)}
                      placeholder={
                        rebuildImage 
                          ? "Specify changes (or leave blank to match image design & style)..."
                          : `Make this ${selectedElementInfo.tagName.toLowerCase()} blue/rounded, change text, etc...`
                      }
                      disabled={isRebuilding}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs outline-none border transition-all ${
                        theme === 'light'
                          ? 'bg-gray-50 border-gray-200 text-gray-800 focus:border-purple-400'
                          : 'bg-black/40 border-white/10 text-gray-200 focus:border-purple-500'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isRebuilding || (!commandText.trim() && !rebuildImage)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs transition duration-150 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                    >
                      {isRebuilding ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <span>Rebuild</span>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full overflow-auto p-4 font-mono text-xs leading-relaxed bg-[#0d1117] text-gray-200 select-text [scrollbar-width:thin]">
          <pre className="whitespace-pre overflow-x-auto">
            <code>{htmlCode}</code>
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Inline Preview Card inside chat */}
      <div className={`my-3 rounded-2xl border overflow-hidden transition-all shadow-lg ${
        theme === 'light' 
          ? 'bg-white border-gray-200 shadow-purple-900/5' 
          : 'bg-[#151515] border-white/10 shadow-black/40'
      }`}>
        {/* Card Header Toolbar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 border-b ${
          theme === 'light' ? 'bg-gray-50/80 border-gray-200' : 'bg-white/[0.03] border-white/5'
        }`}>
          {/* File name & Single-File Badge */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileCode className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-200 tracking-wide flex items-center gap-1.5">
                {title}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Offline-Ready
                </span>
              </span>
            </div>
          </div>

          {/* Action Tools & Tab Switcher */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Preview / Code Tab Switch */}
            <div className={`p-0.5 rounded-xl border flex items-center ${
              theme === 'light' ? 'bg-gray-200/70 border-gray-300' : 'bg-black/40 border-white/10'
            }`}>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#5b3eff] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                Live Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-[#5b3eff] text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                View Code
              </button>
            </div>

            {/* Desktop / Mobile view toggle (only in preview) */}
            {activeTab === 'preview' && (
              <div className={`p-0.5 rounded-xl border flex items-center ${
                theme === 'light' ? 'bg-gray-200/70 border-gray-300' : 'bg-black/40 border-white/10'
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode('desktop')}
                  title="Desktop View"
                  className={`p-1 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'desktop' ? 'bg-purple-600/30 text-purple-300' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('mobile')}
                  title="Mobile View (360px)"
                  className={`p-1 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'mobile' ? 'bg-purple-600/30 text-purple-300' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Reload Iframe */}
            {activeTab === 'preview' && (
              <button
                type="button"
                onClick={() => setIframeKey(prev => prev + 1)}
                title="Restart App / Reload"
                className={`p-1.5 rounded-xl border text-gray-400 hover:text-white transition-all cursor-pointer ${
                  theme === 'light' ? 'bg-white hover:bg-gray-100 border-gray-200' : 'bg-black/40 hover:bg-white/10 border-white/10'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Copy Code */}
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy full HTML code"
              className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isCopied 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : theme === 'light' 
                    ? 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200' 
                    : 'bg-black/40 hover:bg-white/10 text-gray-300 hover:text-white border-white/10'
              }`}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? "Copied" : "Copy"}
            </button>

            {/* Undo Modification (beside edit and delete) */}
            {onUpdateHtml && htmlHistory.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                title="Undo last element rebuilding step"
                className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-300'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20 hover:border-amber-500/30'
                }`}
              >
                <Undo className="w-3.5 h-3.5" />
                <span>Undo ({htmlHistory.length})</span>
              </button>
            )}

            {/* Edit Element Mode Toggle (beside delete) */}
            {onUpdateHtml && (
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  handleClearSelection();
                }}
                className={`px-2.5 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                  isEditMode
                    ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                    : theme === 'light'
                      ? 'bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-200 hover:border-purple-300'
                      : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20 hover:border-purple-500/30'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Exit Edit' : 'Edit'}</span>
              </button>
            )}

            {/* Delete Project */}
            {onDelete && (
              <div className="flex items-center gap-1">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Delete this project from chat"
                    className={`px-2 py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300' 
                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 hover:border-red-500/30'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div className={`flex items-center gap-1 p-0.5 rounded-xl border ${
                    theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/20 border-red-500/30'
                  }`}>
                    <span className="text-[10px] font-bold px-1.5 text-red-400 select-none">Sure?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete();
                        setShowDeleteConfirm(false);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        theme === 'light' ? 'bg-gray-200 text-gray-750 hover:bg-gray-300' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Download Button with Options: Web (index.html) or App (APK) */}
            <div className="relative" ref={downloadMenuRef}>
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                title="Download as Web (.html) or Android App (.apk)"
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
              </button>

              {showDownloadMenu && (
                <div className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl p-1.5 z-40 backdrop-blur-md animate-fade-in ${
                  theme === 'light'
                    ? 'bg-white/95 border-gray-200 text-gray-800 shadow-xl'
                    : 'bg-[#121824]/95 border-white/10 text-gray-100 shadow-2xl shadow-black/80'
                }`}>
                  <div className="px-2.5 py-1.5 mb-1 border-b border-white/5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      Download Options
                    </span>
                  </div>

                  {/* Option 1: Web (index.html) */}
                  <button
                    type="button"
                    onClick={handleDownloadWeb}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer group ${
                      theme === 'light'
                        ? 'hover:bg-emerald-50 text-gray-700 hover:text-emerald-700'
                        : 'hover:bg-emerald-500/10 text-gray-200 hover:text-emerald-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">Web</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400">
                          .html
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 truncate">
                        Standalone index.html file
                      </span>
                    </div>
                  </button>

                  {/* Option 2: App (Android APK) */}
                  <button
                    type="button"
                    onClick={handleOpenApkModal}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer group mt-1 ${
                      theme === 'light'
                        ? 'hover:bg-purple-50 text-gray-700 hover:text-purple-700'
                        : 'hover:bg-purple-500/10 text-gray-200 hover:text-purple-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400 group-hover:scale-105 transition-transform flex-shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">App</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-purple-500/20 text-purple-300">
                          .apk
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 truncate">
                        Build & download Android APK
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Open in new tab or Fullscreen */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              title="Fullscreen Mode"
              className={`p-1.5 rounded-xl border text-gray-400 hover:text-white transition-all cursor-pointer ${
                theme === 'light' ? 'bg-white hover:bg-gray-100 border-gray-200' : 'bg-black/40 hover:bg-white/10 border-white/10'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Viewer (Live Preview / Code) */}
        {renderContent(false)}
      </div>

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 animate-fade-in">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {title}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Fullscreen Testing
                  </span>
                </h3>
                <p className="text-xs text-gray-400">Single-file standalone application preview</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop / Mobile view toggle in modal */}
              {activeTab === 'preview' && (
                <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex items-center">
                  <button
                    type="button"
                    onClick={() => setViewMode('desktop')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === 'desktop' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('mobile')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      viewMode === 'mobile' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    Mobile
                  </button>
                </div>
              )}

              {/* Fullscreen Download Dropdown */}
              <div className="relative" ref={fullscreenDownloadMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowFullscreenDownloadMenu(!showFullscreenDownloadMenu)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFullscreenDownloadMenu ? 'rotate-180' : ''}`} />
                </button>

                {showFullscreenDownloadMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/15 bg-[#141b2a]/95 backdrop-blur-md p-1.5 z-50 shadow-2xl text-white animate-fade-in">
                    <div className="px-2.5 py-1.5 mb-1 border-b border-white/10">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                        Download Format
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadWeb}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-emerald-500/15 text-gray-200 hover:text-emerald-300 transition-all cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 group-hover:scale-105 transition-transform flex-shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">Web (HTML)</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-400">
                            .html
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 truncate">
                          Standalone index.html file
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenApkModal}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-purple-500/15 text-gray-200 hover:text-purple-300 transition-all cursor-pointer group mt-1"
                    >
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400 group-hover:scale-105 transition-transform flex-shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">App (APK)</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-purple-500/20 text-purple-300">
                            .apk
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 truncate">
                          Build & download Android APK
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenNewWindow}
                title="Open in new window"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-gray-300 hover:text-white border border-white/10 transition-all"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 mt-3 rounded-2xl border border-white/10 overflow-hidden bg-[#111]">
            {renderContent(true)}
          </div>
        </div>
      )}

      {/* APK Build and Download Modal */}
      <ApkBuildModal
        isOpen={showApkModal}
        onClose={() => setShowApkModal(false)}
        htmlCode={htmlCode}
        appName={title}
        theme={theme}
        onPreviewInSimulator={() => {
          setViewMode('mobile');
          setActiveTab('preview');
        }}
      />
    </>
  );
};
