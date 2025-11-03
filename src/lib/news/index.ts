// src/lib/news/index.ts
import Parser from 'rss-parser';
import { config } from '../config';
import type { NewsItem, Cluster, BreakingDecision } from '../types';
import OpenAI from 'openai';

const parser = new Parser();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  console.error(`[news] ${ctx}`, (err as Error)?.message ?? err);
}

// Simple stop-words
const STOP = new Set([
  'the','a','an','of','and','or','to','in','on','for','with','as','by','from','at','over','after','amid',
  'new','latest','update','breaking','this','that','is','are','was','were','will','could','may','might',
  'how','why','what','when','where','who','into','about','between','across','under','vs','vs.'
]);

function extractKeywords(titles: string[], max = 15): string[] {
  const freq = new Map<string, number>();
  for (const t of titles) {
    const words = t.toLowerCase()
      .replace(/["""''`()]/g, '')
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
  return Math.max(0.2, Math.min(1, 1 - Math.max(0, hours) / 48));
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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
          publishedAt: i.isoDate || i.pubDate || undefined,
          category: 'world' as const,
        };
      })
      .filter(i => i.title && i.url);
    return items as NewsItem[];
  } catch (err) {
    logErr(`Failed feed ${url}`, err);
    return [];
  }
}

// ---------- Embeddings ----------
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  } catch (err) {
    logErr('Embeddings API error', err);
    return [];
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
  return dedupeByUrl(batches.flat());
}

/** Hybrid clustering: keyword-based first pass, then embeddings refinement */
export async function rankAndCluster(items: NewsItem[]): Promise<Cluster[]> {
  if (!items.length) return [];

  console.log(`[clustering] Processing ${items.length} items`);

  // Step 1: Keyword-based clustering (fast, cheap)
  const keywords = extractKeywords(items.map(i => i.title), 15);
  console.log(`[clustering] Extracted ${keywords.length} keywords:`, keywords);

  if (!keywords.length) {
    return [{
      id: `world:misc`,
      kind: 'world',
      title: 'misc',
      items,
      score: items.length
    }];
  }

  // Initial keyword buckets
  const buckets = new Map<string, NewsItem[]>();
  for (const k of keywords) buckets.set(k, []);
  
  for (const it of items) {
    const t = it.title.toLowerCase();
    const hit = keywords.find(k => t.includes(k));
    buckets.get(hit || keywords[0])!.push(it);
  }

  // Step 2: Embeddings-based refinement (semantic grouping)
  try {
    const titles = items.map(i => i.title);
    const embeddings = await getEmbeddings(titles);
    
    if (embeddings.length === items.length) {
      console.log('[clustering] Got embeddings, merging similar clusters');
      
      // Attach embeddings to items
      items.forEach((item, i) => {
        (item as any).embedding = embeddings[i];
      });

      // Merge clusters that are semantically similar (cosine similarity > 0.75)
      const mergedBuckets = new Map<string, NewsItem[]>();
      const processed = new Set<string>();

      for (const [key1, items1] of buckets.entries()) {
        if (processed.has(key1) || !items1.length) continue;
        
        const merged = [...items1];
        processed.add(key1);

        // Calculate centroid for this cluster
        const centroid = new Array((items1[0] as any).embedding.length).fill(0);
        items1.forEach(item => {
          const emb = (item as any).embedding;
          emb.forEach((val: number, i: number) => centroid[i] += val);
        });
        centroid.forEach((_, i) => centroid[i] /= items1.length);

        // Check similarity with other clusters
        for (const [key2, items2] of buckets.entries()) {
          if (processed.has(key2) || key1 === key2 || !items2.length) continue;
          
          // Calculate centroid for second cluster
          const centroid2 = new Array((items2[0] as any).embedding.length).fill(0);
          items2.forEach(item => {
            const emb = (item as any).embedding;
            emb.forEach((val: number, i: number) => centroid2[i] += val);
          });
          centroid2.forEach((_, i) => centroid2[i] /= items2.length);

          const similarity = cosineSimilarity(centroid, centroid2);
          
          if (similarity > 0.75) {
            console.log(`[clustering] Merging "${key1}" + "${key2}" (similarity: ${similarity.toFixed(2)})`);
            merged.push(...items2);
            processed.add(key2);
          }
        }

        mergedBuckets.set(key1, merged);
      }

      // Use merged buckets
      buckets.clear();
      mergedBuckets.forEach((items, key) => buckets.set(key, items));
    }
  } catch (err) {
    console.warn('[clustering] Embeddings failed, using keyword-only clustering:', err);
  }

  // Step 3: Score and sort clusters
  const clusters: Cluster[] = [];
  for (const [key, members] of buckets.entries()) {
    if (!members.length) continue;
    const uniqueSources = new Set(members.map(m => m.source || ''));
    const recAvg = members.reduce((s, m) => s + recencyScore(m.publishedAt), 0) / members.length;
    const score = members.length * 2 + uniqueSources.size * 1.5 + recAvg;

    clusters.push({
      id: `world:${key}`,
      kind: 'world',
      title: key,
      items: members,
      score
    } as Cluster);
  }

  const sorted = clusters.sort((a, b) => (b.score || 0) - (a.score || 0));
  console.log(`[clustering] Created ${sorted.length} clusters, top 3:`, 
    sorted.slice(0, 3).map(c => `"${c.title}" (${c.items.length} items, score: ${c.score?.toFixed(1)})`));
  
  return sorted;
}

/** Decide which clusters are "breaking" by coverage/recency. */
export function detectBreaking(clusters: Cluster[]): BreakingDecision[] {
  const out: BreakingDecision[] = [];
  const { minItems, minSources, recencyBoost } = config.breakingRules.world;
  
  for (const c of clusters) {
    const sources = new Set(c.items.map(i => i.source || ''));
    const maxRecency = Math.max(...c.items.map(i => recencyScore(i.publishedAt)));
    
    const isBreaking = 
      (c.items.length >= minItems && sources.size >= minSources) || 
      (maxRecency >= recencyBoost && c.items.length >= 2);
    
    if (isBreaking) {
      console.log(`[breaking] Detected: "${c.title}" - ${c.items.length} items from ${sources.size} sources (recency: ${maxRecency.toFixed(2)})`);
      out.push({
        kind: 'world',
        clusterId: c.id,
        rationale: `size=${c.items.length}, sources=${sources.size}, recentBoost=${maxRecency.toFixed(2)}`,
        sources: c.items.slice(0, 5).map(i => i.url)
      });
    }
  }
  
  return out;
}

// Simple in-memory cache for headline comparison
let lastSeenHeadlines: Set<string> = new Set();

/** Lightweight check: compare headlines to detect if news has changed significantly */
export function hasSignificantNewsChange(items: NewsItem[]): boolean {
  const currentHeadlines = new Set(items.map(i => i.title));
  
  if (lastSeenHeadlines.size === 0) {
    lastSeenHeadlines = currentHeadlines;
    return false;
  }
  
  const overlap = [...currentHeadlines].filter(h => lastSeenHeadlines.has(h)).length;
  const changeRatio = 1 - (overlap / Math.max(currentHeadlines.size, 1));
  
  console.log(`[headlines] Change ratio: ${(changeRatio * 100).toFixed(1)}% (threshold: ${(config.headlineChangeThreshold * 100)}%)`);
  
  lastSeenHeadlines = currentHeadlines;
  
  // Significant if >20% of headlines are new (lowered threshold)
  return changeRatio > config.headlineChangeThreshold;
}