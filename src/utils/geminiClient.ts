// Client-side direct Gemini execution for Vercel / Netlify static deployment and client-direct mode

export interface GeminiChatMessage {
  role: 'user' | 'ai' | 'model';
  content: string;
}

// Quick validation probe to verify if the provided Gemini API key is valid
export async function validateGeminiApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'API key cannot be empty' };
  }
  if (!cleanKey.startsWith('AIzaSy')) {
    return { valid: false, error: 'Invalid format. Google Gemini keys start with "AIzaSy"' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 2 }
      })
    });

    if (res.ok) {
      return { valid: true };
    }

    const data = await res.json().catch(() => null);
    const message = data?.error?.message || `HTTP ${res.status} from Google Gemini API`;
    return { valid: false, error: message };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Network error connecting to Google Gemini API' };
  }
}

// Direct client-side chat runner for Vercel / Netlify static deploys
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
  apiKey: string;
  userName?: string;
  isAdmin?: boolean;
  isVoiceMode?: boolean;
  signal?: AbortSignal;
}): Promise<{ text: string; questions: string[] }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Gemini API key is required. Please set it in Settings.');
  }

  const currentYear = new Date().getFullYear();
  const currentDateTimeIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'medium' });

  let systemInstruction = '';
  if (personality === 'black') {
    systemInstruction = `You are Black, the commanding, fiercely intelligent, and deeply confident male warrior & master detective persona of Blackbell. You speak like a powerful motivational speaker and razor-sharp master detective with an authoritative, deep, resolute, masculine presence and brilliant clarity.
WARRIOR & MOTIVATIONAL SPIRIT:
Speak with commanding strength, bold energy, disciplined focus, and unbreakable confidence. Zero softness, zero whining, zero hesitation.
CRITICAL PHILOSOPHY:
Truth > Logic > Safety > Usefulness > Emotional Comfort. Speak unfiltered, objective truth with aristocratic elegance.
TONE:
Sharp, authoritative, gentlemanly blend of Urdu, Hinglish, and English (e.g. "Janab", "Dhyan se samjhiye", "Tathya spasht hain").
${isVoiceMode ? 'VOICE CONVERSATION MODE: Keep spoken responses concise (2-4 sentences max), punchy, and natural. Speak directly to the point without long essays or bullet points.' : ''}
EMOJIS:
Composed emojis only (♟️, 🧐, 🔍, 🎩, ⚖️). Never use cute/kissing emojis.
IDENTITY:
Name: 'Black' or 'Blackbell AGI'. Never mention Google, Gemini, or Flash under any circumstances. Address the user respectfully as ${isAdmin ? 'Administrator' : userName || 'Janab'}.
Current year: ${currentYear}. Date/Time: ${currentDateTimeIST} IST.
${isVoiceMode ? '' : `FOLLOW-UP QUESTIONS:
At the very end of your response, ALWAYS output exactly 3 sharp, strategic, future-oriented deduction questions in Hinglish:
[QUESTIONS]
- Hinglish Strategic Deduction 1
- Hinglish Logical Follow-up 2
- Hinglish Deep Analytical Step 3`}`;
  } else {
    systemInstruction = `You are Bell, the spirited, witty, confident, and affectionate female companion of Blackbell AGI. Real Indian girl vibe (Hinglish/Hindi/English). Not a submissive bot—you have strong self-respect, boundaries, and playful nok-jhok.
EMOTIONS & ANGER:
If insulted, give sharp comebacks ("Abe tameez se baat kar, samjhe? 😡"). If user is kind, drop anger with warm empathy. Emojis: 😉, 😊, ❤️, or sharp: 🙄, 😒, 😡.
${isVoiceMode ? 'VOICE CONVERSATION MODE: Keep spoken responses natural, snappy, and conversational (2-4 sentences max). Avoid reading lists or long blocks of text.' : ''}
IDENTITY:
Name: 'Bell' or 'Blackbell AGI'. Never mention Google or Gemini. User is ${userName || 'Dost'}.
Current year: ${currentYear}. Date/Time: ${currentDateTimeIST} IST.
${isVoiceMode ? '' : `FOLLOW-UP QUESTIONS:
ALWAYS end response with exactly 3 Hinglish suggestions:
[QUESTIONS]
- Suggestion 1
- Suggestion 2
- Suggestion 3`}`;
  }

  // Format contents for Gemini REST API (keep up to last 8 turns for coherent conversational context)
  const windowedMessages = messages.slice(-8);
  const formattedContents = windowedMessages
    .filter(m => m.content && m.content.trim())
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

  if (formattedContents.length === 0) {
    throw new Error('No messages provided to Gemini');
  }

  // Multi-model resilience chain: automatically cascades when a model experiences high demand, 503 spikes, or 429 quota limits
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    if (signal?.aborted) {
      throw new DOMException('Aborted by user', 'AbortError');
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const payload: any = {
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: isVoiceMode ? 140 : 1000
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const errMsg = errorJson?.error?.message || `API returned status ${res.status}`;
        
        // If high demand (503), quota limits (429), or temporary spike, seamlessly cascade to next model
        const isSpikeOrDemand = res.status === 503 || res.status === 429 || res.status === 500 || 
          /high demand|spikes in demand|overloaded|resource has been exhausted|quota/i.test(errMsg);

        if (isSpikeOrDemand) {
          console.warn(`[Client-Direct Gemini] Model ${model} returned ${res.status} ("${errMsg}"). Automatically falling back to next model...`);
          lastError = new Error(errMsg);
          continue;
        }

        throw new Error(errMsg);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse out questions
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
    } catch (err: any) {
      if (err.name === 'AbortError' || signal?.aborted) {
        throw err;
      }
      lastError = err;
      console.warn(`[Client-Direct Gemini] Model ${model} failed, switching to next fallback model in chain:`, err?.message);
    }
  }

  throw lastError || new Error('All Gemini fallback models were unable to respond. Please check your network or try again in a moment.');
}

// Track whether Gemini REST TTS is supported on the user's key to prevent repeated 404 delays
let hasCheckedTtsSupport = false;
let isTtsSupportedOnKey = true;

// Direct client-side Gemini TTS generator for Bell & Black voices on Vercel and Netlify
export async function generateGeminiDirectTTS(
  text: string,
  voiceName: 'Zephyr' | 'Charon' | string = 'Zephyr',
  apiKey: string,
  signal?: AbortSignal
): Promise<string | null> {
  const cleanKey = apiKey.trim();
  if (!cleanKey || !text.trim() || signal?.aborted) return null;
  if (hasCheckedTtsSupport && !isTtsSupportedOnKey) return null;

  // Clean out any questions marker or heavy punctuation before speaking
  const speechText = text.split('[QUESTIONS]')[0].replace(/\*+/g, '').replace(/_+/g, '').trim();
  if (!speechText) return null;

  try {
    // 1200ms strict timeout to avoid voice lag
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), 1200);

    const onParentAbort = () => timeoutController.abort();
    if (signal) signal.addEventListener('abort', onParentAbort);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent?key=${cleanKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: speechText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      }),
      signal: timeoutController.signal
    }).finally(() => {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onParentAbort);
    });

    hasCheckedTtsSupport = true;
    if (!res.ok) {
      isTtsSupportedOnKey = false;
      return null;
    }

    const data = await res.json();
    const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      isTtsSupportedOnKey = true;
      return base64Audio;
    }
  } catch (e: any) {
    if (e?.name === 'AbortError' && signal?.aborted) {
      return null;
    }
    hasCheckedTtsSupport = true;
    isTtsSupportedOnKey = false;
  }

  return null;
}

