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

  // 20 world news feeds (free)
  const WORLD_FALLBACK = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    "https://rss.cnn.com/rss/edition_world.rss",
    "https://www.theguardian.com/world/rss",
    "https://feeds.npr.org/1004/rss.xml",
    "https://feeds.reuters.com/reuters/worldNews",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://rss.dw.com/rdf/rss-en-all",
    "https://www.france24.com/en/rss",
    "https://www.ft.com/world?format=rss",
    "https://feeds.skynews.com/feeds/rss/world.xml",
    "https://www.cbc.ca/cmlink/rss-world",
    "https://www.latimes.com/world/rss2.0.xml",
    "https://www.economist.com/sections/international/rss.xml",
    "https://www.rfi.fr/en/rss",
    "https://globalnews.ca/world/feed/",
    "https://www.scmp.com/rss/91/feed",
    "https://www.japantimes.co.jp/news/world/feed/",
    "https://english.kyodonews.net/rss/news.xml",
    "https://www.abc.net.au/news/feed/51120/rss.xml",
  ];

  return {
    timezone: env.TIMEZONE || "America/New_York",
    cron: {
      dailyHourLocal: 6, // 6:00 AM ET
      breakingCheckMinutes: 15, // Check every 15 minutes for breaking news
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
      cacheMinutes: 15, // Cache news for 15 minutes
    },

    // Breaking news detection thresholds
    breakingRules: {
      world: {
        minItems: 3,        // At least 3 items in cluster
        minSources: 2,      // From at least 2 different sources
        recencyBoost: 0.9,  // OR very recent (within ~1 hour) with 2+ items
      },
    },

    // Fixed style prompt (no art news influence)
    style: {
      prompt: "Contemporary oil painting with vibrant, saturated colors and bold impasto brushwork. Modern editorial illustration style with rich jewel tones and dynamic color relationships. Museum-quality presentation with ornate frame.",
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