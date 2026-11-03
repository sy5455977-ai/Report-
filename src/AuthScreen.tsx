import type { FormEvent } from 'react';
import { useState } from 'react';
import { BookMarked, Loader2, AlertCircle, Eye, EyeOff, Key, ExternalLink, CheckCircle2 } from 'lucide-react';
import { validateGeminiApiKey } from './utils/geminiClient';

interface AuthScreenProps {
  onLogin: (user: { email: string; username: string; isAdmin: boolean; apiKey?: string; sessionToken?: string }) => void;
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('blackbell_gemini_api_key') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [validatingKey, setValidatingKey] = useState(false);

  const handleTestKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError('Please paste or enter your Gemini API key first.');
      return;
    }
    setValidatingKey(true);
    setError(null);
    try {
      const result = await validateGeminiApiKey(trimmed);
      if (result.valid) {
        setIsKeyValid(true);
      } else {
        setIsKeyValid(false);
        setError(result.error || 'Gemini API key is invalid.');
      }
    } catch (e: any) {
      setIsKeyValid(false);
      setError(e?.message || 'Failed to validate API key.');
    } finally {
      setValidatingKey(false);
    }
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
        setIsKeyValid(null);
        setError(null);
      }
    } catch (e) {
      console.warn("Could not read clipboard", e);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
      setError('Gemini API Key is required to chat with Blackbell.');
      return;
    }

    setLoading(true);

    try {
      // 1. Save API key to localStorage right away
      localStorage.setItem('blackbell_gemini_api_key', trimmedApiKey);
      localStorage.setItem('blackbell_password', password);

      const endpoint = mode === 'signin' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'signin' 
        ? { email, password, apiKey: trimmedApiKey } 
        : { email, username, password, apiKey: trimmedApiKey };

      let serverSuccess = false;
      let userData: any = null;
      let serverHandled = false;

      // Check if user is locally recorded as banned
      try {
        const savedUsersRaw = localStorage.getItem('blackbell_registered_users');
        if (savedUsersRaw) {
          const userList = JSON.parse(savedUsersRaw);
          const found = userList.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
          if (found && found.isBanned) {
            setError("Your account has been banned. Please contact the administrator.");
            setLoading(false);
            return;
          }
        }
      } catch (e) {}

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const contentType = res.headers.get('content-type') || '';
        const isHtml = contentType.includes('text/html');

        if (res.ok && !isHtml) {
          const data = await res.json().catch(() => null);
          if (data?.success && data?.user) {
            serverSuccess = true;
            userData = { ...data.user, apiKey: trimmedApiKey, password };
          }
        } else if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const isStaticHostHtml = 
            res.status === 404 || 
            res.status === 502 || 
            res.status === 503 ||
            isHtml || 
            errText.trim().startsWith('<!DOCTYPE') || 
            errText.includes('<html') ||
            errText.includes('hosted on Netlify') ||
            errText.includes('<title>Not found</title>');

          if (isStaticHostHtml) {
            // Netlify, Vercel, or Hostinger static hosting detected (no backend auth endpoint)
            console.info("[Deployment Notice] Static hosting environment detected without backend endpoint. Activating local client-side authentication.");
            // Do not setError to raw HTML; proceed smoothly to local client authentication below.
          } else {
            // Real backend server returned a genuine business logic error (e.g. 403 Banned, 400 Incorrect Password)
            const cleanErr = errText.replace(/<[^>]*>/g, '').trim();
            setError(cleanErr || "Authentication failed. Please verify your credentials.");
            setLoading(false);
            return;
          }
        }
      } catch (networkErr) {
        // Backend offline / Vercel or Netlify static hosting deployment detected!
        console.info("[Deployment Notice] Server auth route unreachable. Activating client-side session for Vercel/Netlify:", networkErr);
      }

      // If server responded with an error, we already returned. If server succeeded, use userData.
      // Otherwise, verify local credentials for static hosting deployments:
      const cleanEmail = email.trim().toLowerCase();
      if (!serverSuccess) {
        try {
          const savedUsersRaw = localStorage.getItem('blackbell_registered_users');
          const userList = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
          if (Array.isArray(userList)) {
            const foundUser = userList.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (foundUser) {
              if (foundUser.isBanned) {
                setError("Your account has been banned. Please contact the administrator.");
                setLoading(false);
                return;
              }
              if (mode === 'signin' && foundUser.password && foundUser.password !== password) {
                setError("Incorrect password. Please enter the correct password.");
                setLoading(false);
                return;
              }
            }
          }
        } catch (e) {}
      }

      const activeUserRecord = (serverSuccess && userData) ? userData : {
        email: cleanEmail,
        username: username || cleanEmail.split('@')[0] || 'User',
        isAdmin: cleanEmail === 'sy5455977@gmail.com',
        apiKey: trimmedApiKey,
        password: password,
        sessionToken: `local_session_${Date.now()}_${Math.random().toString(36).substring(2)}`
      };

      try {
        const savedUsersRaw = localStorage.getItem('blackbell_registered_users');
        let userList = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
        if (!Array.isArray(userList)) userList = [];

        // Ensure default admin is present
        if (!userList.some((u: any) => u.email === 'sy5455977@gmail.com')) {
          userList.unshift({
            id: 'admin_sys',
            email: 'sy5455977@gmail.com',
            username: 'Blackbell Admin',
            isAdmin: true,
            isBanned: false,
            password: 'Sachin6264341093',
            createdAt: Date.now() - 86400000 * 7,
            lastSeen: Date.now(),
            role: 'admin',
            messagesCount: 24,
            sessionsCount: 3
          });
        }

        const idx = userList.findIndex((u: any) => u.email.toLowerCase() === activeUserRecord.email.toLowerCase());
        const userObj = {
          id: activeUserRecord.id || `user_${Date.now()}`,
          email: activeUserRecord.email,
          username: activeUserRecord.username,
          isAdmin: activeUserRecord.isAdmin,
          isBanned: false,
          password: password,
          createdAt: activeUserRecord.createdAt || Date.now(),
          lastSeen: Date.now(),
          role: activeUserRecord.isAdmin ? 'admin' : 'user',
          messagesCount: 1,
          sessionsCount: 1
        };

        if (idx >= 0) {
          userList[idx] = { ...userList[idx], password: password || userList[idx].password, lastSeen: Date.now() };
        } else {
          userList.push(userObj);
        }
        localStorage.setItem('blackbell_registered_users', JSON.stringify(userList));
      } catch (e) {
        console.warn("Could not cache registered user in localStorage:", e);
      }

      localStorage.setItem('blackbell_user', JSON.stringify(activeUserRecord));
      onLogin(activeUserRecord);
      return;

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Authentication failed. Please check your credentials and API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0D14] text-white px-4 py-8 items-center justify-center font-sans relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="w-full max-w-md flex flex-col items-center relative z-10">
        {/* App Logo */}
        <div className="w-16 h-16 rounded-[22px] bg-[#1E1435] flex items-center justify-center mb-3 border border-purple-500/25 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
          <BookMarked className="w-8 h-8 text-[#C084FC]" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-serif font-bold text-white mb-1.5 text-center tracking-tight">Blackbell AGI</h1>
        <p className="text-gray-400 mb-6 text-center text-sm">Sign in or register to launch your AI companion</p>

        {/* Tab Selector */}
        <div className="w-full flex bg-[#141724] border border-white/5 rounded-2xl p-1 mb-5 shadow-inner">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'signup' 
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30 shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              mode === 'signin' 
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30 shadow-sm' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Error alerting */}
        {error && (
          <div className="w-full mb-4 flex items-start gap-2.5 p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs animate-fade-in leading-relaxed">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span className="flex-1">
              {error.startsWith('<!DOCTYPE') || error.includes('<html') 
                ? 'Authentication is running in static deployment mode. Please try signing in.' 
                : error.replace(/<[^>]*>/g, '').trim()}
            </span>
          </div>
        )}

        {/* Form Container */}
        <div className="w-full bg-[#121522] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="w-full flex flex-col space-y-4">
            {/* 1. Email field */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#1A1E2E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            
            {/* 2. Username field (on signup) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full bg-[#1A1E2E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            )}

            {/* 3. Gemini API Key Field (Directly after Username) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  Gemini API Key
                  <span className="text-[10px] text-purple-400 font-normal">(Required)</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-400 hover:text-purple-300 inline-flex items-center gap-1 transition-colors"
                >
                  Get Free Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  required
                  disabled={loading}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setIsKeyValid(null);
                    setError(null);
                  }}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#1A1E2E] border border-white/10 rounded-xl pl-4 pr-24 py-3 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {apiKey && (
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={validatingKey}
                      title="Validate Key"
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {validatingKey ? <Loader2 className="w-3 h-3 animate-spin" /> : isKeyValid ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : 'Check'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1.5 px-0.5">
                <span>Works on Vercel, Netlify & local servers</span>
                <button
                  type="button"
                  onClick={handlePasteKey}
                  className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                >
                  Paste key
                </button>
              </div>
            </div>

            {/* 4. Password field */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1E2E] border border-white/10 rounded-xl pl-4 pr-11 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-3.5 text-sm rounded-xl mt-3 transition-all shadow-[0_0_20px_rgba(124,58,237,0.35)] duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign In & Launch Blackbell' : 'Create Account & Launch'}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-gray-500 mt-6 text-center">
          Blackbell AGI · Ready for Vercel, Netlify & Cloud deployments
        </p>
      </div>
    </div>
  );
}
