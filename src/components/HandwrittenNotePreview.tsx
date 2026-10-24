import React, { useState, useRef } from 'react';
import { 
  Download, 
  Printer, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  FileText, 
  Sparkles, 
  ExternalLink,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface HandwrittenNotePreviewProps {
  htmlCode: string;
  theme: 'light' | 'dark';
  title?: string;
  onDelete?: () => void;
}

export const HandwrittenNotePreview: React.FC<HandwrittenNotePreviewProps> = ({
  htmlCode,
  theme,
  title = "Handwritten Study Notes",
  onDelete
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [imageSuccess, setImageSuccess] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Extract a clean document title if present inside <title> or <h1>
  const detectedTitle = (() => {
    const titleMatch = htmlCode.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].replace(/[-–|].*$/, '').trim();
    }
    const h1Match = htmlCode.match(/class=["'][^"']*page-title[^"']*["'][^>]*>([^<]+)</i);
    if (h1Match && h1Match[1]) {
      return h1Match[1].trim();
    }
    return title;
  })();

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.15, 0.6));
  const handleZoomReset = () => setZoomLevel(1);

  // Generate and download actual PDF file using jsPDF & html2canvas
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfSuccess(false);

    let exportIframe: HTMLIFrameElement | null = null;

    try {
      // Create an off-screen fixed-A4 rendering sandbox
      // Standard A4: 210mm x 297mm. At 96 DPI: 210mm = 794px, 297mm = 1123px.
      exportIframe = document.createElement('iframe');
      exportIframe.style.position = 'fixed';
      exportIframe.style.left = '0';
      exportIframe.style.top = '0';
      exportIframe.style.width = '794px';
      exportIframe.style.height = '1123px';
      exportIframe.style.zIndex = '-999999';
      exportIframe.style.opacity = '0.01'; // Not display:none so browser renders layout, fonts & paints canvas
      exportIframe.style.pointerEvents = 'none';
      exportIframe.style.border = 'none';
      document.body.appendChild(exportIframe);

      const frameDoc = exportIframe.contentDocument;
      if (!frameDoc) {
        throw new Error("Could not initialize export iframe");
      }

      frameDoc.open();
      frameDoc.write(htmlCode);
      frameDoc.close();

      // Ensure fonts and assets are loaded before canvas capture
      await new Promise(r => setTimeout(r, 450));
      if ((frameDoc as any).fonts && (frameDoc as any).fonts.ready) {
        try {
          await (frameDoc as any).fonts.ready;
        } catch (fontErr) {
          console.warn("Font readiness check:", fontErr);
        }
      }

      // Query notebook pages inside the A4 standardized document
      const pageElements = frameDoc.querySelectorAll<HTMLElement>('.notebook-page');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      if (pageElements && pageElements.length > 0) {
        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i];
          
          // Lock exact A4 standard dimensions on the element
          pageEl.style.width = '794px';
          pageEl.style.maxWidth = '794px';
          pageEl.style.margin = '0 auto';
          pageEl.style.boxSizing = 'border-box';

          const canvas = await html2canvas(pageEl, {
            scale: 2, // High resolution (1588px width) for razor sharp text & diagrams
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#fbfbf9',
            logging: false,
            windowWidth: 794
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          // Calculate proportional height based on natural canvas aspect ratio
          const imgHeight = (canvas.height * pdfWidth) / canvas.width;

          if (i > 0) {
            pdf.addPage('a4', 'portrait');
          }

          if (imgHeight <= pdfHeight + 5) {
            // Fits within single A4 page with natural proportions (no stretching!)
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
          } else {
            // Content extends beyond 1 page: slice cleanly without compressing text
            let heightLeft = imgHeight;
            let position = 0;
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;

            while (heightLeft > 5) {
              position -= pdfHeight;
              pdf.addPage('a4', 'portrait');
              pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
              heightLeft -= pdfHeight;
            }
          }
        }
      } else {
        // Fallback: render body with fixed A4 width
        const targetBody = frameDoc.body;
        targetBody.style.width = '794px';
        targetBody.style.maxWidth = '794px';

        const canvas = await html2canvas(targetBody, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#fbfbf9',
          logging: false,
          windowWidth: 794
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 5) {
          position -= pdfHeight;
          pdf.addPage('a4', 'portrait');
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      }

      const fileName = `${detectedTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Notes.pdf`;
      pdf.save(fileName);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err) {
      console.warn("jsPDF export error, falling back to print window:", err);
      handlePrint();
    } finally {
      if (exportIframe && exportIframe.parentNode) {
        exportIframe.parentNode.removeChild(exportIframe);
      }
      setIsGeneratingPdf(false);
    }
  };

  // Download high-resolution PNG image (scanned photo look)
  const handleDownloadImage = async () => {
    if (isGeneratingImage) return;
    setIsGeneratingImage(true);
    setImageSuccess(false);

    let exportIframe: HTMLIFrameElement | null = null;
    try {
      exportIframe = document.createElement('iframe');
      exportIframe.style.position = 'fixed';
      exportIframe.style.left = '0';
      exportIframe.style.top = '0';
      exportIframe.style.width = '794px';
      exportIframe.style.height = '1123px';
      exportIframe.style.zIndex = '-999999';
      exportIframe.style.opacity = '0.01';
      exportIframe.style.pointerEvents = 'none';
      exportIframe.style.border = 'none';
      document.body.appendChild(exportIframe);

      const frameDoc = exportIframe.contentDocument;
      if (!frameDoc) throw new Error("Could not initialize export iframe");

      frameDoc.open();
      frameDoc.write(htmlCode);
      frameDoc.close();

      await new Promise(r => setTimeout(r, 450));
      if ((frameDoc as any).fonts && (frameDoc as any).fonts.ready) {
        try {
          await (frameDoc as any).fonts.ready;
        } catch (fontErr) {
          console.warn("Font readiness check:", fontErr);
        }
      }

      const pageEl = frameDoc.querySelector<HTMLElement>('.notebook-page') || frameDoc.body;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f7f6f0',
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${detectedTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Notebook_Page.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setImageSuccess(true);
      setTimeout(() => setImageSuccess(false), 4000);
    } catch (err) {
      console.warn("Image export error:", err);
    } finally {
      if (exportIframe && exportIframe.parentNode) {
        exportIframe.parentNode.removeChild(exportIframe);
      }
      setIsGeneratingImage(false);
    }
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert("Please allow popups to print/save notes as PDF.");
        return;
      }
      // Inject standard A4 print styling for perfect zero-margin printing
      let enhancedHtml = htmlCode;
      const printStyleTag = `
        <style>
          @page { size: A4 portrait; margin: 0; }
          @media print {
            html, body { margin: 0 !important; padding: 0 !important; background: transparent !important; }
            .notebook-page {
              width: 210mm !important;
              max-width: 210mm !important;
              min-height: 297mm !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      `;
      if (enhancedHtml.includes('</head>')) {
        enhancedHtml = enhancedHtml.replace('</head>', `${printStyleTag}</head>`);
      } else {
        enhancedHtml = printStyleTag + enhancedHtml;
      }

      printWindow.document.write(enhancedHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 600);
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  const handleOpenNewTab = () => {
    try {
      const blob = new Blob([htmlCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error("Open new tab error:", e);
    }
  };

  return (
    <div className={`mt-3 w-full rounded-2xl border overflow-hidden transition-all duration-300 shadow-xl ${
      isFullscreen 
        ? 'fixed inset-0 z-50 rounded-none h-screen w-screen bg-slate-950 flex flex-col' 
        : theme === 'light' 
          ? 'bg-amber-50/40 border-amber-200/80' 
          : 'bg-[#18181b] border-amber-500/20'
    }`}>
      {/* Top Header Bar */}
      <div className={`px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b ${
        theme === 'light' 
          ? 'bg-gradient-to-r from-amber-100/90 via-orange-50 to-amber-100/80 border-amber-200 text-amber-950' 
          : 'bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/30 border-amber-500/20 text-amber-100'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm leading-tight">
              <span>{detectedTitle}</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Study Notes
              </span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Handwritten Student Notebook • Ruled Paper • Double Red Margin • Sketches</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-black/10 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/10 p-0.5">
            <button
              onClick={handleZoomOut}
              title="Zoom out"
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span 
              onClick={handleZoomReset}
              className="text-[10px] font-mono font-bold px-1 cursor-pointer select-none text-gray-500 dark:text-gray-400 hover:text-amber-500"
              title="Reset Zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Zoom in"
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Open in new tab */}
          <button
            onClick={handleOpenNewTab}
            title="Open in new window"
            className="p-2 text-xs font-semibold rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Print / Save as PDF */}
          <button
            onClick={handlePrint}
            title="Print / Save via Browser"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Save Image Button */}
          <button
            onClick={handleDownloadImage}
            disabled={isGeneratingImage}
            title="Download high-resolution notebook photo (PNG)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all transform active:scale-95 ${
              imageSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200'
            }`}
          >
            {isGeneratingImage ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Saving Image...</span>
              </>
            ) : imageSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Image Saved!</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Save Image</span>
              </>
            )}
          </button>

          {/* Main Download PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all transform active:scale-95 ${
              pdfSuccess 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white'
            }`}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting PDF...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="p-2 text-xs font-semibold rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Prominent High-Yield PDF & Image Download Banner */}
      <div className="px-4 py-2 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Authentic Ruled Student Notebook:</strong> Real handwriting, blue ballpoint ink, margin rulings, and hand-drawn diagrams.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadImage}
            disabled={isGeneratingImage}
            className="text-amber-700 dark:text-amber-300 hover:underline font-bold flex items-center gap-1 cursor-pointer select-none"
          >
            <ImageIcon className="w-3 h-3" />
            <span>Save Image (PNG)</span>
          </button>
          <span className="text-amber-500/40">|</span>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="text-amber-700 dark:text-amber-300 hover:underline font-bold flex items-center gap-1 cursor-pointer select-none"
          >
            <Download className="w-3 h-3" />
            <span>Save PDF</span>
          </button>
        </div>
      </div>

      {/* Notebook Document Iframe Preview */}
      <div className={`w-full overflow-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/95 transition-all ${
        isFullscreen ? 'flex-1' : 'min-h-[560px] max-h-[720px]'
      }`}>
        <div 
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out'
          }}
          className="w-full max-w-[860px] flex justify-center shadow-2xl rounded-lg overflow-hidden"
        >
          <iframe
            ref={iframeRef}
            srcDoc={htmlCode}
            title={detectedTitle}
            className="w-full min-h-[960px] h-[1180px] border-0 bg-[#fffdfa]"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};
