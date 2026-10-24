import { addLearnedKnowledge, readDB } from "./db";
import { GoogleGenAI } from "@google/genai";

interface TrendingItem {
  title: string;
  description: string;
  source: string;
  link?: string;
  pubDate?: string;
}

/**
 * Strips HTML tags and entities from raw XML/HTML strings
 */
function cleanXmlText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gis, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses Google News RSS XML into structured items
 */
function parseGoogleNewsRss(xmlText: string, category: string): TrendingItem[] {
  const items: TrendingItem[] = [];
  const itemRegex = /<item>(.*?)<\/item>/gis;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemBlock = match[1];
    const titleMatch = itemBlock.match(/<title>(.*?)<\/title>/is);
    const descMatch = itemBlock.match(/<description>(.*?)<\/description>/is);
    const linkMatch = itemBlock.match(/<link>(.*?)<\/link>/is);
    const pubDateMatch = itemBlock.match(/<pubDate>(.*?)<\/pubDate>/is);

    const title = titleMatch ? cleanXmlText(titleMatch[1]) : "";
    const description = descMatch ? cleanXmlText(descMatch[1]) : "";
    const link = linkMatch ? cleanXmlText(linkMatch[1]) : "";
    const pubDate = pubDateMatch ? cleanXmlText(pubDateMatch[1]) : "";

    if (title && title.length > 5) {
      items.push({
        title,
        description: description || `Latest trending update regarding: ${title}`,
        source: `Google News (${category})`,
        link,
        pubDate
      });
    }
  }

  return items;
}

/**
 * Fetches latest trending topics from Google News RSS feeds and Wikipedia Current Events
 */
export async function fetchTrendingTopics(): Promise<TrendingItem[]> {
  const allTrending: TrendingItem[] = [];
  const feeds = [
    { url: "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en", category: "Top Stories" },
    { url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en", category: "Technology & AI" },
    { url: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-IN&gl=IN&ceid=IN:en", category: "Science & Space" }
  ];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        signal: AbortSignal.timeout(4000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (res.ok) {
        const xml = await res.text();
        const parsed = parseGoogleNewsRss(xml, feed.category);
        allTrending.push(...parsed.slice(0, 5)); // Take top 5 per feed
      }
    } catch (err) {
      console.warn(`[Trending Sync] Failed to fetch feed ${feed.category}:`, err);
    }
  }

  // Also query Wikipedia Current Events for notable world events
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=current+events+technology+breakthrough+2025+2026&utf8=&format=json&origin=*`;
    const wikiRes = await fetch(wikiUrl, {
      signal: AbortSignal.timeout(3000),
      headers: { "User-Agent": "Blackbell-AGI-TrendingSync/1.0" }
    });

    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData?.query?.search && Array.isArray(wikiData.query.search)) {
        wikiData.query.search.slice(0, 3).forEach((item: any) => {
          const cleanSnippet = cleanXmlText(item.snippet);
          if (cleanSnippet && cleanSnippet.length > 20) {
            allTrending.push({
              title: item.title,
              description: cleanSnippet,
              source: "Wikipedia Real-time Events"
            });
          }
        });
      }
    }
  } catch (wikiErr) {
    console.warn("[Trending Sync] Wikipedia fetch skipped:", wikiErr);
  }

  return allTrending;
}

let lastSyncTime = 0;
let syncInProgress = false;

/**
 * Syncs trending topics into SQLite knowledge table
 */
export async function syncTrendingKnowledgeToDB(): Promise<{ success: boolean; addedCount: number; timestamp: string }> {
  if (syncInProgress) {
    return { success: true, addedCount: 0, timestamp: new Date(lastSyncTime).toISOString() };
  }

  syncInProgress = true;
  let addedCount = 0;

  try {
    console.log("[Trending Sync] Starting scheduled trending topics sync...");
    const trendingItems = await fetchTrendingTopics();

    for (const item of trendingItems) {
      if (!item.title || item.title.length < 5) continue;
      
      const knowledgeTitle = `[Live Trend] ${item.title.substring(0, 70)}`;
      const knowledgeContent = `${item.description} (Source: ${item.source}${item.pubDate ? ` | Date: ${item.pubDate}` : ""})`;

      addLearnedKnowledge(knowledgeTitle, knowledgeContent);
      addedCount++;
    }

    lastSyncTime = Date.now();
    console.log(`[Trending Sync] Successfully synced ${addedCount} trending topics to SQLite knowledge table.`);
    return {
      success: true,
      addedCount,
      timestamp: new Date(lastSyncTime).toISOString()
    };
  } catch (err) {
    console.error("[Trending Sync] Error during trending knowledge sync:", err);
    return {
      success: false,
      addedCount,
      timestamp: new Date().toISOString()
    };
  } finally {
    syncInProgress = false;
  }
}

/**
 * Initializes the automated scheduled background sync process
 */
export function startScheduledTrendingJob(intervalMs = 60 * 60 * 1000): void {
  console.log(`[Trending Sync Scheduler] Initialized background worker. Frequency: every ${intervalMs / 60000} minutes.`);

  // Run initial sync after a short 10-second server warmup delay
  setTimeout(() => {
    syncTrendingKnowledgeToDB().catch(e => console.error("[Trending Sync] Initial run error:", e));
  }, 10000);

  // Set recurring interval
  setInterval(() => {
    syncTrendingKnowledgeToDB().catch(e => console.error("[Trending Sync] Scheduled interval error:", e));
  }, intervalMs);
}
