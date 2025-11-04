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
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

function computeCentroid(vectors: number[][]): number[] {
  if (!vectors.length) return [];
  const dim = vectors[0].length;
  const centroid = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += v[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    centroid[i] /= vectors.length;
  }
  return centroid;
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
async function getEmbeddings(texts: string[]): Promise<number[][] | null> {
  if (!texts.length) return [];
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map(d => d.embedding);
  } catch (err) {
    logErr('Embeddings API error', err);
    return null;
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

/**
 * Purely semantic clustering based on embeddings + cosine similarity.
 * Greedy algorithm:
 *  - Compute embedding per headline
 *  - For each item, assign to the most similar existing cluster if similarity >= threshold
 *  - Otherwise, start a new cluster
 */
export async function rankAndCluster(items: NewsItem[]): Promise<Cluster[]> {
  if (!items.length) return [];

  console.log(`[clustering] Processing ${items.length} items`);

  // Step 1: Embeddings
  const titles = items.map(i => i.title);
  const embeddings = await getEmbeddings(titles);

  if (!embeddings || embeddings.length !== items.length) {
    console.warn('[clustering] Embeddings unavailable or mismatched; returning single misc cluster');
    return [{
      id: 'world:misc',
      kind: 'world',
      title: 'misc',
      items,
      score: items.length
    }];
  }

  type NewsItemWithEmbedding = NewsItem & { embedding: number[] };

  const itemsWithEmbeddings: NewsItemWithEmbedding[] = items.map((item, idx) => ({
    ...item,
    embedding: embeddings[idx],
  }));

  // Step 2: Greedy semantic clustering
  const similarityThreshold = 0.75; // tune as needed

  type InternalCluster = {
    centroid: number[];
    items: NewsItemWithEmbedding[];
  };

  const internalClusters: InternalCluster[] = [];

  for (const item of itemsWithEmbeddings) {
    const emb = item.embedding;
    if (!internalClusters.length) {
      internalClusters.push({
        centroid: emb.slice(),
        items: [item],
      });
      continue;
    }

    let bestSim = -1;
    let bestIndex = -1;

    for (let i = 0; i < internalClusters.length; i++) {
      const sim = cosineSimilarity(emb, internalClusters[i].centroid);
      if (sim > bestSim) {
        bestSim = sim;
        bestIndex = i;
      }
    }

    if (bestSim >= similarityThreshold && bestIndex >= 0) {
      const cluster = internalClusters[bestIndex];
      cluster.items.push(item);

      // Incremental centroid update
      const n = cluster.items.length;
      const c = cluster.centroid;
      for (let d = 0; d < c.length; d++) {
        c[d] = c[d] + (emb[d] - c[d]) / n;
      }
    } else {
      internalClusters.push({
        centroid: emb.slice(),
        items: [item],
      });
    }
  }

  // Step 3: Convert to public Cluster[] and score them
  const clusters: Cluster[] = internalClusters
    .filter(c => c.items.length > 0)
    .map((c, idx) => {
      const members = c.items;
      const uniqueSources = new Set(members.map(m => m.source || ''));
      const recAvg = members.reduce((s, m) => s + recencyScore(m.publishedAt), 0) / members.length;
      const score = members.length * 2 + uniqueSources.size * 1.5 + recAvg;

      // Pick representative title: item whose embedding is closest to cluster centroid
      let repTitle = members[0].title;
      let bestSim = -1;
      for (const m of members) {
        const sim = cosineSimilarity(m.embedding, c.centroid);
        if (sim > bestSim) {
          bestSim = sim;
          repTitle = m.title;
        }
      }

      return {
        id: `world:${idx}`,
        kind: 'world',
        title: repTitle,
        items: members, // extra embedding field is fine structurally
        score,
      } as Cluster;
    });

  const sorted = clusters.sort((a, b) => (b.score || 0) - (a.score || 0));
  console.log(
    `[clustering] Created ${sorted.length} semantic clusters, top 3:`,
    sorted
      .slice(0, 3)
      .map(c => `"${c.title}" (${c.items.length} items, score: ${c.score?.toFixed(1)})`)
  );

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
      console.log(
        `[breaking] Detected: "${c.title}" - ${c.items.length} items from ${sources.size} sources (recency: ${maxRecency.toFixed(2)})`
      );
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

/** 
 * Lightweight check: compare headlines to detect if news has changed significantly
 * Compares against headlines from the LAST GENERATED IMAGE, not just last check
 */
export function hasSignificantNewsChange(
  currentItems: NewsItem[], 
  lastImageHeadlines: string[] | null
): boolean {
  const currentHeadlines = currentItems.map(i => i.title);
  
  // If no previous image headlines, consider it significant (first image)
  if (!lastImageHeadlines || lastImageHeadlines.length === 0) {
    console.log(`[headlines] No previous image headlines, considering significant`);
    return true;
  }
  
  const lastSet = new Set(lastImageHeadlines);
  const overlap = currentHeadlines.filter(h => lastSet.has(h)).length;
  const changeRatio = 1 - (overlap / Math.max(currentHeadlines.length, 1));
  
  console.log(
    `[headlines] Change ratio: ${(changeRatio * 100).toFixed(1)}% (threshold: ${(config.headlineChangeThreshold * 100)}%) - comparing to last image`
  );
  
  // Significant if > threshold of headlines are new compared to last image
  return changeRatio > config.headlineChangeThreshold;
}