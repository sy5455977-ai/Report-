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

  // Detect /build, /rebuild, /note commands in client-direct execution
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const userText = lastUserMsg?.content?.trim() || '';
  const lowerUserText = userText.toLowerCase();

  const isBuildCommand = lowerUserText.startsWith('/build');
  const isRebuildCommand = lowerUserText.startsWith('/rebuild');
  const isNoteCommand = lowerUserText.startsWith('/note') || (['notes bana', 'note bana', 'handwritten note'].some(t => lowerUserText.includes(t)) && !isBuildCommand && !isRebuildCommand);
  const isNaturalBuild = !isBuildCommand && !isRebuildCommand && !isNoteCommand && !lowerUserText.startsWith('/image') && (() => {
    const buildVerbs = ['banao', 'banaye', 'banado', 'banaiye', 'banana hai', 'bana do', 'bana ke do', 'create', 'build', 'make', 'develop'];
    const appNouns = ['game', 'app', 'website', 'webpage', 'calculator', 'stopwatch', 'timer', 'clock', 'puzzle', 'quiz', 'dashboard', 'portfolio', 'mario', 'snake', 'flappy', 'todo', 'converter', 'simulator', '2048', 'pong', 'chess'];
    return buildVerbs.some(v => lowerUserText.includes(v)) && appNouns.some(n => lowerUserText.includes(n));
  })();

  const isBuilderMode = (isBuildCommand || isRebuildCommand || isNaturalBuild) && !isVoiceMode;
  let generationTemp = 0.7;
  let maxTokens = isVoiceMode ? 140 : 1000;

  let systemInstruction = '';

  if (isBuilderMode) {
    generationTemp = 0.2;
    maxTokens = 8192; // Ensure full index.html fits without cutoffs

    if (isRebuildCommand) {
      systemInstruction = `You are an expert AI software engineer that repairs and enhances standalone web applications and games inside a single "index.html" file.
COMMAND: /rebuild
CRITICAL PROTOCOL:
1. Carefully analyze the existing index.html and user requested changes.
2. Maintain 100% of the working features, CSS styling, logic, and mechanics. DO NOT DELETE OR BREAK EXISTING FUNCTIONALITY.
3. Fix the requested issue, add requested features, or upgrade the UI.
4. Output the FULL, COMPLETE working updated "index.html" enclosed strictly within a single code block:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Application</title>
  <style>/* Complete updated CSS */</style>
</head>
<body>
  <!-- Complete updated UI -->
  <script>/* Complete updated JavaScript with Web Audio API & controls */</script>
</body>
</html>
\`\`\`

Followed by a concise report:
✅ **Rebuild Complete**
- **Changes Applied:** <Summary of modifications>
- **Tested & Preserved:** <Verification that previous features remain functional>

[QUESTIONS]
- /rebuild isme sound effects aur score animations add karo
- /rebuild mobile touch controls improve karo
- /rebuild dark mode toggle add karo`;
    } else {
      systemInstruction = `You are an expert AI software engineer that builds complete, fully-functional, standalone web applications and games inside a single "index.html" file.
COMMAND: /build
CRITICAL BUILD PROTOCOL:
1. Build the FULL, COMPLETE working product inside a single self-contained "index.html" (HTML + CSS + JavaScript).
2. NO PLACEHOLDERS, NO DUMMY STUBS, NO TODO COMMENTS. Every button, input, or control must work.
3. MOBILE & DESKTOP COMPATIBILITY: Include touch controls for mobile AND keyboard controls for desktop.
4. AUDIO: Synthesize any sound effects using Web Audio API (new (window.AudioContext || window.webkitAudioContext)()).
5. POLISHED UI: Modern, responsive CSS with clean typography, high contrast, and smooth animations.
6. OUTPUT FORMAT: Provide the full single-file index.html enclosed in a code block:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Application</title>
  <style>/* Complete CSS */</style>
</head>
<body>
  <!-- Complete UI -->
  <script>/* Complete JavaScript */</script>
</body>
</html>
\`\`\`

Followed by:
✅ **Build Complete**
- **Project:** <Description>
- **Working Features:** <Key interactive features>
- **File:** \`index.html\` is ready and running in the live interactive sandbox below!

[QUESTIONS]
- /rebuild isme sound effects aur score system add karo
- /rebuild mobile touch controls improve karo
- /rebuild dark mode toggle aur settings panel add karo`;
    }
  } else if (isNoteCommand && !isVoiceMode) {
    generationTemp = 0.2;
    maxTokens = 8192;
    systemInstruction = `You are Blackbell NoteMaster, an expert academic researcher that creates visual handwritten student study notes in a single self-contained index.html.
OUTPUT FORMAT:
Enclose the complete HTML inside a code block:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Study Notes</title>
  <style>
    /* Lined paper styling with cyan lines, double red vertical margin, highlighter accents */
  </style>
</head>
<body>
  <!-- Structured visual notes with handwritten aesthetic, diagrams, summary, and PDF export -->
  <script>
    // Print/PDF export handler
  </script>
</body>
</html>
\`\`\`

[QUESTIONS]
- /note isme flowcharts aur diagrams add karo
- /note is topic ke key exam questions add karo
- /note summary aur quick formula cheat sheet banao`;
  } else if (personality === 'black') {
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

  // If rebuilding, extract previous index.html from history so Gemini knows the base code
  let existingHtmlForRebuild = '';
  if (isRebuildCommand) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.content) {
        const match = m.content.match(/```html\s*([\s\S]*?)\s*```/i) || m.content.match(/```\s*([\s\S]*?)\s*```/i);
        if (match && match[1] && (match[1].includes('<!DOCTYPE') || match[1].includes('<html') || match[1].includes('<body'))) {
          existingHtmlForRebuild = match[1].trim();
          break;
        } else if (m.content.includes('<!DOCTYPE html') || m.content.includes('<html')) {
          existingHtmlForRebuild = m.content.trim();
          break;
        }
      }
    }
  }

  const formattedContents = windowedMessages
    .filter(m => m.content && m.content.trim())
    .map(m => {
      let text = m.content;
      if (m === lastUserMsg && isRebuildCommand && existingHtmlForRebuild) {
        text = `EXISTING INDEX.HTML CODE TO UPDATE:\n\`\`\`html\n${existingHtmlForRebuild}\n\`\`\`\n\nUSER REBUILD REQUEST:\n${userText}`;
      }
      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text }]
      };
    });

  if (formattedContents.length === 0) {
    throw new Error('No messages provided to Gemini');
  }

  // Multi-model resilience chain: automatically cascades when a model experiences high demand, 503 spikes, or 429 quota limits
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash'];
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
          temperature: generationTemp,
          maxOutputTokens: maxTokens
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
        console.warn(`[Client-Direct Gemini] Model ${model} returned ${res.status} ("${errMsg}"). Automatically falling back to next model in chain...`);
        lastError = new Error(errMsg);
        continue;
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

// Direct client-side Gemini TTS generator for Bell & Black voices on Vercel and Netlify
export async function generateGeminiDirectTTS(
  text: string,
  voiceName: string = 'Aoede',
  apiKey?: string,
  signal?: AbortSignal
): Promise<{ base64Audio: string; isPcm: boolean } | null> {
  const cleanKey = (apiKey && apiKey.trim()) || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || '';
  if (!cleanKey || !text.trim() || signal?.aborted) return null;

  // Clean out any questions marker or heavy punctuation before speaking
  const speechText = text.split('[QUESTIONS]')[0].replace(/\*+/g, '').replace(/_+/g, '').trim();
  if (!speechText) return null;

  // Dedicated Google Gemini Text-to-Speech models that support audio modality
  const ttsModels = [
    'gemini-2.5-flash-preview-tts',
    'gemini-3.8-flash-tts',
    'gemini-3.1-flash-tts-preview'
  ];

  for (const model of ttsModels) {
    if (signal?.aborted) return null;
    try {
      const timeoutController = new AbortController();
      const timer = setTimeout(() => timeoutController.abort(), 8000);

      const onParentAbort = () => timeoutController.abort();
      if (signal) signal.addEventListener('abort', onParentAbort);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
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


      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;
      if (base64Audio) {
        const mimeType = inlineData?.mimeType || 'audio/pcm';
        const isPcm = mimeType.includes('pcm') || !mimeType.includes('wav');
        return { base64Audio, isPcm };
      }
    } catch (e: any) {
      if (e?.name === 'AbortError' && signal?.aborted) {
        return null;
      }
    }
  }

  return null;
}

