import { GoogleGenAI } from "@google/genai";

export interface NoteRequest {
  topicOrRequirement: string;
  chatHistory: Array<{ role: string; content: string; attachments?: any[] }>;
  userEmail?: string;
  imageAttachment?: { base64: string; mimeType: string };
}

export async function handleNoteGeneration(
  requirement: string,
  chatHistory: Array<{ role: string; content: string; attachments?: any[] }>,
  ai: GoogleGenAI,
  keyRotationFn?: <T>(fn: (ai: GoogleGenAI, key: string) => Promise<T>) => Promise<T>,
  imageAttachment?: { base64: string; mimeType: string }
): Promise<string> {
  // 1. Analyze chat history if requested or if requirement is broad (e.g. "is poori chat ke notes")
  let relevantContent = "";
  const isChatSummary = 
    !requirement || 
    requirement.toLowerCase().includes("chat") || 
    requirement.toLowerCase().includes("conversation") || 
    requirement.toLowerCase().includes("poori") || 
    requirement.toLowerCase().includes("all") ||
    requirement.toLowerCase() === "/note";

  if (chatHistory && chatHistory.length > 0) {
    const recentMsgs = chatHistory.slice(-15);
    const formattedHistory = recentMsgs.map(m => {
      const roleName = m.role === 'user' ? 'User' : 'Assistant';
      let content = m.content || "";
      if (content.length > 800) content = content.substring(0, 800) + "...";
      return `[${roleName}]: ${content}`;
    }).join("\n");
    
    relevantContent = `\n[RECENT CHAT CONTEXT]:\n${formattedHistory}\n`;
  }

  const systemInstruction = `You are Blackbell NoteMaster, an expert visual educator and master student notebook calligrapher.
Your mission is to generate authentic, 100% realistic HANDWRITTEN STUDENT STUDY NOTES matching the exact real-life Indian student ruled notebook style (as written by hand with a blue ballpoint pen on lined paper, with pink highlighter strokes and hand-drawn sketches).

ABSOLUTE STRICT DIRECTIVE:
DO NOT make it look like a digital card, Canva infographic, web UI component, or modern presentation!
It MUST look like a real physical notebook page that an Indian student wrote by hand with a Cello/Reynolds blue ballpoint pen.

AUTHENTIC NOTEBOOK SPECIFICATION (EXACT REPLICA OF THE REAL STUDENT COPY):
1. PAPER & RULING:
   - Genuine student ruled notebook paper background: warm off-white/cream paper (#f7f6f0).
   - Horizontal ruled lines: thin, clean light-blue lines (#8ca8c8) spaced at exactly 30px line-height.
   - LEFT MARGIN: A DOUBLE VERTICAL RED/PINK LINE on the left (lines at 72px and 78px in #e2536b).
   - MARGIN COLUMN (0 to 72px):
     * Section numbers ①, ②, ③, ④, ⑥ are written IN THE MARGIN COLUMN (to the left of the double red line)!
     * Circled in GREEN ink (①, ②, ③, ④, ⑥) using a hand-drawn 1.8px solid #16a34a circular border.
   - Top-right corner has a hand-drawn red/magenta rectangular box (#d92656) with:
     Row 1: "Date :    /    /"
     Row 2: "Page No. :   1" (written in blue ballpoint ink).

2. CENTER MAIN TOPIC TITLE:
   - Centered at the top: The topic title (e.g., "Internet") in dark blue/black ballpoint handwriting ('Kalam', 38px, bold, #0f172a).
   - A realistic translucent FLUORESCENT PINK HIGHLIGHTER STROKE across the title (background: rgba(244, 114, 182, 0.52); padding: 1px 12px; border-radius: 3px; display: inline-block;).

3. HANDWRITING & INK:
   - Blue ballpoint pen ink: #153e75 (authentic Indian student blue ball pen ink).
   - Font: 'Kalam', cursive for all Hindi and English handwritten text.
   - Section Heading Text: Highlighted with a FLUORESCENT PINK HIGHLIGHTER background (background: rgba(244, 114, 182, 0.48); padding: 0 8px; border-radius: 3px; display: inline-block; font-weight: 700; font-size: 20px; color: #0f172a;).
   - Hindi and English mixed naturally (Hinglish/Hindi study notes style).
   - Text lines MUST align with the 30px ruling lines so words sit directly on the blue notebook lines!

4. CORE VISUAL BLOCKS:
   - SECTION 1 (Definition + Cloud Quote):
     * Left: 3-4 lines of handwritten definition in blue pen.
     * Right: A hand-drawn scalloped CLOUD CALLOUT in blue ballpoint pen (#1d4ed8) containing the core summary quote (e.g., "A Global Network of Networks"). NO digital cards, just hand-drawn cloud lines!
   - SECTION 2 (Key Points + Hand-Drawn SVG Sketch):
     * Left side: Sub-points ① to ⑦ with green circled numbers in blue pen (e.g., ① Communication - Email, Chat, Video Call).
     * Right side: An authentic, colored hand-drawn SVG DOODLE ILLUSTRATION directly on the notebook lines! (e.g., Hand-drawn Earth globe in blue pen with light-green continents and light-blue oceans, labeled "Internet", and hand-drawn arrows pointing down to hand-drawn Laptop, Mobile, and Desktop Computer sketches with handwritten labels!).
   - SECTION 3 (How It Works + Flowchart):
     * Clear explanation in blue pen.
     * A horizontal flowchart drawn directly with blue pen: hand-drawn rounded/imperfect boxes connected by arrows: [Device] ➔ [ISP] ➔ (Internet Cloud) ➔ [Server].
   - SECTION 4 & 5 (Two-Column Side-by-Side Comparison):
     * Left Column: ④ [Topic] के फायदे (Points ① to ⑦ with green circled numbers).
     * Right Column: ⑤ [Topic] के नुकसान (Points ① to ⑥ with green circled numbers).
   - SECTION 6 (Conclusion / निष्कर्ष):
     * ⑥ in margin, "निष्कर्ष" in pink highlighter, followed by 1-2 thoughtful lines in blue pen.

OUTPUT FORMAT:
Output the complete HTML inside a single code block tagged:
\`\`\`html
<!DOCTYPE html>
<html lang="hi">
...
</html>
\`\`\`

Followed by:
📓 **Handwritten Study Notes Generated**
- **Topic:** <Topic Title>
- **Style:** Authentic Ruled Student Notebook (Double Red Margin, Blue Ballpoint Ink, Hand-drawn Sketches)
- **Download:** Click the "Download PDF" or "Save Image" button to save your study copy!

[QUESTIONS]
- /note is topic ke formula sheet aur practice questions banao
- /note is chapter ka quick 1-page revision map banao
- Is concept ko real-life example ke saath aur detail me samjhao`;

  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest"];
  const parts: any[] = [];

  // If user uploaded an image with their notes request, attach it so Gemini can analyze it directly
  if (imageAttachment && imageAttachment.base64) {
    parts.push({
      inlineData: {
        mimeType: imageAttachment.mimeType || "image/png",
        data: imageAttachment.base64
      }
    });
  }
  
  let userPrompt = `Create authentic visual handwritten student study notes matching this exact notebook page style (ruled lines, double red margin, date/page box, pink highlighter titles, green circled numbers, cloud quote, colored doodle sketches, flowchart, and 2-column benefits vs drawbacks) for:\n\n${requirement || "Internet"}\n\n${relevantContent}`;
  parts.push({ text: userPrompt });

  for (const modelName of modelsToTry) {
    try {
      let resultText = "";
      if (keyRotationFn) {
        resultText = await keyRotationFn(async (rotAi) => {
          const resp = await rotAi.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts }],
            config: {
              systemInstruction,
              temperature: 0.35,
              maxOutputTokens: 8192
            }
          });
          return resp.text || "";
        });
      } else {
        const resp = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction,
            temperature: 0.35,
            maxOutputTokens: 8192
          }
        });
        resultText = resp.text || "";
      }

      if (resultText && (resultText.includes("<!DOCTYPE") || resultText.includes("<html") || resultText.includes("class=\"notebook-page\"") || resultText.includes("notebook"))) {
        return resultText;
      }
    } catch (err: any) {
      console.warn(`[Note Generator] Model ${modelName} failed, rotating:`, err?.message || err);
    }
  }

  // Fallback high-speed handcrafted visual template if all models rate-limited
  return generateFallbackHandwrittenNote(requirement);
}

export function generateFallbackHandwrittenNote(topic: string): string {
  const cleanTitle = topic.replace(/\/note/gi, "").trim() || "Internet";
  const isInternet = !cleanTitle || cleanTitle.toLowerCase().includes("internet") || cleanTitle.toLowerCase().includes("network");

  return `\`\`\`html
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>${cleanTitle} - Handwritten Study Notes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@400;700&family=Patrick+Hand&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background: #1e2430;
      font-family: 'Kalam', cursive, sans-serif;
      color: #153e75;
      padding: 24px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      -webkit-font-smoothing: antialiased;
    }

    /* Authentic Ruled Indian Student Notebook Page */
    .notebook-page {
      width: 100%;
      max-width: 794px;
      min-height: 1123px;
      background-color: #f7f6f0;
      /* Ruled lines and double red margin */
      background-image: 
        /* Double vertical red margin line at 72px and 78px */
        linear-gradient(to right, transparent 72px, #e2536b 72px, #e2536b 73.5px, transparent 73.5px, transparent 77.5px, #e2536b 77.5px, #e2536b 79px, transparent 79px),
        /* Thin horizontal light blue notebook ruling lines at 30px */
        repeating-linear-gradient(transparent, transparent 29px, #8ca8c8 29px, #8ca8c8 30px);
      box-shadow: 
        inset 18px 0 24px -14px rgba(0,0,0,0.12),
        inset -8px 0 16px -10px rgba(0,0,0,0.06),
        0 12px 35px rgba(0,0,0,0.35);
      border-radius: 3px;
      position: relative;
      padding: 34px 28px 40px 92px; /* 92px leaves space past the 78px double red margin */
      margin: 0 auto;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      line-height: 30px;
    }

    /* Top-Right Header Box: Date & Page No. in magenta/red ballpoint pen */
    .header-box {
      position: absolute;
      top: 14px;
      right: 28px;
      border: 1.8px solid #d92656;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.7);
      width: 175px;
      font-size: 14.5px;
      color: #9f1239;
      z-index: 10;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 2px 8px;
      font-weight: 700;
      line-height: 22px;
    }
    .header-row:first-child {
      border-bottom: 1.5px solid #d92656;
    }
    .page-val {
      color: #153e75;
      font-weight: 700;
      padding-right: 12px;
    }

    /* Main Center Topic Title */
    .title-wrap {
      text-align: center;
      margin: 4px 0 16px 0;
      position: relative;
      display: block;
    }
    .title-text {
      font-family: 'Kalam', cursive;
      font-size: 38px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
      display: inline-block;
      position: relative;
      line-height: 1.2;
      padding: 0 14px;
    }
    .title-pink-hl {
      position: absolute;
      bottom: 2px;
      left: 0;
      right: 0;
      height: 16px;
      background: rgba(244, 114, 182, 0.52);
      border-radius: 4px;
      z-index: -1;
      transform: rotate(-0.4deg);
    }

    /* Section Structure & Left-Margin Circled Badges */
    .section-row {
      position: relative;
      margin-bottom: 16px;
    }
    /* Section number placed in the left margin (left of red double line) */
    .margin-badge {
      position: absolute;
      left: -64px; /* Sits in 0-72px margin column */
      top: 1px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 25px;
      height: 25px;
      border: 1.8px solid #16a34a;
      border-radius: 50% 48% 52% 49% / 49% 51% 48% 52%;
      color: #16a34a;
      font-family: 'Kalam', cursive;
      font-weight: 700;
      font-size: 15.5px;
      line-height: 1;
      background: rgba(255, 255, 255, 0.5);
    }

    /* Heading with authentic translucent pink highlighter mark */
    .heading-text {
      font-family: 'Kalam', cursive;
      font-size: 21px;
      font-weight: 700;
      color: #0f172a;
      background: rgba(244, 114, 182, 0.48);
      padding: 0 8px;
      border-radius: 3px;
      display: inline-block;
      line-height: 28px;
      margin-bottom: 6px;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }

    /* Regular Handwritten Text (Blue Ballpoint Pen Ink) */
    .pen-p {
      font-family: 'Kalam', cursive;
      font-size: 18px;
      color: #153e75;
      line-height: 30px;
      letter-spacing: 0.2px;
    }

    /* Scalloped Hand-Drawn Cloud Callout */
    .hand-cloud {
      border: 2px dashed #2563eb;
      border-radius: 35px 22px 40px 24px / 24px 38px 22px 35px;
      padding: 10px 16px;
      font-family: 'Kalam', 'Caveat', cursive;
      font-size: 18.5px;
      font-weight: 700;
      color: #1d4ed8;
      text-align: center;
      line-height: 24px;
      background: rgba(255, 255, 255, 0.55);
      transform: rotate(0.6deg);
    }

    /* Points List with Green Circled Sub-Badges */
    .point-line {
      display: flex;
      align-items: baseline;
      font-family: 'Kalam', cursive;
      font-size: 17.5px;
      line-height: 30px;
      color: #153e75;
      gap: 6px;
    }
    .sub-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 21px;
      height: 21px;
      min-width: 21px;
      border: 1.6px solid #16a34a;
      border-radius: 50%;
      color: #16a34a;
      font-size: 13.5px;
      font-weight: 700;
      line-height: 1;
      margin-right: 4px;
      flex-shrink: 0;
    }
    .point-title {
      font-weight: 700;
      color: #0f172a;
    }
    .point-sep {
      margin: 0 4px;
      color: #0f172a;
      font-weight: bold;
    }

    /* Hand-Drawn Flowchart with Imperfect Pen Boxes and Arrows */
    .flowchart-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      margin: 10px 0 14px 0;
      flex-wrap: wrap;
    }
    .flow-box {
      border: 1.8px solid #1e40af;
      border-radius: 4px;
      padding: 4px 10px;
      font-family: 'Kalam', cursive;
      font-size: 15px;
      font-weight: 700;
      color: #1e3a8a;
      text-align: center;
      line-height: 19px;
      background: rgba(255, 255, 255, 0.6);
    }
    .flow-box.cloud-node {
      border: 1.8px dashed #0284c7;
      border-radius: 24px 16px 22px 18px / 18px 24px 16px 20px;
      color: #0369a1;
    }
    .flow-arrow {
      color: #1e40af;
      font-size: 19px;
      font-weight: bold;
      line-height: 1;
    }

    /* Two-Column Comparison Grid */
    .comp-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 10px 0;
    }
    @media (max-width: 640px) {
      .comp-grid { grid-template-columns: 1fr; gap: 12px; }
    }

    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { background: transparent !important; padding: 0 !important; margin: 0 !important; }
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
</head>
<body>

  <!-- Full Ruled Indian Student Notebook Page -->
  <div class="notebook-page" id="page-1">
    
    <!-- Top-Right Red Box (Date & Page No.) -->
    <div class="header-box">
      <div class="header-row">
        <span>Date :</span>
        <span style="letter-spacing: 2px; color: #64748b;">/ &nbsp; /</span>
      </div>
      <div class="header-row">
        <span>Page No. :</span>
        <span class="page-val">1</span>
      </div>
    </div>

    <!-- Center Main Title -->
    <div class="title-wrap">
      <h1 class="title-text">
        ${isInternet ? "Internet" : cleanTitle}
        <span class="title-pink-hl"></span>
      </h1>
    </div>

    <!-- SECTION 1: Internet क्या हैं ? + Cloud Callout -->
    <div class="section-row">
      <!-- Section 1 number in left margin column -->
      <span class="margin-badge">①</span>
      
      <span class="heading-text">${isInternet ? "Internet क्या हैं ?" : `${cleanTitle} क्या हैं ?`}</span>
      
      <div style="display: grid; grid-template-columns: 1fr 230px; gap: 16px; align-items: center; margin-top: 4px;">
        <p class="pen-p">
          ${isInternet 
            ? "Internet दुनिया भर के computers, mobile और दूसरे devices को जोड़ने वाला एक global network हैं। इसके माध्यम से हम information को भेज और प्राप्त कर सकते हैं।" 
            : `${cleanTitle} ek bohot zaroori topic hai jiske madhyam se hum basic concepts, working mechanism aur practical outcomes ko step-by-step samajh sakte hain.`}
        </p>

        <!-- Scalloped Cloud Callout -->
        <div class="hand-cloud">
          "${isInternet ? "A Global Network of Networks" : `Core Summary of ${cleanTitle}`}"
        </div>
      </div>
    </div>

    <!-- SECTION 2: Internet के मुख्य उपयोग + Hand-Drawn Colored SVG Doodle Sketch -->
    <div class="section-row" style="margin-top: 14px;">
      <!-- Section 2 number in left margin column -->
      <span class="margin-badge">②</span>
      
      <span class="heading-text">${isInternet ? "Internet के मुख्य उपयोग" : `${cleanTitle} के मुख्य उपयोग`}</span>

      <div style="display: grid; grid-template-columns: 1fr 220px; gap: 14px; align-items: start; margin-top: 4px;">
        <!-- Left: 7 Points with green circled numbers sitting on ruled lines -->
        <div>
          <div class="point-line"><span class="sub-badge">①</span> <span class="point-title">Communication</span> <span class="point-sep">-</span> <span>Email, Chat, Video Call</span></div>
          <div class="point-line"><span class="sub-badge">②</span> <span class="point-title">Education</span> <span class="point-sep">-</span> <span>Online classes, E-books, Research</span></div>
          <div class="point-line"><span class="sub-badge">③</span> <span class="point-title">Entertainment</span> <span class="point-sep">-</span> <span>YouTube, Games, Music, Movies</span></div>
          <div class="point-line"><span class="sub-badge">④</span> <span class="point-title">Shopping</span> <span class="point-sep">-</span> <span>Online shopping और payment</span></div>
          <div class="point-line"><span class="sub-badge">⑤</span> <span class="point-title">Information</span> <span class="point-sep">-</span> <span>News, Weather, Search Engines</span></div>
          <div class="point-line"><span class="sub-badge">⑥</span> <span class="point-title">Banking</span> <span class="point-sep">-</span> <span>Online banking और money transfer</span></div>
          <div class="point-line"><span class="sub-badge">⑦</span> <span class="point-title">Social Media</span> <span class="point-sep">-</span> <span>Facebook, Instagram, Twitter आदि</span></div>
        </div>

        <!-- Right: Hand-Drawn Colored Sketch (Globe + Arrows + Laptop + Mobile + Computer) -->
        <div style="display: flex; justify-content: center; align-items: center; margin-top: -6px;">
          <svg viewBox="0 0 220 225" style="width: 100%; height: auto; max-width: 215px;" preserveAspectRatio="xMidYMid meet">
            <!-- Hand-drawn globe circle in blue ballpoint pen -->
            <circle cx="110" cy="54" r="41" fill="#bae6fd" stroke="#153e75" stroke-width="2.2" stroke-linecap="round"/>
            <!-- Green continents with sketchy colored pencil/crayon look -->
            <path d="M 86 42 Q 97 30, 116 36 Q 126 43, 119 58 Q 106 66, 93 60 Z" fill="#86efac" stroke="#16a34a" stroke-width="1.6"/>
            <path d="M 124 48 Q 134 46, 141 59 Q 135 71, 125 68 Z" fill="#86efac" stroke="#16a34a" stroke-width="1.6"/>
            <path d="M 95 69 Q 107 67, 113 82 Q 99 85, 91 77 Z" fill="#86efac" stroke="#16a34a" stroke-width="1.6"/>
            <!-- "Internet" written under globe -->
            <text x="110" y="110" text-anchor="middle" fill="#0f172a" font-family="'Kalam', cursive" font-size="15" font-weight="bold">Internet</text>

            <!-- 3 Hand-drawn directional arrows in blue ink -->
            <path d="M 82 90 L 46 140" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
            <polygon points="43,142 45,133 53,139" fill="#1d4ed8"/>

            <path d="M 110 114 L 110 140" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
            <polygon points="110,143 106,134 114,134" fill="#1d4ed8"/>

            <path d="M 138 90 L 174 140" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round"/>
            <polygon points="177,142 167,139 175,133" fill="#1d4ed8"/>

            <!-- Hand-drawn Laptop (Left) -->
            <rect x="22" y="148" width="46" height="29" rx="3" fill="#ffffff" stroke="#153e75" stroke-width="1.8"/>
            <rect x="26" y="152" width="38" height="21" rx="1.5" fill="#f0f9ff" stroke="#94a3b8" stroke-width="1"/>
            <path d="M 16 177 L 74 177 L 70 183 L 20 183 Z" fill="#e2e8f0" stroke="#153e75" stroke-width="1.8"/>
            <text x="45" y="199" text-anchor="middle" fill="#0f172a" font-family="'Kalam', cursive" font-size="13" font-weight="bold">Laptop</text>

            <!-- Hand-drawn Mobile Phone (Center) -->
            <rect x="94" y="146" width="32" height="44" rx="4" fill="#ffffff" stroke="#153e75" stroke-width="1.8"/>
            <rect x="98" y="152" width="24" height="32" rx="2" fill="#f0f9ff" stroke="#94a3b8" stroke-width="1"/>
            <circle cx="110" cy="186" r="1.5" fill="#64748b"/>
            <text x="110" y="204" text-anchor="middle" fill="#0f172a" font-family="'Kalam', cursive" font-size="13" font-weight="bold">Mobile</text>

            <!-- Hand-drawn Desktop Computer (Right) -->
            <rect x="154" y="144" width="44" height="31" rx="3" fill="#ffffff" stroke="#153e75" stroke-width="1.8"/>
            <rect x="158" y="148" width="36" height="23" rx="1.5" fill="#f0f9ff" stroke="#94a3b8" stroke-width="1"/>
            <path d="M 172 175 L 180 175 L 182 183 L 170 183 Z" fill="#cbd5e1" stroke="#153e75" stroke-width="1.5"/>
            <rect x="164" y="183" width="24" height="3" rx="1" fill="#64748b"/>
            <text x="176" y="200" text-anchor="middle" fill="#0f172a" font-family="'Kalam', cursive" font-size="13" font-weight="bold">Computer</text>
          </svg>
        </div>
      </div>
    </div>

    <!-- SECTION 3: Internet कैसे काम करता हैं ? + Hand-Drawn Flowchart -->
    <div class="section-row" style="margin-top: 14px;">
      <!-- Section 3 number in left margin column -->
      <span class="margin-badge">③</span>

      <span class="heading-text">${isInternet ? "Internet कैसे काम करता हैं ?" : `${cleanTitle} कैसे काम करता हैं ?`}</span>

      <p class="pen-p" style="margin-top: 4px;">
        ${isInternet 
          ? "जब हम किसी website या app को खोलते हैं, तो हमारा device Internet Service Provider (ISP) के जरिए Internet से जुड़ता हैं। Data छोटे-छोटे Packets में भेजा और प्राप्त किया जाता हैं। ये packets अलग-अलग servers के माध्यम से अपने destination तक पहुँचते हैं और हमें website या जानकारी दिखाई देती हैं।" 
          : "Yeh process sequential steps me execute hota hai jisme input data process hokar ISP aur network servers ke through verify hota hai aur final outcome deliver karta hai."}
      </p>

      <!-- Hand-drawn Flowchart with Blue Pen -->
      <div class="flowchart-container">
        <div class="flow-box">Your Device<br><span style="font-size: 12.5px; font-weight: normal; color: #334155;">(PC / Mobile)</span></div>
        <div class="flow-arrow">➔</div>
        <div class="flow-box">ISP<br><span style="font-size: 11.5px; font-weight: normal; color: #334155;">(Internet Service Provider)</span></div>
        <div class="flow-arrow">➔</div>
        <div class="flow-box cloud-node">Internet<br><span style="font-size: 12px; font-weight: normal; color: #0284c7;">(Network)</span></div>
        <div class="flow-arrow">➔</div>
        <div class="flow-box">Website / Server<br><span style="font-size: 12px; font-weight: normal; color: #334155;">(eg. Google)</span></div>
      </div>
    </div>

    <!-- SECTION 4 & 5: Two-Column Side-by-Side Comparison (फायदे vs नुकसान) -->
    <div class="comp-grid">
      <!-- Left Column: फायदे -->
      <div class="section-row" style="margin-bottom: 0;">
        <!-- Section 4 in left margin column -->
        <span class="margin-badge">④</span>
        
        <span class="heading-text">${isInternet ? "Internet के फायदे" : `${cleanTitle} के फायदे`}</span>
        
        <div style="margin-top: 4px;">
          <div class="point-line"><span class="sub-badge">①</span> <span>तेज communication</span></div>
          <div class="point-line"><span class="sub-badge">②</span> <span>Information आसानी से उपलब्ध</span></div>
          <div class="point-line"><span class="sub-badge">③</span> <span>Online education</span></div>
          <div class="point-line"><span class="sub-badge">④</span> <span>Online banking और payment</span></div>
          <div class="point-line"><span class="sub-badge">⑤</span> <span>Work from home</span></div>
          <div class="point-line"><span class="sub-badge">⑥</span> <span>Global connectivity</span></div>
          <div class="point-line"><span class="sub-badge">⑦</span> <span>Business और job opportunities</span></div>
        </div>
      </div>

      <!-- Right Column: नुकसान -->
      <div class="section-row" style="margin-bottom: 0;">
        <!-- Section 5 with green circled number inline with heading -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 23px; height: 23px; border: 1.8px solid #16a34a; border-radius: 50%; color: #16a34a; font-family: 'Kalam', cursive; font-weight: 700; font-size: 14.5px;">⑤</span>
          <span class="heading-text" style="margin-bottom: 0;">${isInternet ? "Internet के नुकसान" : `${cleanTitle} के नुकसान`}</span>
        </div>

        <div style="margin-top: 4px;">
          <div class="point-line"><span class="sub-badge">①</span> <span>Cyber crime का खतरा</span></div>
          <div class="point-line"><span class="sub-badge">②</span> <span>गलत information</span></div>
          <div class="point-line"><span class="sub-badge">③</span> <span>Privacy की समस्या</span></div>
          <div class="point-line"><span class="sub-badge">④</span> <span>Internet addiction</span></div>
          <div class="point-line"><span class="sub-badge">⑤</span> <span>समय की बर्बादी</span></div>
          <div class="point-line"><span class="sub-badge">⑥</span> <span>Fake news और online fraud</span></div>
        </div>
      </div>
    </div>

    <!-- SECTION 6: निष्कर्ष (Conclusion) -->
    <div class="section-row" style="margin-top: 14px;">
      <!-- Section 6 in left margin column -->
      <span class="margin-badge">⑥</span>

      <span class="heading-text">निष्कर्ष</span>

      <p class="pen-p" style="font-weight: 700; color: #0f172a; margin-top: 4px;">
        ${isInternet 
          ? "Internet आधुनिक जीवन का महत्वपूर्ण हिस्सा हैं। इसका सही और सुरक्षित तरीके से उपयोग करना चाहिए।" 
          : `${cleanTitle} aadhunik shiksha aur technology ka mahatvapurna ang hai. Iska santulit aur sahi upayog hume hamesha safal banata hai.`}
      </p>
    </div>

  </div>

</body>
</html>
\`\`\`

📓 **Handwritten Study Notes Generated**
- **Topic:** ${cleanTitle}
- **Style:** Authentic Ruled Indian Student Notebook (Double Red Margin, Blue Ballpoint Ink, Hand-drawn Sketches)
- **Visuals Included:** ✍️ Hand-drawn Colored Sketches (Globe + Devices), ☁️ Cloud Quote, 🔄 Flowchart Diagram, 📊 2-Column Advantages vs Disadvantages, 📌 निष्कर्ष
- **Download:** Click "Download PDF" or "Save Image" to keep your study copy!

[QUESTIONS]
- /note is topic ke formulas aur chemical/physics equations banao
- /note is concept ke practice questions aur step-by-step solutions banao
- /note ek page ka complete memory map banao`;
}
