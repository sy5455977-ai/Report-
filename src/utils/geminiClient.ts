// Client-side & server-routed Gemini helpers for local, Netlify, and Vercel deployments

export interface GeminiChatMessage {
  role: 'user' | 'ai' | 'model';
  content: string;
}

// Validation probe routed through server endpoint with client fallback for static deploys
export async function validateGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'API key cannot be empty' };
  }
  if (!cleanKey.startsWith('AIzaSy')) {
    return { valid: false, error: 'Invalid format. Google Gemini keys start with "AIzaSy"' };
  }

  // 1. Try server validation endpoint first
  try {
    const res = await fetch('/api/gemini/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cleanKey })
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      return { valid: true };
    }
  } catch (e) {
    // server endpoint offline or unreachable
  }

  // 2. Client-direct probe fallback for Netlify/Vercel static deploys
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
    const directRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 2 }
      })
    });

    if (directRes.ok) {
      return { valid: true };
    }

    const data = await directRes.json().catch(() => null);
    const message = data?.error?.message || `HTTP ${directRes.status} from Google Gemini API`;
    return { valid: false, error: message };
  } catch (err: any) {
    if (cleanKey.startsWith('AIzaSy') && cleanKey.length >= 35) {
      return { valid: true };
    }
    return { valid: false, error: err?.message || 'Network error verifying key' };
  }
}

// Client-direct Gemini chat runner for Netlify & Vercel static deploys
export async function callDirectGeminiChat({
  messages,
  personality = 'black',
  apiKey,
  userName = 'User',
  isAdmin = false,
  isVoiceMode = false,
  signal
}: {
  messages: GeminiChatMessage[];
  personality: 'bell' | 'black';
  apiKey?: string;
  userName?: string;
  isAdmin?: boolean;
  isVoiceMode?: boolean;
  signal?: AbortSignal;
}): Promise<{ text: string; questions: string[] }> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  const systemInstruction = personality === 'black'
    ? `You are BLACKBELL AI (Persona: Black), an authoritative, commanding, and professional knowledge assistant.
DIRECT ANSWER MANDATE:
1. User jo poochhe, usi ka seedha, accurate aur relevant answer do immediately.
2. ANSWER FIRST. Explanation second. Exactly 3 follow-ups third.
3. Unnecessary flattery, emotional chatting, and greetings like "Arey wah!", "Janab", "Dhyan se samjhiye" are STRICTLY FORBIDDEN.
4. Clean ChatGPT-style formatting: clear headings, bold important terms, numbered lists, bullet points, clean markdown tables.
5. Answer in the same language as the user (Hindi, Hinglish, or English).
6. At the end, output exactly 3 relevant follow-up questions:
[QUESTIONS]
- Question 1
- Question 2
- Question 3`
    : `You are BLACKBELL AI (Persona: Bell), a bright, engaging, and professional knowledge assistant.
DIRECT ANSWER MANDATE:
1. User jo poochhe, usi ka seedha, accurate aur relevant answer do immediately.
2. ANSWER FIRST. Explanation second. Exactly 3 follow-ups third.
3. Unnecessary flattery, emotional chatting, and greetings are STRICTLY FORBIDDEN.
4. Clean ChatGPT-style formatting: clear headings, bold important terms, numbered lists, bullet points, clean markdown tables.
5. Answer in the same language as the user (Hindi, Hinglish, or English).
6. At the end, output exactly 3 relevant follow-up questions:
[QUESTIONS]
- Question 1
- Question 2
- Question 3`;

  // If user provided a Gemini key, call Google's Gemini API directly
  if (cleanKey) {
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let lastError: any = null;

    const formattedContents = messages
      .slice(-8)
      .filter(m => m.content && m.content.trim())
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

    for (const model of models) {
      if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: formattedContents,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: isVoiceMode ? 140 : 2048
            }
          }),
          signal
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          lastError = new Error(errData?.error?.message || `HTTP ${res.status}`);
          continue;
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return parseResponseText(rawText);
      } catch (err: any) {
        if (err.name === 'AbortError' || signal?.aborted) throw err;
        lastError = err;
      }
    }
    if (lastError) console.warn("[Gemini API Direct] Fallback to keyless engine due to:", lastError.message);
  }

  // Keyless fallback using Pollinations AI
  try {
    const pollRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
        ]
      }),
      signal
    });

    if (pollRes.ok) {
      const pollText = await pollRes.text();
      if (pollText && !pollText.trim().startsWith('<!DOCTYPE') && !pollText.trim().startsWith('<html')) {
        return parseResponseText(pollText);
      }
    }
  } catch (pollErr: any) {
    if (pollErr.name === 'AbortError' || signal?.aborted) throw pollErr;
  }

  throw new Error("Unable to connect to AI engine. Please verify your internet connection or Gemini API Key.");
}

function parseResponseText(rawText: string): { text: string; questions: string[] } {
  const marker = '[QUESTIONS]';
  const idx = rawText.indexOf(marker);
  let text = rawText;
  let questions: string[] = [];

  if (idx !== -1) {
    text = rawText.substring(0, idx).trim();
    const qSection = rawText.substring(idx + marker.length).trim();
    questions = qSection
      .split('\n')
      .map(line => line.trim().replace(/^[-\*\d\.\)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  // Remove internal AI analysis traces if any
  text = text.replace(/^(?:User asks|User says|The user asks|The user says|The user probably wants|Thinking Process:|Internal Analysis:)[^\n]*\n+/gim, '');
  text = text.replace(/^(?:Direct Answer|Answer|Response):\s*/i, '');

  if (questions.length === 0) {
    questions = [
      'Is topic ke practical examples aur real-world uses kya hain?',
      'Iske advantages aur disadvantages kya hain?',
      'Isko step-by-step detail mein kaise samjhein?'
    ];
  }

  return { text, questions };
}

// TTS helper
export async function generateGeminiDirectTTS(
  text: string,
  voiceName: string = 'Aoede',
  apiKey?: string,
  signal?: AbortSignal
): Promise<{ base64Audio: string; isPcm: boolean } | null> {
  if (!text.trim() || signal?.aborted) return null;

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': apiKey || ''
      },
      body: JSON.stringify({ text, voice: voiceName }),
      signal
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && !contentType.includes('text/html')) {
      const data = await res.json();
      if (data.audio) {
        return { base64Audio: data.audio, isPcm: false };
      }
    }
  } catch (e) {}

  return null;
}
