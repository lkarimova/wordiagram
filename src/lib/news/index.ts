// src/lib/news/index.ts
import Parser from 'rss-parser';
import { config } from '../config';
import type { NewsItem, Cluster, BreakingDecision } from '../types';

const parser = new Parser();

// ---------- helpers ----------
function safeUrl(s: string): URL | null {
  try { return new URL(s); } catch { return null; }
}

function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    if (!it.url || seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
  }
  return out;
}

function logErr(ctx: string, err: unknown) {
  // keep logs terse in prod; useful in /api/generate logs
  console.error(`[news] ${ctx}`, (err as Error)?.message ?? err);
}

// Simple stop-words
const STOP = new Set([
  'the','a','an','of','and','or','to','in','on','for','with','as','by','from','at','over','after','amid',
  'new','latest','update','breaking','this','that','is','are','was','were','will','could','may','might',
  'how','why','what','when','where','who','into','about','between','across','under','vs','vs.'
]);

function extractKeywords(titles: string[], max = 8): string[] {
  const freq = new Map<string, number>();
  for (const t of titles) {
    const words = t.toLowerCase()
      .replace(/[“”"’'`()]/g, '')
      .replace(/[^a-z0-9\- ]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (STOP.has(w) || w.length < 3) continue;
      // boost hyphenated compounds and bigrams
      const bigram = i < words.length - 1 ? `${w} ${words[i+1]}` : null;
      if (bigram && !STOP.has(words[i+1]) && words[i+1].length >= 3) {
        freq.set(bigram, (freq.get(bigram) || 0) + 2);
      }
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

function recencyScore(iso?: string): number {
  if (!iso) return 0.5;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0.5;
  const hours = (Date.now() - t) / 36e5;
  // 0–24h maps to 1 → 0.5; older tails off
  return Math.max(0.2, Math.min(1, 1 - Math.max(0, hours) / 48));
}

// ---------- RSS fetch ----------
async function fetchRss(url: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url);
    const host = safeUrl(url)?.hostname || 'unknown';
    const items = (feed.items || [])
      .map((i) => {
        const link = (i.link || i.guid || '').toString();
        return {
          title: (i.title || '').toString().trim(),
          url: link,
          source: host,
          publishedAt: i.isoDate || i.pubDate || undefined
        };
      })
      .filter(i => i.title && i.url);
    return items as NewsItem[];
  } catch (err) {
    logErr(`Failed feed ${url}`, err);
    return []; // no placeholders
  }
}

// ---------- Public API ----------
export async function fetchWorldNews(): Promise<NewsItem[]> {
  if (config.mock.news) {
    return [
      { title: 'Global climate summit sees urgent pledges', url: 'https://example.com/a', source: 'mock', publishedAt: new Date().toISOString(), category: 'world' },
      { title: 'Markets react to multi-region policy shift', url: 'https://example.com/b', source: 'mock', publishedAt: new Date().toISOString(), category: 'world' },
    ];
  }
  const feeds = config.news.worldSources || [];
  if (!feeds.length) {
    console.warn('[news] No worldSources configured');
    return [];
  }
  const batches = await Promise.all(feeds.map(fetchRss));
  return dedupeByUrl(batches.flat().map(i => ({ ...i, category: 'world' as const })));
}

export async function fetchArtNews(): Promise<NewsItem[]> {
  if (config.mock.news) {
    return [
      { title: 'Major museum announces landmark retrospective', url: 'https://example.com/c', source: 'mock', publishedAt: new Date().toISOString(), category: 'art' },
      { title: 'Record-setting auction drives palette discourse', url: 'https://example.com/d', source: 'mock', publishedAt: new Date().toISOString(), category: 'art' },
    ];
  }
  const feeds = config.news.artSources || [];
  if (!feeds.length) {
    console.warn('[news] No artSources configured');
    return [];
  }
  const batches = await Promise.all(feeds.map(fetchRss));
  return dedupeByUrl(batches.flat().map(i => ({ ...i, category: 'art' as const })));
}

/** Keyword-based clustering with simple scoring (size + recency + source diversity). */
export function rankAndCluster(items: NewsItem[], defaultKind: 'world'|'art' = 'world'): Cluster[] {
  if (!items.length) return [];
  const keywords = extractKeywords(items.map(i => i.title), 10);
  if (!keywords.length) {
    return [{
      id: `${defaultKind}:misc`,
      kind: defaultKind,
      title: 'misc',
      items,
      score: items.length
    }];
  }

  const buckets = new Map<string, NewsItem[]>();
  for (const k of keywords) buckets.set(k, []);
  for (const it of items) {
    const t = it.title.toLowerCase();
    const hit = keywords.find(k => t.includes(k));
    buckets.get(hit || keywords[0])!.push(it);
  }

  const clusters: Cluster[] = [];
  for (const [key, members] of buckets.entries()) {
    if (!members.length) continue;
    const kind = (members[0].category || defaultKind) as 'world'|'art';
    const uniqueSources = new Set(members.map(m => m.source || ''));
    const recAvg = members.reduce((s, m) => s + recencyScore(m.publishedAt), 0) / members.length;
    const score = members.length + uniqueSources.size * 0.75 + recAvg; // tweak as wanted

    clusters.push({
      id: `${kind}:${key}`,
      kind,
      title: key,       // concise keyword/phrase label
      items: members,
      score
    } as Cluster);
  }

  return clusters.sort((a, b) => (b.score || 0) - (a.score || 0));
}

/** Decide which clusters are “breaking” by coverage/recency. */
export function detectBreaking(prev: Cluster[] | undefined, clusters: Cluster[], kind: 'world'|'art'): BreakingDecision[] {
  const out: BreakingDecision[] = [];
  const relevant = clusters.filter(c => c.kind === kind);
  for (const c of relevant) {
    const sources = new Set(c.items.map(i => i.source || ''));
    const recentBoost = Math.max(...c.items.map(i => recencyScore(i.publishedAt)));
    // thresholds: >= 3 items from >= 2 sources, or very recent & >= 2 items
    if ((c.items.length >= (kind === 'world' ? 3 : 2) && sources.size >= 2) || (recentBoost >= 0.9 && c.items.length >= 2)) {
      out.push({
        kind,
        clusterId: c.id,
        rationale: `size=${c.items.length}, sources=${sources.size}, recentBoost=${recentBoost.toFixed(2)}`,
        sources: c.items.slice(0, 5).map(i => i.url)
      });
    }
  }
  return out;
}
