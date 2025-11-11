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
      dailyHourLocal: 6,         // 6:00 AM ET
      breakingCheckMinutes: 120,  // Check every 120 minutes for breaking news
    },
    aspect,

    news: {
      worldSources: WORLD_FALLBACK,
      cacheMinutes: 120, // Cache news for 120 minutes
    },

    // Breaking news detection thresholds
    breakingRules: {
      world: {
        minItems: 7,        // At least 7 items in cluster
        minSources: 5,      // From at least 5 different sources
        recencyBoost: 0.95, // OR very recent with 7+ items
        minBreakingClusters: 4, // NEW: require at least 4 breaking clusters overall
      },
    },

    // Headline change threshold
    headlineChangeThreshold: 0.80, // 80% change triggers clustering check

    storage: {
      publicPrefix: "world-news-painting",
    },

    mock: {
      news: env.MOCK_NEWS === "true",
      images: env.MOCK_IMAGES === "true",
    },
  } as const;
})();

export type AppConfig = typeof config;
