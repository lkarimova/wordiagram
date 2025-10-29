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

  // Allowed sizes for gpt-image-1 portrait include 1024x1536 (2:3).
  // If you want higher res later, we can upscale post-generation.
  const aspect: Aspect = { width: 1024, height: 1536 };

  // 20 world feeds (free) + 10 art feeds (free).
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

  const ART_FALLBACK = [
    "https://www.artnews.com/c/art-news/news/feed/",
    "https://www.artforum.com/rss.xml",
    "https://www.theartnewspaper.com/rss.xml",
    "https://news.artnet.com/feed",
    "https://hyperallergic.com/feed/",
    "https://www.frieze.com/rss.xml",
    "https://www.apollo-magazine.com/feed/",
    "https://artreview.com/feed/",
    "https://www.thisiscolossal.com/feed/",
    "https://www.artsy.net/rss?channel=articles",
  ];

  return {
    timezone: env.TIMEZONE || "America/New_York",
    cron: {
      dailyHourLocal: 6,
      scanEveryHours: 4,
    },
    // IMPORTANT: keep portrait 2:3 to match your <Frame> and gpt-image-1 allowed size
    aspect,

    news: {
      // You can override via env: NEWS_SOURCES_WORLD / NEWS_SOURCES_ART (comma-separated)
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
      artSources:
        csv("NEWS_SOURCES_ART", []).length > 0
          ? csv("NEWS_SOURCES_ART", [])
          : (env.NEWS_SOURCES_ART || "")
              .split(",")
              .map(s => s.trim())
              .filter(Boolean).length > 0
          ? (env.NEWS_SOURCES_ART || "")
              .split(",")
              .map(s => s.trim())
              .filter(Boolean)
          : ART_FALLBACK,
      cacheMinutes: 20,
    },

    // Keep your thresholds; the clustering code will supply sizes/recency/sources.
    breakingRules: {
      world: {
        minTier1Agree: 3,
        windowHours: 2,
        minRegions: 3,
      },
      art: {
        minAgree: 2,
      },
    },

    // Preserve your interpolation ratio
    style: {
      restyleInterpolation: { previous: 0.4, news: 0.6 },
    },

    // You’ve switched to Supabase Storage for images, but publicPrefix can remain
    storage: {
      publicPrefix: "world-news-painting",
    },

    // Keep mock toggles, but default them to false unless env explicitly sets true
    mock: {
      news: (env.MOCK_NEWS || "false") === "true",
      images: (env.MOCK_IMAGES || "false") === "true",
    },
  } as const;
})();

export type AppConfig = typeof config;
