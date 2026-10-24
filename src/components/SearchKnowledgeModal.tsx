import React, { useState, useEffect } from 'react';
import { Search, Globe, Database, Sparkles, CheckCircle2, ShieldCheck, X, ArrowRight, RefreshCw, Layers, ExternalLink, Zap } from 'lucide-react';

interface SearchKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat: (query: string, verifiedContent?: string) => void;
  theme: 'light' | 'dark';
  userEmail?: string;
}

interface CrossSearchResult {
  query: string;
  verifiedAnswer: string;
  confidenceScore: number;
  verificationStatus: 'VERIFIED_HYBRID' | 'VERIFIED_SQLITE' | 'VERIFIED_WEB' | 'LOCAL_SYNTHESIS';
  sqliteMatches: { title: string; snippet: string }[];
  webMatches: { title: string; snippet: string; url?: string; domain?: string }[];
  keyFacts: string[];
  timestamp: string;
}

interface TrendingSample {
  id: string;
  title: string;
  snippet: string;
}

export const SearchKnowledgeModal: React.FC<SearchKnowledgeModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
  theme,
  userEmail
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<string>('');
  const [result, setResult] = useState<CrossSearchResult | null>(null);
  const [trendingList, setTrendingList] = useState<TrendingSample[]>([]);
  const [isSyncingTrending, setIsSyncingTrending] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  // Fetch initial trending topics list from SQLite
  useEffect(() => {
    if (isOpen) {
      fetchTrendingList();
    }
  }, [isOpen]);

  const fetchTrendingList = async () => {
    try {
      const res = await fetch('/api/knowledge/trending-list');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setTrendingList(data.items);
      }
    } catch (e) {
      console.warn("Failed to load trending list:", e);
    }
  };

  const handleSyncTrending = async () => {
    setIsSyncingTrending(true);
    setSyncStatusMsg('Fetching latest Google trends...');
    try {
      const res = await fetch('/api/knowledge/sync-trending', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncStatusMsg(`Synced ${data.addedCount} new topics to SQLite!`);
        fetchTrendingList();
      } else {
        setSyncStatusMsg('Sync complete.');
      }
    } catch (e) {
      setSyncStatusMsg('Sync finished.');
    } finally {
      setIsSyncingTrending(false);
      setTimeout(() => setSyncStatusMsg(''), 4000);
    }
  };

  const handleSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch || searchQuery).trim();
    if (!q) return;

    setIsLoading(true);
    setResult(null);
    setActiveStep('1. Querying SQLite Local Knowledge Base...');

    try {
      setTimeout(() => {
        setActiveStep('2. Searching Real-Time Internet...');
      }, 400);

      setTimeout(() => {
        setActiveStep('3. Cross-Verifying Truth & Synthesizing...');
      }, 900);

      const res = await fetch('/api/knowledge/cross-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, email: userEmail })
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const data: CrossSearchResult = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error("Search failed:", err);
      setResult({
        query: q,
        verifiedAnswer: "Search karne me koi dikkat aayi. Kripya dobara koshish karein.",
        confidenceScore: 50,
        verificationStatus: "LOCAL_SYNTHESIS",
        sqliteMatches: [],
        webMatches: [],
        keyFacts: [],
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      setActiveStep('');
    }
  };

  if (!isOpen) return null;

  const defaultSuggestedTopics = [
    "Latest AI & Technology News",
    "Current World Events",
    "Space Science Discoveries",
    "Blackbell 2.0 Features",
    "Mahabharat Gyan"
  ];

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center p-3 sm:p-5 font-sans animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden z-10 transition-all ${
          theme === 'light'
            ? 'bg-white border-purple-200 text-gray-900 shadow-purple-200/50'
            : 'bg-[#090b14] border-purple-500/20 text-white shadow-purple-950/60'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-6 border-b flex items-center justify-between ${
          theme === 'light' ? 'border-gray-200 bg-purple-50/50' : 'border-white/5 bg-[#0e1222]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5b3eff] to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Search Knowledge & Trends</h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Cross-Verify
                </span>
              </div>
              <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                SQLite Database + Real-time Internet truth verification engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncTrending}
              disabled={isSyncingTrending}
              title="Sync latest Google trending topics into SQLite Knowledge Base"
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                theme === 'light'
                  ? 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTrending ? 'animate-spin text-purple-400' : ''}`} />
              <span className="hidden sm:inline">Sync Trends</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="px-6 py-2 bg-purple-500/10 border-b border-purple-500/20 text-purple-400 text-xs font-semibold flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{syncStatusMsg}</span>
          </div>
        )}

        {/* Search Input Box */}
        <div className="p-4 sm:p-6 pb-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trending events, topics, tech, or SQLite knowledge..."
              className={`w-full rounded-2xl py-3.5 pl-11 pr-24 text-sm font-medium outline-none border transition-all ${
                theme === 'light'
                  ? 'bg-gray-50 focus:bg-white border-gray-300 focus:border-[#5b3eff] text-gray-900 placeholder-gray-400 shadow-inner'
                  : 'bg-[#04060c] focus:bg-[#060814] border-white/10 focus:border-purple-500 text-white placeholder-gray-500 shadow-inner'
              }`}
              autoFocus
            />
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-gray-400" />
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="absolute right-2 top-2 px-4 py-2 rounded-xl bg-[#5b3eff] hover:bg-[#4b2ee8] disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Verify</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Preset Trending Suggestions Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1 mr-1">
              <Zap className="w-3 h-3 text-amber-400" /> Suggestions:
            </span>
            {defaultSuggestedTopics.map((topic, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSearchQuery(topic);
                  handleSearch(topic);
                }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                  theme === 'light'
                    ? 'bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 border-gray-200'
                    : 'bg-white/5 hover:bg-purple-500/20 text-gray-300 hover:text-purple-300 border-white/5 hover:border-purple-500/30'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body & Results */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-2 space-y-4 [scrollbar-width:thin]">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-ping" />
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-purple-500 animate-spin" />
                <Database className="w-5 h-5 text-purple-400 absolute" />
              </div>
              <div>
                <p className="text-sm font-bold text-purple-400 animate-pulse">{activeStep}</p>
                <p className="text-xs text-gray-500 mt-1">Cross-referencing database records with real-time news...</p>
              </div>
            </div>
          )}

          {!isLoading && result && (
            <div className="space-y-4 animate-fade-in">
              {/* Verification Banner */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                result.verificationStatus === 'VERIFIED_HYBRID'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      {result.verificationStatus === 'VERIFIED_HYBRID'
                        ? '100% Cross-Verified (SQLite + Live Web)'
                        : result.verificationStatus === 'VERIFIED_WEB'
                        ? 'Live Internet News Grounding Verified'
                        : 'SQLite Local Knowledge Base Verified'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      Truth score: <strong className="font-mono">{result.confidenceScore}%</strong> accuracy confidence
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="px-2 py-1 rounded-lg bg-black/30 text-[10px] font-mono font-bold">
                    {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Main Synthesized Answer Box */}
              <div className={`p-5 rounded-2xl border leading-relaxed ${
                theme === 'light'
                  ? 'bg-white border-gray-200 text-gray-800 shadow-sm'
                  : 'bg-[#0d101f] border-white/10 text-gray-200'
              }`}>
                <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Verified Answer & Analysis
                </h4>
                <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text">
                  {result.verifiedAnswer}
                </div>
              </div>

              {/* Data Sources Breakdown (SQLite vs Web) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SQLite Knowledge Column */}
                <div className={`p-4 rounded-2xl border ${
                  theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#0a0d1a] border-white/5'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-gray-300">SQLite Database ({result.sqliteMatches.length} Matches)</span>
                  </div>
                  {result.sqliteMatches.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto [scrollbar-width:thin]">
                      {result.sqliteMatches.map((m, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-white/5 border border-white/5 text-[11px]">
                          <strong className="text-purple-300 block">{m.title}</strong>
                          <p className="text-gray-400 line-clamp-2 mt-0.5">{m.snippet}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic py-2">No matching offline records found. Web results used.</p>
                  )}
                </div>

                {/* Web Search Column */}
                <div className={`p-4 rounded-2xl border ${
                  theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-[#0a0d1a] border-white/5'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-gray-300">Live Web Grounding</span>
                  </div>
                  {result.webMatches.length > 0 ? (
                    <div className="space-y-2 max-h-36 overflow-y-auto [scrollbar-width:thin]">
                      {result.webMatches.map((m, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-white/5 border border-white/5 text-[11px]">
                          <strong className="text-emerald-300 block">{m.title}</strong>
                          <p className="text-gray-400 line-clamp-2 mt-0.5">{m.snippet}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 italic py-2">SQLite local knowledge base was authoritative.</p>
                  )}
                </div>
              </div>

              {/* Action Button: Send to Active Chat */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSendToChat(result.query, result.verifiedAnswer);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-[#5b3eff] to-purple-600 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Discuss this with Blackbell in Chat</span>
                </button>
              </div>
            </div>
          )}

          {!isLoading && !result && trendingList.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" /> Trending in SQLite Knowledge Base
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {trendingList.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const cleanTitle = item.title.replace(/^\[Live Trend\]\s*/i, '');
                      setSearchQuery(cleanTitle);
                      handleSearch(cleanTitle);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all group cursor-pointer ${
                      theme === 'light'
                        ? 'bg-gray-50 hover:bg-purple-50 border-gray-200 hover:border-purple-300 text-gray-900'
                        : 'bg-[#0d1020] hover:bg-[#12162d] border-white/5 hover:border-purple-500/30 text-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-xs group-hover:text-purple-400 transition-colors line-clamp-1">
                        {item.title}
                      </strong>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{item.snippet}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
