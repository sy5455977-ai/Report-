// Server-routed Gemini client helpers

export interface GeminiChatMessage {
  role: 'user' | 'ai' | 'model';
  content: string;
}

// Validation probe routed through server endpoint
export async function validateGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'API key cannot be empty' };
  }

  try {
    const res = await fetch('/api/gemini/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cleanKey })
    });

    if (res.ok) {
      return { valid: true };
    }

    const data = await res.json().catch(() => null);
    const message = data?.error || `HTTP ${res.status} from server`;
    return { valid: false, error: message };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Network error verifying key' };
  }
}

// Server-proxied chat helper
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
  const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('blackbell_user') : null;
  const parsedUser = savedUser ? JSON.parse(savedUser) : {};
  const userToken = parsedUser?.sessionToken || '';
  const userEmail = parsedUser?.email || (isAdmin ? 'sy5455977@gmail.com' : 'user@blackbell.ai');

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-session-token': userToken,
      'x-gemini-api-key': apiKey || ''
    },
    body: JSON.stringify({
      email: userEmail,
      personality,
      apiKey,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    }),
    signal
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Server error (${res.status})`);
  }

  const rawText = await res.text();
  const marker = '[QUESTIONS]';
  const idx = rawText.indexOf(marker);
  let text = rawText;
  let questions: string[] = [];

  if (idx !== -1) {
    text = rawText.substring(0, idx).trim();
    const qSection = rawText.substring(idx + marker.length).trim();
    questions = qSection
      .split('\n')
      .map((line: string) => line.trim().replace(/^[-\*\d\.\)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  return { text, questions };
}

// Server-proxied TTS helper
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

    if (res.ok) {
      const data = await res.json();
      if (data.audio) {
        return { base64Audio: data.audio, isPcm: false };
      }
    }
  } catch (e) {}

  return null;
}
