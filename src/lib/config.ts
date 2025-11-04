// src/lib/config.ts
import { getEnv } from "./env";

type Aspect = { width: number; height: number };

function csv(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export const config = (() => {
  const env = getEnv();

  // 2:3 portrait for gpt-image-1
  const aspect: Aspect = { width: 1024, height: 1536 };

  // 30 diverse world news feeds (global coverage, varied perspectives)
  const WORLD_FALLBACK = [
    // North America
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://rss.cnn.com/rss/edition_world.rss",
    "https://www.theguardian.com/world/rss",
    "https://feeds.npr.org/1004/rss.xml",
    "https://www.cbc.ca/cmlink/rss-world",
    "https://www.latimes.com/world/rss2.0.xml",
    "https://globalnews.ca/world/feed/",
    
    // Europe
    "https://feeds.reuters.com/reuters/worldNews",
    "https://rss.dw.com/rdf/rss-en-all",
    "https://www.france24.com/en/rss",
    "https://www.ft.com/world?format=rss",
    "https://feeds.skynews.com/feeds/rss/world.xml",
    "https://www.rfi.fr/en/rss",
    "https://www.economist.com/sections/international/rss.xml",
    
    // Middle East & Africa
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://english.alarabiya.net/rss.xml",
    
    // Asia-Pacific
    "https://www.scmp.com/rss/91/feed",
    "https://www.japantimes.co.jp/news/world/feed/",
    "https://english.kyodonews.net/rss/news.xml",
    "https://www.abc.net.au/news/feed/51120/rss.xml",
    "https://www.straitstimes.com/news/world/rss.xml",
    "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms",
    
    // Latin America
    "https://rss.uol.com.br/feed/noticias.xml",
    
    // International Organizations
    "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    
    // Diverse Perspectives
    "https://www.neweurope.eu/feed/",
    "https://www.globalissues.org/news/feed",
    "https://www.csmonitor.com/layout/set/rss/World",
    "https://www.pbs.org/newshour/feeds/rss/world",
    "https://apnews.com/hub/world-news?format=rss",
  ];

  return {
    timezone: env.TIMEZONE || "America/New_York",
    cron: {
      dailyHourLocal: 6, // 6:00 AM ET
      breakingCheckMinutes: 30, // Check every 30 minutes for breaking news
    },
    aspect,

    news: {
      worldSources:
        csv("NEWS_SOURCES_WORLD", []).length > 0
          ? csv("NEWS_SOURCES_WORLD", [])
          : (env.NEWS_SOURCES_WORLD || "")
              .split(",")
              .map(s => s.trim())
              .filter(Boolean).length > 0
          ? (env.NEWS_SOURCES_WORLD || "")
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
          : WORLD_FALLBACK,
      cacheMinutes: 30, // Cache news for 30 minutes
    },

    // Breaking news detection thresholds (LOWERED)
    breakingRules: {
      world: {
        minItems: 5,        // At least 5 items in cluster
        minSources: 3,      // From at least 3 different sources
        recencyBoost: 0.95,  // OR very recent (within ~1 hour) with 3+ items
      },
    },

    // Headline change threshold
    headlineChangeThreshold: 0.5, // 50% change triggers clustering check (was 0.3)

    // Fixed style prompt (symbolic, balanced colors, no recognizable people/flags)
    style: {
      prompt: "Symbolic oil painting with dreamlike, mythological imagery. Use two dominant colors (varied each time - choose from warm tones, cool tones, earth tones, or jewel tones) balanced with a full spectrum of supporting hues. Soft, diffused lighting with gentle contrast. Rich impasto texture. Draw inspiration from surrealist dreams, mythology, folklore, fantasy literature, and cinematic symbolism. Favor poetic symbolism: objects, colors, animals, settings, and/or characters, derived from the news themes; atmospheric effects. Do not rely repeatedly on the same visual clichés. Seek fresh symbolic combinations instead. CRITICAL: Absolutely no recognizable people, no real country flags (invented abstract flags are acceptable), no literal war imagery (guns, tanks, arrows), no skulls, no earth globes. Museum-quality presentation with ornate frame.",
    },

    storage: {
      publicPrefix: "world-news-painting",
    },

    mock: {
      news: (env.MOCK_NEWS || "false") === "true",
      images: (env.MOCK_IMAGES || "false") === "true",
    },
  } as const;
})();

export type AppConfig = typeof config;