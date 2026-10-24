// Using Node's native global fetch API (available in Node 18+) for maximum performance and zero dependency overhead.

interface Theme {
  bgGradient: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  shapes: string[];
}

// Map keywords to gorgeous aesthetic color themes
function getAestheticTheme(prompt: string): Theme {
  const lower = prompt.toLowerCase();
  
  if (lower.includes("cyberpunk") || lower.includes("tech") || lower.includes("robot") || lower.includes("city") || lower.includes("future") || lower.includes("computer") || lower.includes("neon")) {
    return {
      bgGradient: "linear-gradient(135deg, #0b001a 0%, #1c0038 50%, #001220 100%)",
      primaryColor: "#ff007f",
      secondaryColor: "#00f0ff",
      glowColor: "rgba(0, 240, 255, 0.4)",
      shapes: ["circle", "rect", "grid", "polygon"]
    };
  }
  
  if (lower.includes("forest") || lower.includes("nature") || lower.includes("tree") || lower.includes("green") || lower.includes("garden") || lower.includes("flower") || lower.includes("mountain") || lower.includes("zen")) {
    return {
      bgGradient: "linear-gradient(135deg, #051e12 0%, #0a3a23 50%, #154c30 100%)",
      primaryColor: "#ffd700",
      secondaryColor: "#4ade80",
      glowColor: "rgba(74, 222, 128, 0.4)",
      shapes: ["circle", "flower", "organic", "wave"]
    };
  }

  if (lower.includes("love") || lower.includes("cute") || lower.includes("heart") || lower.includes("girl") || lower.includes("queen") || lower.includes("romantic") || lower.includes("angel")) {
    return {
      bgGradient: "linear-gradient(135deg, #1f0010 0%, #4a0025 50%, #1d0012 100%)",
      primaryColor: "#ff4d80",
      secondaryColor: "#ff99bb",
      glowColor: "rgba(255, 77, 128, 0.4)",
      shapes: ["circle", "heart", "wave", "star"]
    };
  }

  if (lower.includes("space") || lower.includes("galaxy") || lower.includes("star") || lower.includes("planet") || lower.includes("cosmic") || lower.includes("universe")) {
    return {
      bgGradient: "linear-gradient(135deg, #02000a 0%, #0d0c22 50%, #040114 100%)",
      primaryColor: "#bf55ec",
      secondaryColor: "#22a7f0",
      glowColor: "rgba(191, 85, 236, 0.4)",
      shapes: ["circle", "orbit", "star", "nebula"]
    };
  }

  if (lower.includes("fire") || lower.includes("sun") || lower.includes("burn") || lower.includes("gold") || lower.includes("war") || lower.includes("battle") || lower.includes("dragon")) {
    return {
      bgGradient: "linear-gradient(135deg, #1a0500 0%, #3d0d00 50%, #140400 100%)",
      primaryColor: "#ff3300",
      secondaryColor: "#ffaa00",
      glowColor: "rgba(255, 170, 0, 0.4)",
      shapes: ["polygon", "rect", "grid", "star"]
    };
  }

  // Default deep, luxury, high-end abstract theme
  return {
    bgGradient: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #090d13 100%)",
    primaryColor: "#58a6ff",
    secondaryColor: "#bc8cff",
    glowColor: "rgba(188, 140, 255, 0.3)",
    shapes: ["circle", "rect", "grid", "wave"]
  };
}

// Generate an elegant, gorgeous abstract SVG vector artwork offline
export function generateLocalSVGImage(prompt: string): string {
  const theme = getAestheticTheme(prompt);
  const words = prompt.trim().split(/\s+/).filter(w => w.length > 2);
  const displayTitle = words.slice(0, 4).join(" ") || "Abstract Space";
  
  // Custom design features
  let customGraphics = "";
  
  // Render high-tech grids
  if (theme.shapes.includes("grid")) {
    customGraphics += `
      <!-- Neon Grid Base -->
      <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${theme.secondaryColor}" stroke-width="0.5" opacity="0.15" />
      </pattern>
      <rect width="768" height="768" fill="url(#gridPattern)" />
    `;
  }

  // Render geometric rotating patterns
  if (theme.shapes.includes("circle")) {
    customGraphics += `
      <!-- Concentric Aesthetic Rings -->
      <circle cx="384" cy="384" r="280" stroke="${theme.primaryColor}" stroke-width="1.5" stroke-dasharray="10 15" fill="none" opacity="0.3" />
      <circle cx="384" cy="384" r="240" stroke="${theme.secondaryColor}" stroke-width="1" fill="none" opacity="0.2" />
      <circle cx="384" cy="384" r="200" stroke="${theme.primaryColor}" stroke-width="2" stroke-dasharray="50 10 5 10" fill="none" opacity="0.4" />
      <circle cx="384" cy="384" r="160" stroke="${theme.secondaryColor}" stroke-width="1.5" fill="none" opacity="0.5" />
    `;
  }

  if (theme.shapes.includes("orbit")) {
    customGraphics += `
      <!-- Planetary Cosmic Orbit rings -->
      <ellipse cx="384" cy="384" rx="320" ry="120" stroke="${theme.secondaryColor}" stroke-width="2" stroke-dasharray="20 10" fill="none" transform="rotate(-15 384 384)" opacity="0.4" />
      <ellipse cx="384" cy="384" rx="260" ry="80" stroke="${theme.primaryColor}" stroke-width="1.5" fill="none" transform="rotate(25 384 384)" opacity="0.5" />
      <circle cx="200" cy="335" r="16" fill="${theme.primaryColor}" filter="url(#glow)" />
      <circle cx="560" cy="435" r="22" fill="${theme.secondaryColor}" filter="url(#glow)" />
    `;
  }

  if (theme.shapes.includes("heart")) {
    customGraphics += `
      <!-- Loving Heart Symbol path -->
      <path d="M 384 450 C 310 380, 240 310, 240 240 C 240 180, 280 140, 340 140 C 374 140, 384 165, 384 165 C 384 165, 394 140, 428 140 C 488 140, 528 180, 528 240 C 528 310, 458 380, 384 450 Z" 
            fill="none" stroke="${theme.primaryColor}" stroke-width="3" filter="url(#glow)" opacity="0.8" />
    `;
  }

  if (theme.shapes.includes("flower") || theme.shapes.includes("organic")) {
    customGraphics += `
      <!-- Mandala Zen Organic Petals -->
      <g transform="translate(384, 384) scale(1.5)">
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" />
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" transform="rotate(45)" />
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" transform="rotate(90)" />
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" transform="rotate(135)" />
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" transform="rotate(180)" />
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" transform="rotate(225)" />
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" transform="rotate(270)" />
        <path d="M0,0 C20,-40 40,-40 0,-100 C-40,-40 -20,-40 0,0" fill="${theme.primaryColor}" opacity="0.15" transform="rotate(315)" />
      </g>
    `;
  }

  // Neon glowing polygons
  if (theme.shapes.includes("polygon")) {
    customGraphics += `
      <polygon points="384,180 540,270 540,450 384,540 228,450 228,270" fill="none" stroke="${theme.secondaryColor}" stroke-width="2.5" filter="url(#glow)" opacity="0.7" />
      <polygon points="384,240 480,300 480,410 384,470 288,410 288,300" fill="none" stroke="${theme.primaryColor}" stroke-width="1.5" opacity="0.5" />
    `;
  }

  // Draw smooth sine waves
  if (theme.shapes.includes("wave")) {
    customGraphics += `
      <!-- Elegant Sine Waves -->
      <path d="M -50,500 Q 150,300 350,500 T 750,500" fill="none" stroke="${theme.secondaryColor}" stroke-width="2" opacity="0.4" />
      <path d="M 0,550 Q 200,400 400,550 T 800,550" fill="none" stroke="${theme.primaryColor}" stroke-width="1.5" opacity="0.3" />
    `;
  }

  // Render star elements
  if (theme.shapes.includes("star")) {
    customGraphics += `
      <!-- Decorative Sparkle Stars -->
      <g stroke="none" fill="${theme.primaryColor}">
        <path d="M 150,150 L 153,165 L 168,168 L 153,171 L 150,186 L 147,171 L 132,168 L 147,165 Z" opacity="0.8" filter="url(#glow)" />
        <path d="M 600,180 L 602,190 L 612,192 L 602,194 L 600,204 L 598,194 L 588,192 L 598,190 Z" opacity="0.9" />
        <path d="M 220,600 L 221,607 L 228,608 L 221,609 L 220,616 L 219,609 L 212,608 L 219,607 Z" opacity="0.7" />
        <path d="M 580,580 L 583,595 L 598,598 L 583,601 L 580,616 L 577,601 L 562,598 L 577,595 Z" opacity="0.85" filter="url(#glow)" />
      </g>
    `;
  }

  // Render beautiful particles / nebula
  customGraphics += `
    <g fill="#fff" opacity="0.2">
      <circle cx="100" cy="200" r="1.5" />
      <circle cx="150" cy="450" r="2" />
      <circle cx="280" cy="180" r="1" />
      <circle cx="640" cy="250" r="1.5" />
      <circle cx="680" cy="600" r="2" />
      <circle cx="480" cy="640" r="1" />
      <circle cx="120" cy="580" r="1.5" />
    </g>
  `;

  // Formulate complete, gorgeous inline SVG structure
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="100%" height="100%" style="background: ${theme.bgGradient}; font-family: 'Segoe UI', -apple-system, sans-serif;">
      <defs>
        <!-- High-End Glassmorphism Blur Filters -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="cardBlur">
          <feGaussianBlur stdDeviation="20" />
        </filter>
        
        <!-- Modern linear clip masks and gradients -->
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="${theme.secondaryColor}" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${theme.primaryColor}" />
          <stop offset="100%" stop-color="${theme.secondaryColor}" />
        </linearGradient>
      </defs>

      <!-- Background custom patterns & visual theme templates -->
      ${customGraphics}

      <!-- Center Aesthetic Core Orb -->
      <circle cx="384" cy="384" r="120" fill="${theme.primaryColor}" opacity="0.12" filter="url(#glow)" />
      <circle cx="384" cy="384" r="80" fill="${theme.secondaryColor}" opacity="0.08" filter="url(#glow)" />

      <!-- High-Tech Central Core rings -->
      <g filter="url(#glow)">
        <circle cx="384" cy="384" r="6" fill="#ffffff" />
        <circle cx="384" cy="384" r="14" stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.7" />
        <circle cx="384" cy="384" r="28" stroke="${theme.secondaryColor}" stroke-width="1" stroke-dasharray="4 4" fill="none" />
      </g>

      <!-- Translucent Glassmorphism Badge at the bottom -->
      <g transform="translate(134, 600)">
        <!-- Frosted Glass Backing -->
        <rect width="500" height="95" rx="20" fill="#000000" opacity="0.45" />
        <rect width="500" height="95" rx="20" fill="none" stroke="url(#accentGrad)" stroke-width="1.5" opacity="0.7" />
        
        <!-- Blackbell Luxury Logo watermark -->
        <text x="30" y="38" fill="url(#textGrad)" font-size="20" font-weight="800" letter-spacing="2">BLACKBELL 2.0</text>
        <text x="30" y="55" fill="${theme.secondaryColor}" font-size="10" font-weight="600" letter-spacing="4" opacity="0.8">AUTONOMOUS ARTIST</text>
        
        <line x1="220" y1="20" x2="220" y2="75" stroke="#ffffff" opacity="0.15" stroke-width="1" />

        <!-- User prompt title -->
        <text x="240" y="38" fill="#ffffff" font-size="14" font-weight="700" opacity="0.95">${displayTitle.toUpperCase()}</text>
        <text x="240" y="56" fill="#ffffff" font-size="10" font-weight="500" opacity="0.6" width="220" clip-path="ellipse(110px 10px)">
          ${prompt.length > 36 ? prompt.substring(0, 36) + "..." : prompt}
        </text>
        <text x="240" y="72" fill="${theme.secondaryColor}" font-size="9" font-weight="700" letter-spacing="1">100% OFFLINE HIGH-FIDELITY VECTOR</text>
      </g>
      
      <!-- Outer Elegant Accent Frame -->
      <rect x="20" y="20" width="728" height="728" fill="none" stroke="${theme.primaryColor}" stroke-width="1" opacity="0.15" />
    </svg>
  `;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Highly robust image generation pipeline that tries multiple fallbacks if Pollinations fails
export async function generateImagePipeline(prompt: string): Promise<{ buffer: Buffer; contentType: string; provider: string }> {
  const seed = Math.floor(Math.random() * 1000000);
  const styledPrompt = `${prompt}, cinematic quality, photorealistic rendering, ultra detailed, magical atmosphere, masterpiece, digital art style`;
  
  // Layer 1: Pollinations AI (Primary generator)
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(styledPrompt)}?width=768&height=768&nologo=true&seed=${seed}&enhance=false`;
  
  try {
    console.log("[Image Pipeline] Layer 1: Calling Pollinations AI...");
    const response = await fetchWithTimeout(pollinationsUrl, 8000); // strict 8s timeout to fail fast
    if (response.ok) {
      const arrBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrBuf);
      if (buffer && buffer.length > 2000) { // Validate it's a real image and not an empty error response
        console.log("[Image Pipeline] Layer 1 Succeeded!");
        return { buffer, contentType: response.headers.get("content-type") || "image/jpeg", provider: "Pollinations AI" };
      }
    }
  } catch (err: any) {
    console.warn("[Image Pipeline] Layer 1 Failed:", err?.message || err);
  }

  // Layer 2: LoremFlickr (Robust Photographic Keyword fallback - 100% free, high uptime)
  const cleanKeywords = prompt
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 4)
    .join(",");
  
  const loremFlickrUrl = `https://loremflickr.com/768/768/${encodeURIComponent(cleanKeywords || "abstract,wallpaper")}`;
  
  try {
    console.log(`[Image Pipeline] Layer 2 Fallback: Calling LoremFlickr Photographic search with keywords: "${cleanKeywords}"...`);
    const response = await fetchWithTimeout(loremFlickrUrl, 6000);
    if (response.ok) {
      const arrBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrBuf);
      if (buffer && buffer.length > 2000) {
        console.log("[Image Pipeline] Layer 2 Succeeded!");
        return { buffer, contentType: response.headers.get("content-type") || "image/jpeg", provider: "LoremFlickr High-Res Search" };
      }
    }
  } catch (err: any) {
    console.warn("[Image Pipeline] Layer 2 Failed:", err?.message || err);
  }

  // Layer 3: Picsum Photos fallback (Extremely reliable dynamic fallback)
  const picsumUrl = `https://picsum.photos/768/768`;
  try {
    console.log("[Image Pipeline] Layer 3 Fallback: Fetching Picsum aesthetic photography...");
    const response = await fetchWithTimeout(picsumUrl, 5000);
    if (response.ok) {
      const arrBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrBuf);
      if (buffer && buffer.length > 2000) {
        console.log("[Image Pipeline] Layer 3 Succeeded!");
        return { buffer, contentType: "image/jpeg", provider: "Picsum Dynamic Photography" };
      }
    }
  } catch (err: any) {
    console.warn("[Image Pipeline] Layer 3 Failed:", err?.message || err);
  }

  // Layer 4: 100% Offline, Server-Side Beautiful SVG Graphic Artwork (Absolute self-reliance, works even with ZERO internet!)
  console.log("[Image Pipeline] Layer 4 Fallback: Rendering custom offline SVG vector artwork...");
  const svgString = generateLocalSVGImage(prompt);
  const buffer = Buffer.from(svgString);
  
  return {
    buffer,
    contentType: "image/svg+xml",
    provider: "Blackbell Local Vector Graphic Artist"
  };
}
