import { z } from 'zod';

export const EnvSchema = z.object({
  NEWS_SOURCES_WORLD: z.string().optional().default('https://www.reuters.com/world/rss,https://www.bbc.com/news/world/rss.xml,https://www.aljazeera.com/xml/rss/all.xml,https://www.un.org/rss.xml,https://www.who.int/feeds/entity/csr/don/en/rss.xml'),
  NEWS_SOURCES_ART: z.string().optional().default('https://www.theartnewspaper.com/rss,https://news.artnet.com/feed,https://www.artnews.com/c/art-news/news/feed/'),
  OPENAI_API_KEY: z.string().optional(),
  STABILITY_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  BASIC_AUTH_USER: z.string().optional(),
  BASIC_AUTH_PASS: z.string().optional(),
  TIMEZONE: z.string().optional().default('America/New_York'),
  MOCK_NEWS: z.string().optional().default('true'),
  MOCK_IMAGES: z.string().optional().default('true'),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Do not throw in production: allow partial env for mock mode
    console.warn('Environment validation warnings:', parsed.error.flatten());
    // Fallback to defaults where possible
    return EnvSchema.parse({});
  }
  return parsed.data as Env;
}
