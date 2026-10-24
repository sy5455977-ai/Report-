import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ExternalLink, Copy, Check } from 'lucide-react';
import { validateGeminiApiKey } from '../utils/geminiClient';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveKey: (newKey: string) => void;
  theme?: 'dark' | 'light';
}

export function ApiKeyModal({ isOpen, onClose, apiKey, onSaveKey, theme = 'dark' }: ApiKeyModalProps) {
  const [currentKey, setCurrentKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCurrentKey(apiKey || '');
    setTestResult(null);
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!currentKey.trim()) {
      setTestResult({ success: false, message: 'Please enter a Gemini API key first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await validateGeminiApiKey(currentKey.trim());
      if (result.valid) {
        setTestResult({ success: true, message: 'Gemini API key is active and verified!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Invalid API key.' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = currentKey.trim();
    onSaveKey(trimmed);
    onClose();
  };

  const handleCopy = () => {
    if (!currentKey) return;
    navigator.clipboard.writeText(currentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCurrentKey(text.trim());
        setTestResult(null);
      }
    } catch (e) {
      console.warn("Could not read clipboard", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      
      <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl z-10 ${
        theme === 'light' 
          ? 'bg-white border-gray-200 text-gray-900 shadow-xl' 
          : 'bg-[#121520] border-white/10 text-white shadow-[0_0_30px_rgba(0,0,0,0.8)]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Gemini API Key</h3>
              <p className="text-xs text-gray-400">Manage your personal AI Studio key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info card */}
        <div className={`p-3 rounded-xl mb-4 text-xs leading-relaxed border ${
          theme === 'light'
            ? 'bg-purple-50 border-purple-200 text-purple-900'
            : 'bg-purple-950/20 border-purple-500/20 text-purple-200/90'
        }`}>
          <span>This key is stored locally in your browser and used for direct AI calls when deployed to Vercel, Netlify, or self-hosted platforms.</span>
        </div>

        {/* Input & Controls */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-300">
            Google Gemini API Key
          </label>
          
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={currentKey}
              onChange={(e) => {
                setCurrentKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="AIzaSy..."
              className={`w-full rounded-xl pl-4 pr-24 py-3 text-sm font-mono transition-colors outline-none border ${
                theme === 'light'
                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-purple-600'
                  : 'bg-[#191D2B] border-white/10 text-white placeholder-gray-500 focus:border-purple-500'
              }`}
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {currentKey && (
                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy Key"
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Hide Key" : "Show Key"}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handlePaste}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors cursor-pointer"
            >
              Paste from clipboard
            </button>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 font-medium transition-colors"
            >
              Get Free Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-xs mt-2 border ${
              testResult.success
                ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-400'
                : 'bg-red-950/25 border-red-500/30 text-red-400'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              )}
              <span className="flex-1 leading-normal">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center gap-3 pt-6 mt-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={testing || !currentKey.trim()}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-200'
            }`}
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
            Test Connection
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!currentKey.trim()}
            className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center"
          >
            Save API Key
          </button>
        </div>
      </div>
    </div>
  );
}
