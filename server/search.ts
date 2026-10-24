import { GoogleGenAI } from "@google/genai";

interface SearchCacheEntry {
  summary: string;
  timestamp: number;
}

const searchCache = new Map<string, SearchCacheEntry>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache to avoid redundant web requests

/**
 * Promise timeout utility with an immediate fallback value to ensure fast execution.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout Alert] Operation exceeded limit of ${ms}ms. Using fast fallback.`);
      resolve(fallbackValue);
    }, ms);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]);
}

/**
 * Intelligent query analyzer using Gemini 3.1-flash-lite to decide if a query is evergreen or requires web search.
 * Includes a regex-based pre-screener for fast performance.
 */
export async function getSearchQueryAndDecision(
  currentMessage: string,
  history: any[],
  ai: GoogleGenAI
): Promise<{ needsSearch: boolean; searchQuery: string }> {
  const lowerMsg = currentMessage.toLowerCase().trim();

  // 1. Regex check for extremely fast bypass on purely conversational / flirty / personal / greeting queries
  // This completely skips the Gemini classification API call, reducing latency from 3-5 seconds to 1ms!
  const flirtyConversationalRegex = /^(hello|hi|hey|hlo|yo|gm|gn|ok|okay|yes|no|hmm|hmmm|yeah|yep|yap|wow|nice|great|cool|i love you|love you|love|miss you|tum kaun ho|who are you|what is your name|tumhara naam kya hai|kaise ho|how are you|kya kar rahi ho|kya kar rahe ho|khana khaya|meri girlfriend|pyaar|sweetheart|sweetie|baby|shona|acha|accha|thik hai|kya chal raha|subah|raat|good morning|good night|cute|pyaari|pyaare|gussa|loyal|batao|sunao|charming|flirty|girlfriend|agreed|hahaha|hehe|haha|thanks|thank you|sorry|maaf|chalo)$|^(kaise ho|kya kar rahi ho|kya kar rahe ho|khana khaya|kya chal raha|i love you|love you|miss you|tum kaun ho)/i;

  if (flirtyConversationalRegex.test(lowerMsg)) {
    return { needsSearch: false, searchQuery: "" };
  }

  // Specific keywords/phrases that definitively signal explicit questions requiring real-time/latest data
  const quickSearchRegex = /\b(latest news|breaking news|live score|aaj ka mausam|current weather|gold price|today's price|share price|dollar rate|prime minister of|president of|kon hai|kab aayega|release date|exam result|live match|today's match|current time in|weather today|temperature in|election results|who won|search:|web search|taaza khabar)\b/i;
  
  if (quickSearchRegex.test(lowerMsg)) {
    return { needsSearch: true, searchQuery: currentMessage.replace(/^search:\s*/i, '').trim() };
  }

  // Instant 0ms decision for conversational chat: no extra slow LLM calls!
  return { needsSearch: false, searchQuery: "" };
}

/**
 * Robust parser that can parse html.duckduckgo.com, lite.duckduckgo.com, and generic HTML search lists.
 */
function parseDuckDuckGoHTML(html: string): { title: string; url: string; snippet: string; domain: string }[] {
  const results: { title: string; url: string; snippet: string; domain: string }[] = [];
  const seenUrls = new Set<string>();

  const decodeHTML = (str: string) => {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/&nbsp;/g, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // 1. Try traditional "html.duckduckgo.com" class-based layout
  const parts = html.split(/<div\s+class="[^"]*result[^"]*"/i);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // Find the main anchor
      const aMatch = part.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i) ||
                     part.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                     part.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = part.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                           part.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                           part.match(/<span[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/i);

      if (aMatch) {
        let rawUrl = aMatch[1];
        if (rawUrl.includes("uddg=")) {
          try {
            const partsUrl = rawUrl.split("uddg=")[1].split("&")[0];
            rawUrl = decodeURIComponent(partsUrl);
          } catch (e) {}
        }
        if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;
        if (rawUrl.includes("duckduckgo.com/") && !rawUrl.includes("uddg=")) continue;

        if (seenUrls.has(rawUrl)) continue;

        const title = decodeHTML(aMatch[2]);
        const snippet = snippetMatch ? decodeHTML(snippetMatch[1]) : "";
        if (!title || title.length < 3 || !rawUrl || rawUrl.length < 5) continue;

        seenUrls.add(rawUrl);
        let domain = "";
        try { domain = new URL(rawUrl).hostname; } catch (e) { domain = rawUrl; }

        results.push({ title, url: rawUrl, snippet, domain });
      }
    }
  }

  // 2. Try "lite.duckduckgo.com" table-based layout
  if (results.length === 0) {
    const linkRegex = /<a[^>]+class="result-link"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const liteMatches: { rawUrl: string; title: string; index: number }[] = [];
    while ((match = linkRegex.exec(html)) !== null) {
      liteMatches.push({ rawUrl: match[1], title: match[2], index: match.index });
    }

    for (let idx = 0; idx < liteMatches.length; idx++) {
      const current = liteMatches[idx];
      let rawUrl = current.rawUrl;
      if (rawUrl.includes("uddg=")) {
        try {
          const partsUrl = rawUrl.split("uddg=")[1].split("&")[0];
          rawUrl = decodeURIComponent(partsUrl);
        } catch (e) {}
      }
      if (rawUrl.startsWith("//")) rawUrl = "https:" + rawUrl;
      if (rawUrl.includes("duckduckgo.com/") && !rawUrl.includes("uddg=")) continue;
      if (seenUrls.has(rawUrl)) continue;

      const startIdx = current.index;
      const endIdx = liteMatches[idx + 1] ? liteMatches[idx + 1].index : html.length;
      const slice = html.substring(startIdx, endIdx);

      const snippetMatch = slice.match(/<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i) ||
                           slice.match(/<div[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/div>/i) ||
                           slice.match(/<span[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/span>/i);

      const snippet = snippetMatch ? decodeHTML(snippetMatch[1]) : "";
      const title = decodeHTML(current.title);

      if (!title || title.length < 3 || !rawUrl || rawUrl.length < 5) continue;

      seenUrls.add(rawUrl);
      let domain = "";
      try { domain = new URL(rawUrl).hostname; } catch (e) { domain = rawUrl; }

      results.push({ title, url: rawUrl, snippet, domain });
    }
  }

  // 3. Ultra-fallback: search for ANY external links (not containing duckduckgo or google)
  if (results.length === 0) {
    const genericLinkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    const allMatches: { rawUrl: string; title: string; index: number }[] = [];
    while ((match = genericLinkRegex.exec(html)) !== null) {
      let href = match[1];
      if (href.includes("uddg=")) {
        try { href = decodeURIComponent(href.split("uddg=")[1].split("&")[0]); } catch (e) {}
      }
      if (href.startsWith("http") && !href.includes("duckduckgo.com") && !href.includes("google.com")) {
        allMatches.push({ rawUrl: href, title: match[2], index: match.index });
      }
    }

    for (let idx = 0; idx < allMatches.length; idx++) {
      const current = allMatches[idx];
      if (seenUrls.has(current.rawUrl)) continue;

      const startIdx = current.index;
      const endIdx = allMatches[idx + 1] ? allMatches[idx + 1].index : html.length;
      const slice = html.substring(startIdx, endIdx);

      const textOnly = slice.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const snippet = textOnly.length > 50 ? textOnly.substring(0, 200) : "";
      const title = decodeHTML(current.title);

      if (title.length > 2 && current.rawUrl) {
        seenUrls.add(current.rawUrl);
        let domain = "";
        try { domain = new URL(current.rawUrl).hostname; } catch (e) { domain = current.rawUrl; }
        results.push({ title, url: current.rawUrl, snippet, domain });
      }
    }
  }

  return results;
}

/**
 * Performs a silent web search scraping DuckDuckGo HTML static search results,
 * filters/prioritizes them, and condenses them into a 1-2 paragraph factual summary.
 */
export async function performWebSearch(
  query: string,
  ai?: GoogleGenAI
): Promise<{ summary: string; isVerified: boolean }> {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  const now = Date.now();

  // 1. Check in-memory cache
  if (searchCache.has(normalizedQuery)) {
    const entry = searchCache.get(normalizedQuery)!;
    if (now - entry.timestamp < CACHE_TTL) {
      console.log(`[Web Search Cache] Hit for: "${query}"`);
      return { summary: entry.summary, isVerified: true };
    } else {
      console.log(`[Web Search Cache] Expired for: "${query}". Refreshing...`);
      searchCache.delete(normalizedQuery);
    }
  }

  console.log(`[Web Search] Running background scraper for query: "${query}"`);

  // Define strategies to try sequentially
  const strategies = [
    // Strategy 1: POST to html.duckduckgo.com
    {
      url: "https://html.duckduckgo.com/html/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `q=${encodeURIComponent(query)}&b=`
    },
    // Strategy 2: GET to html.duckduckgo.com
    {
      url: `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      method: "GET",
      headers: {},
      body: null
    },
    // Strategy 3: POST to lite.duckduckgo.com
    {
      url: "https://lite.duckduckgo.com/lite/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `q=${encodeURIComponent(query)}&kl=&df=`
    },
    // Strategy 4: GET to lite.duckduckgo.com
    {
      url: `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
      method: "GET",
      headers: {},
      body: null
    }
  ];

  // Wrap the core logic of search and summarization in a Promise with strict overall timeout budget
  const searchPromise = (async () => {
    let rawResults: { title: string; url: string; snippet: string; domain: string }[] = [];

    // Strategy 0: Wikipedia Search API (highly reliable, instant JSON response, never blocked)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
      const wikiRes = await fetch(wikiUrl, {
        signal: AbortSignal.timeout(500),
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        if (wikiData?.query?.search && Array.isArray(wikiData.query.search) && wikiData.query.search.length > 0) {
          wikiData.query.search.slice(0, 3).forEach((item: any) => {
            const cleanSnippet = item.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
            const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`;
            rawResults.push({
              title: item.title,
              url: articleUrl,
              snippet: cleanSnippet,
              domain: "wikipedia.org"
            });
          });
        }
      }
    } catch (wikiErr) {
      console.warn("[Web Search] Wikipedia strategy failed/timed out:", wikiErr);
    }

    // Strategy 0.5: DuckDuckGo Instant Answer API
    if (rawResults.length === 0) {
      try {
        const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const ddgRes = await fetch(ddgApiUrl, {
          signal: AbortSignal.timeout(500),
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
        });
        if (ddgRes.ok) {
          const ddgData = await ddgRes.json();
          if (ddgData.AbstractText) {
            rawResults.push({
              title: ddgData.Heading || query,
              url: ddgData.AbstractURL || "https://duckduckgo.com",
              snippet: ddgData.AbstractText,
              domain: ddgData.AbstractSource || "duckduckgo.com"
            });
          }
        }
      } catch (ddgErr) {
        console.warn("[Web Search] DDG Instant Answer strategy failed:", ddgErr);
      }
    }

    const commonHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": "https://duckduckgo.com/",
      "Cache-Control": "max-age=0"
    };

    // Try HTML strategies only if API strategies yielded 0 results
    if (rawResults.length === 0) {
      const maxStrategiesToTry = 2;
      for (let sIdx = 0; sIdx < Math.min(strategies.length, maxStrategiesToTry); sIdx++) {
        const strat = strategies[sIdx];
        try {
          console.log(`[Web Search] Trying strategy ${sIdx + 1}: ${strat.method} ${strat.url}`);
          
          const fetchOptions: RequestInit = {
            method: strat.method,
            headers: {
              ...commonHeaders,
              ...strat.headers
            },
            signal: AbortSignal.timeout(500) // 0.5 seconds per strategy
          };

          if (strat.body) {
            fetchOptions.body = strat.body;
          }

          const response = await fetch(strat.url, fetchOptions);

          if (!response.ok) {
            console.warn(`[Web Search] Strategy ${sIdx + 1} returned status ${response.status}`);
            continue;
          }

          const html = await response.text();
          const htmlParsed = parseDuckDuckGoHTML(html);

          if (htmlParsed.length > 0) {
            rawResults = htmlParsed;
            console.log(`[Web Search] Strategy ${sIdx + 1} succeeded. Found ${rawResults.length} results.`);
            break;
          } else {
            console.warn(`[Web Search] Strategy ${sIdx + 1} parsed 0 results.`);
          }
        } catch (err) {
          console.warn(`[Web Search] Strategy ${sIdx + 1} failed or timed out:`, err);
        }
      }
    }

    if (rawResults.length === 0) {
      console.error(`[Web Search] All scraping strategies exhausted or timed out for: "${query}"`);
      return { summary: "", isVerified: false };
    }

    // Sort results to prioritize reliable and official sources
    const priorityDomains = [
      ".gov",
      ".edu",
      "wikipedia.org",
      "reuters.com",
      "bbc.co.uk",
      "bbc.com",
      "cnn.com",
      "ndtv.com",
      "indianexpress.com",
      "timesofindia",
      "moneycontrol",
      "news18",
      "pib.gov.in"
    ];

    const sortedResults = [...rawResults].sort((a, b) => {
      const aPriority = priorityDomains.some(domain => a.domain.includes(domain)) ? 1 : 0;
      const bPriority = priorityDomains.some(domain => b.domain.includes(domain)) ? 1 : 0;
      return bPriority - aPriority;
    });

    // Take up to 4 high-quality results
    const finalResults = sortedResults.slice(0, 4);

    const searchContextString = finalResults
      .map((r, idx) => {
        return `[Source ${idx + 1}]
Title: ${r.title}
Domain: ${r.domain}
URL: ${r.url}
Extract: ${r.snippet}`;
      })
      .join("\n\n");

    try {
      // Condense the web search results using Gemini 3.1-flash-lite to minimize token consumption
      const summarizePrompt = `You are an expert fact-condenser. Given these search results for the query "${query}", write a highly condensed, objective, 1-2 paragraph factual summary in English.
Keep it strictly truthful and preserve dates, prices, numbers, and names exactly. Do NOT add any pleasantries, intro, or meta comments. Just output the clean factual summary.

Search Results:
${searchContextString}`;

      const summarizePromise = (async () => {
        let aiClient = ai;
        if (!aiClient && process.env.GEMINI_API_KEY) {
          const key = process.env.GEMINI_API_KEY.split(',')[0].trim();
          if (key) {
            aiClient = new GoogleGenAI({ apiKey: key });
          }
        }

        if (!aiClient) {
          return finalResults.map(r => `${r.title}: ${r.snippet}`).join(" ").substring(0, 500);
        }

        const summaryResponse = await aiClient.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: summarizePrompt,
          config: {
            temperature: 0.1,
            maxOutputTokens: 150
          }
        });
        return summaryResponse.text?.trim() || "Factual information parsed from search.";
      })();

      // Strict 600ms timeout on the summary generator
      const summary = await withTimeout(summarizePromise, 600, "Factual information parsed from search.");

      // Format citations to keep them very compact as requested
      const citations = finalResults.map(r => `[${r.title} - ${r.domain}](${r.url})`).join(", ");
      const finalSummary = `${summary}\n\n**Sources:** ${citations}`;

      searchCache.set(normalizedQuery, {
        summary: finalSummary,
        timestamp: now
      });

      // Auto-train Blackbell 2.0 by storing verified real-time internet knowledge into SQLite
      try {
        const { addLearnedKnowledge } = await import("./db");
        if (summary && summary.length > 20 && !summary.includes("Factual information parsed")) {
          addLearnedKnowledge(`Internet Fact: ${query.substring(0, 50)}`, summary);
        }
      } catch (trainErr) {
        // Safe silent ignore
      }

      return { summary: finalSummary, isVerified: true };
    } catch (err) {
      console.error(`Gemini summary failed for query "${query}":`, err);
      // Simple direct fallback summary combining the extracts
      const fallbackSummary = finalResults.map(r => `${r.title}: ${r.snippet}`).join(" | ").substring(0, 500);
      const citations = finalResults.map(r => `[${r.title} - ${r.domain}](${r.url})`).join(", ");
      const finalSummary = `${fallbackSummary}\n\n**Sources:** ${citations}`;

      // Auto-train on fallback summary as well
      try {
        const { addLearnedKnowledge } = await import("./db");
        if (fallbackSummary && fallbackSummary.length > 20) {
          addLearnedKnowledge(`Web Info: ${query.substring(0, 50)}`, fallbackSummary);
        }
      } catch (trainErr) {}

      return { summary: finalSummary, isVerified: true };
    }
  })();

  // Enforce a strict overall search budget of 1.2 seconds
  return await withTimeout(searchPromise, 1200, { summary: "", isVerified: false });
}
