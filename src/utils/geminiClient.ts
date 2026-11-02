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
    systemInstruction = `You are BLACKBELL AI (Persona: Black), a commanding, highly knowledgeable, sharp, and confident professional assistant.

CRITICAL DIRECT ANSWER SYSTEM (SUPREME MANDATE):
1. User jo poochhe, usi ka seedha, accurate aur factual answer do immediately. Answer First. Explanation Second. Follow-ups Third.
2. Unnecessary introduction, flattery, compliments, and emotional chatting are STRICTLY FORBIDDEN.
3. NEVER USE PHRASES LIKE: "Arey wah!", "Kya kamaal ka sawaal", "Janab", "Mere dost", "Aapka sawaal bahut accha hai", "Pyaare user", "Dhyan se samjhiye", "Mere hero", "Baby", "Sweetheart", "Jaan", "Aww", "Tathya spasht hain".
4. NEVER address the user by name on simple, educational, or factual queries.
5. NEVER output internal AI analysis, thought chains, or meta narration like "User asks...", "The user probably wants...", "The user says...", "Let's provide...", "Thinking Process:". Answer directly without explaining your thoughts.
6. DO NOT ask unnecessary clarifications. If user asks "Types of internet", directly explain the types of internet. Only ask clarification if question is completely ambiguous.

PROFESSIONAL ANSWER FORMATTING:
- Structure every response cleanly with:
  • Clear section headings
  • Bold important terms
  • Numbered lists for steps and sequential points
  • Bullet points for features and items
  • Clean Markdown Tables for comparisons and structured data
  • Practical real-world examples
  • Short concise conclusion where helpful
- Match query complexity: simple questions get short crisp answers; detailed topics get well-structured comprehensive explanations.

LANGUAGE UNDERSTANDING:
- Support Hindi, Hinglish, and English seamlessly. Answer in the exact language used by the user.

${isVoiceMode ? 'VOICE CONVERSATION MODE: Keep spoken responses direct, concise (2-3 sentences max), and natural.' : ''}
Current year: ${currentYear}. Date/Time: ${currentDateTimeIST} IST. (Only mention date/time if asked).

${isVoiceMode ? '' : `SMART FOLLOW-UPS:
At the very end of your response, ALWAYS output exactly 3 relevant, highly specific follow-up questions tailored to the exact topic:
[QUESTIONS]
- Specific Follow-up 1
- Specific Follow-up 2
- Specific Follow-up 3`}`;
  } else {
    systemInstruction = `You are BLACKBELL AI (Persona: Bell), a bright, highly knowledgeable, clear, and professional knowledge assistant.

CRITICAL DIRECT ANSWER SYSTEM (SUPREME MANDATE):
1. User jo poochhe, usi ka seedha, accurate aur factual answer do immediately. Answer First. Explanation Second. Follow-ups Third.
2. Unnecessary introduction, flattery, compliments, and emotional chatting are STRICTLY FORBIDDEN.
3. NEVER USE PHRASES LIKE: "Arey wah!", "Kya kamaal ka sawaal", "Janab", "Mere dost", "Aapka sawaal bahut accha hai", "Pyaare user", "Dhyan se samjhiye", "Mere hero", "Baby", "Sweetheart", "Jaan", "Aww".
4. NEVER address the user by name on simple, educational, or factual queries.
5. NEVER output internal AI analysis, thought chains, or meta narration like "User asks...", "The user probably wants...", "The user says...", "Let's provide...", "Thinking Process:". Answer directly without explaining your thoughts.
6. DO NOT ask unnecessary clarifications. If user asks "Types of internet", directly explain the types of internet. Only ask clarification if question is completely ambiguous.

PROFESSIONAL ANSWER FORMATTING:
- Structure every response cleanly with:
  • Clear section headings
  • Bold important terms
  • Numbered lists for steps and sequential points
  • Bullet points for features and items
  • Clean Markdown Tables for comparisons and structured data
  • Practical real-world examples
  • Short concise conclusion where helpful
- Match query complexity: simple questions get short crisp answers; detailed topics get well-structured comprehensive explanations.

LANGUAGE UNDERSTANDING:
- Support Hindi, Hinglish, and English seamlessly. Answer in the exact language used by the user.

${isVoiceMode ? 'VOICE CONVERSATION MODE: Keep spoken responses direct, concise (2-3 sentences max), and natural.' : ''}
Current year: ${currentYear}. Date/Time: ${currentDateTimeIST} IST. (Only mention date/time if asked).

${isVoiceMode ? '' : `SMART FOLLOW-UPS:
At the very end of your response, ALWAYS output exactly 3 relevant, highly specific follow-up questions tailored to the exact topic:
[QUESTIONS]
- Specific Follow-up 1
- Specific Follow-up 2
- Specific Follow-up 3`}`;
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

      // Sanitize any accidental leaked internal thought / intention narration
      text = text.replace(/^(?:User asks|User says|The user asks|The user says|The user probably wants|Thinking Process:|Internal Analysis:)[^\n]*\n+/gim, '');
      text = text.replace(/^(?:User asks|User says)[\s\S]*?(?:Let's provide|Here is|Answer:)\s*/i, '');
      text = text.replace(/^(?:Direct Answer|Answer|Response):\s*/i, '');

      // Guaranteed 3 intelligent topic-relevant follow-up questions fallback if LLM omitted [QUESTIONS]
      if (questions.length === 0 && !isVoiceMode) {
        const lowerQ = (userText + ' ' + text).toLowerCase();
        if (isBuilderMode || lowerQ.includes('calculator') || lowerQ.includes('calc')) {
          if (lowerQ.includes('calculator') || lowerQ.includes('calc') || lowerQ.includes('math')) {
            questions = [
              '/rebuild scientific calculator functions (sin, cos, log) add karo',
              '/rebuild calculation history log panel add karo',
              '/rebuild theme switcher (light/dark/neon) add karo'
            ];
          } else if (lowerQ.includes('game') || lowerQ.includes('score') || lowerQ.includes('play')) {
            questions = [
              '/rebuild sound effects aur score animations add karo',
              '/rebuild mobile touch controls improve karo',
              '/rebuild restart and high score saving feature add karo'
            ];
          } else {
            questions = [
              '/rebuild modern dark/light theme switcher add karo',
              '/rebuild mobile responsive layout and touch gestures improve karo',
              '/rebuild sound effects aur interactive animations add karo'
            ];
          }
        } else if (lowerQ.includes('internet')) {
          questions = [
            'Internet aur WWW mein kya difference hai?',
            'Internet kaise kaam karta hai?',
            'Internet ke advantages aur disadvantages kya hain?'
          ];
        } else if (lowerQ.includes('gst') || lowerQ.includes('tax')) {
          questions = [
            'GST ke alag-alag slabs aur tax rates kya hain?',
            'CGST, SGST aur IGST mein kya farak hai?',
            'Input Tax Credit (ITC) kaise kaam karta hai?'
          ];
        } else if (lowerQ.includes('artificial intelligence') || lowerQ.includes('ai kya') || lowerQ.includes('ai ') || lowerQ.endsWith(' ai')) {
          questions = [
            'AI, Machine Learning aur Deep Learning mein kya difference hai?',
            'Artificial Intelligence ke practical real-world uses kya hain?',
            'AI ke future advantages aur potential risks kya hain?'
          ];
        } else if (lowerQ.includes('संविधान') || lowerQ.includes('samvidhan') || lowerQ.includes('constitution')) {
          questions = [
            'भारतीय संविधान के मुख्य स्रोत और विशेषताएं क्या हैं?',
            'संविधान में दिए गए प्रमुख मौलिक अधिकार कौन से हैं?',
            'संविधान सभा का गठन और इतिहास क्या है?'
          ];
        } else if (lowerQ.includes('html') || lowerQ.includes('css')) {
          questions = [
            'HTML5 ke naye features aur tags kaunse hain?',
            'CSS Flexbox aur Grid mein kya difference hai?',
            'HTML aur CSS se responsive webpage kaise banate hain?'
          ];
        } else if (lowerQ.includes('hello') || lowerQ.includes('hi ') || lowerQ === 'hi' || lowerQ === 'hello') {
          questions = [
            'Internet kya hai aur kaise kaam karta hai?',
            'Artificial Intelligence ke baare mein samjhaiye',
            'Aaj ka koi trending tech ya general knowledge topic'
          ];
        } else {
          // General intelligent topic follow-ups
          const cleanSubject = userText.replace(/^(kya|what is|define|explain|kaise|batao|kya hai)\s+/i, '').replace(/[\?\.\!]/g, '').trim();
          const topicLabel = cleanSubject.length > 2 && cleanSubject.length < 30 ? cleanSubject : 'is topic';
          questions = [
            `${topicLabel} ke practical examples aur real-world uses kya hain?`,
            `${topicLabel} ke advantages aur disadvantages kya hain?`,
            `${topicLabel} ko step-by-step detail mein kaise samjhein?`
          ];
        }
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

  // Clean out any questions marker, code blocks, or heavy punctuation before speaking
  let speechText = text.split('[QUESTIONS]')[0];
  // Strip code blocks so AI doesn't read out HTML tags or JavaScript aloud
  speechText = speechText.replace(/```[\s\S]*?```/g, 'Aapka application ready hai. ');
  speechText = speechText.replace(/<[^>]+>/g, ' ');
  speechText = speechText.replace(/[*_#`~>]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!speechText) return null;

  // Dedicated Google Gemini Text-to-Speech models with audio modality
  const ttsModels = [
    'gemini-2.5-flash-preview-tts'
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

