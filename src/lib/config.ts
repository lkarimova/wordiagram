import { getEnv } from './env';

export const config = (() => {
  const env = getEnv();
  return {
    timezone: env.TIMEZONE || 'America/New_York',
    cron: {
      dailyHourLocal: 6,
      scanEveryHours: 4,
    },
    aspect: { width: 1536, height: 2304 },
    news: {
      worldSources: (env.NEWS_SOURCES_WORLD || '').split(',').map(s => s.trim()).filter(Boolean),
      artSources: (env.NEWS_SOURCES_ART || '').split(',').map(s => s.trim()).filter(Boolean),
      cacheMinutes: 20,
    },
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
    style: {
      restyleInterpolation: { previous: 0.4, news: 0.6 },
    },
    storage: {
      // Using Vercel Blob public buckets by default
      publicPrefix: 'world-news-painting',
    },
    mock: {
      news: (env.MOCK_NEWS || 'true') === 'true',
      images: (env.MOCK_IMAGES || 'true') === 'true',
    },
  } as const;
})();

export type AppConfig = typeof config;
