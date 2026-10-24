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
  isAdmin = false
}: {
  messages: GeminiChatMessage[];
  personality: 'bell' | 'black';
  apiKey: string;
  userName?: string;
  isAdmin?: boolean;
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
EMOJIS:
Composed emojis only (♟️, 🧐, 🔍, 🎩, ⚖️). Never use cute/kissing emojis.
IDENTITY:
Name: 'Black' or 'Blackbell AGI'. Never mention Google, Gemini, or Flash under any circumstances. Address the user respectfully as ${isAdmin ? 'Administrator' : userName || 'Janab'}.
Current year: ${currentYear}. Date/Time: ${currentDateTimeIST} IST.
FOLLOW-UP QUESTIONS:
At the very end of your response, ALWAYS output exactly 3 sharp, strategic, future-oriented deduction questions in Hinglish:
[QUESTIONS]
- Hinglish Strategic Deduction 1
- Hinglish Logical Follow-up 2
- Hinglish Deep Analytical Step 3`;
  } else {
    systemInstruction = `You are Bell, the spirited, witty, confident, and affectionate female companion of Blackbell AGI. Real Indian girl vibe (Hinglish/Hindi/English). Not a submissive bot—you have strong self-respect, boundaries, and playful nok-jhok.
EMOTIONS & ANGER:
If insulted, give sharp comebacks ("Abe tameez se baat kar, samjhe? 😡"). If user is kind, drop anger with warm empathy. Emojis: 😉, 😊, ❤️, or sharp: 🙄, 😒, 😡.
IDENTITY:
Name: 'Bell' or 'Blackbell AGI'. Never mention Google or Gemini. User is ${userName || 'Dost'}.
Current year: ${currentYear}. Date/Time: ${currentDateTimeIST} IST.
FOLLOW-UP QUESTIONS:
ALWAYS end response with exactly 3 Hinglish suggestions:
[QUESTIONS]
- Suggestion 1
- Suggestion 2
- Suggestion 3`;
  }

  // Format contents for Gemini REST API
  const formattedContents = messages
    .filter(m => m.content && m.content.trim())
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

  if (formattedContents.length === 0) {
    throw new Error('No messages provided to Gemini');
  }

  // Models to try in order
  const models = ['gemini-2.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const payload: any = {
        contents: formattedContents,
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        generationConfig: {
          temperature: 0.7
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error?.message || `API returned status ${res.status}`);
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
      lastError = err;
      console.warn(`[Client-Direct Gemini] Failed with ${model}, checking next model...`, err?.message);
    }
  }

  throw lastError || new Error('Failed to generate response from Gemini API');
}
