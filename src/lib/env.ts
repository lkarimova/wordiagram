import { z } from 'zod';

export const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  STABILITY_API_KEY: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  BASIC_AUTH_USER: z.string().optional(),
  BASIC_AUTH_PASS: z.string().optional(),
  TIMEZONE: z.string().optional().default('America/New_York'),
  MOCK_NEWS: z.string().optional().default('false'),
  MOCK_IMAGES: z.string().optional().default('false'),
  PAUSE_GENERATIONS: z.string().optional().default('false'),
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
