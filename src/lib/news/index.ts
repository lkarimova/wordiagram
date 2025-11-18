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

// Heuristic: turn a full news headline into a short "event phrase"
// e.g. "Peru cuts diplomatic ties with Mexico over ex-PM's asylum claim"
//   -> "Peru cuts diplomatic ties"
//      "Five climbers and two guides killed in Nepal avalanche, say officials"
//   -> "climbers and two guides killed"
function extractEventPhrase(headline: string): string {
  if (!headline) return "";

  let t = headline.trim();

  // 1) Remove trailing attribution like ", says X", ", say officials", "according to ..."
  t = t.replace(
    /,?\s*(says?|said|say|according to|report(?:s|ed)?|officials say).*$/i,
    ""
  );

  // 2) Cut at question/exclamation if present
  t = t.split(/[?!]/)[0];

  // 3) Cut at colon or spaced dash/em dash to keep first clause
  //    (don't split on hyphens inside words like "ex-top")
  t = t.split(/:|\s[–—-]\s/)[0].trim();

  // 4) Remove leading quantifier phrases ("At least", "More than", etc.)
  t = t.replace(/^(at least|more than|over|about|around)\s+/i, "");

  // 5) Remove leading pure number ("5 killed..." -> "killed...")
  t = t.replace(/^\d+\s+/, "");

  // 6) Split into words for further trimming
  let words = t.split(/\s+/).filter(Boolean);

  // Remove leading count words like "Five", "Dozens", "Hundreds"
  const leadingCounts = new Set([
    "one","two","three","four","five","six","seven","eight","nine","ten",
    "dozens","scores","hundreds","thousands"
  ]);
  if (words.length && leadingCounts.has(words[0].toLowerCase())) {
    words = words.slice(1);
  }

  // 7) Truncate at certain prepositions once we have a minimal phrase
  //    This tends to give "Peru cuts diplomatic ties" instead of
  //    "Peru cuts diplomatic ties with Mexico over ..."
  const stopWords = new Set([
    "with","over","after","amid","as","while","during","because","following",
    "from","against","in"
  ]);

  let cutIdx: number | null = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    if (stopWords.has(w) && i >= 3) {
      cutIdx = i;
      break;
    }
  }
  if (cutIdx !== null) {
    words = words.slice(0, cutIdx);
  }

  // 8) Drop some common adverbs that clutter the phrase
  const drop = new Set(["partially","reportedly","allegedly"]);
  words = words.filter(w => !drop.has(w.toLowerCase()));

  // 9) Limit to at most 8 words
  if (words.length > 8) {
    return words.slice(0, 8).join(" ") + "…";
  }

  return words.join(" ");
}

// ---------- Earthquake helpers ----------

// Extract magnitude from titles like "M 1.3 - 6 km ESE of Valle Vista, CA"
function extractQuakeMagnitude(title: string): number | null {
  const t = (title || "").trim();
  // Match things like "M 1.3", "M2.6", "M 4.8"
  const match = t.match(/\bM\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;
  const mag = parseFloat(match[1]);
  return Number.isFinite(mag) ? mag : null;
}

/**
 * Normalize a cluster title:
 * - If most member titles look like earthquake magnitudes, rename to "Earthquake M#.##"
 * - Otherwise, return the raw title (already processed by extractEventPhrase).
 */
function normalizeClusterTitle(rawTitle: string, memberTitles: string[]): string {
  const titles = memberTitles.map(t => (t || "").trim()).filter(Boolean);
  if (!titles.length) return (rawTitle || "misc").trim();

  const quakeMagnitudes: number[] = [];
  for (const t of titles) {
    const mag = extractQuakeMagnitude(t);
    if (mag !== null) quakeMagnitudes.push(mag);
  }

  // If the majority of titles are quake-style, treat this as an earthquake cluster
  if (quakeMagnitudes.length > 0 && quakeMagnitudes.length >= titles.length * 0.6) {
    const maxMag = Math.max(...quakeMagnitudes);
    const magStr = maxMag.toFixed(1).replace(/\.0$/, ""); // 5.0 -> "5", 5.3 -> "5.3"
    return `Earthquake M ${magStr}`;
  }

  // Default: keep the event phrase / raw title
  return (rawTitle || "misc").trim();
}

// ---------- Cluster overlap helpers ----------

type ClusterWithCentroid = Cluster & { _centroid?: number[] };

// Build or reuse a centroid for a cluster from its member embeddings
function buildClusterCentroid(c: ClusterWithCentroid): number[] | null {
  if (c._centroid && c._centroid.length) return c._centroid;

  const items = (c.items as any[]) || [];
  const firstWithEmb = items.find(i => Array.isArray(i?.embedding));
  if (!firstWithEmb) return null;

  const dim = firstWithEmb.embedding.length;
  const sum = new Array(dim).fill(0);
  let n = 0;

  for (const it of items) {
    const emb = it.embedding;
    if (!Array.isArray(emb) || emb.length !== dim) continue;
    for (let i = 0; i < dim; i++) sum[i] += emb[i];
    n++;
  }

  if (!n) return null;

  const centroid = sum.map(v => v / n);
  c._centroid = centroid;
  return centroid;
}

function clusterCentroidSim(a: ClusterWithCentroid, b: ClusterWithCentroid): number {
  const ca = buildClusterCentroid(a);
  const cb = buildClusterCentroid(b);
  if (!ca || !cb || !ca.length || !cb.length) return 0;
  return cosineSimilarity(ca, cb);
}

function jaccardByUrl(a: Cluster, b: Cluster): number {
  const A = new Set(a.items.map(i => i.url).filter(Boolean));
  const B = new Set(b.items.map(i => i.url).filter(Boolean));
  if (!A.size && !B.size) return 0;

  let inter = 0;
  for (const u of A) if (B.has(u)) inter++;

  const unionSize = A.size + B.size - inter;
  return unionSize === 0 ? 0 : inter / unionSize;
}

/**
 * Remove / merge overlapping clusters.
 * - First, dedupe within `breaking` (keep higher-score cluster when near-duplicates).
 * - Then, drop any `existing` cluster that overlaps with the deduped breaking set.
 */
export function dedupeOverlappingClusters(
  breaking: Cluster[],
  existing: Cluster[],
  opts?: { jaccard?: number; centroidSim?: number }
): { breaking: Cluster[]; existing: Cluster[] } {
  const J = opts?.jaccard ?? 0.3;      // URL-overlap threshold
  const S = opts?.centroidSim ?? 0.85; // centroid cosine threshold

  const keptBreaking: ClusterWithCentroid[] = [];

  // 1) Dedupe within breaking
  for (const cRaw of breaking) {
    const c = cRaw as ClusterWithCentroid;
    let dupIndex = -1;

    for (let i = 0; i < keptBreaking.length; i++) {
      const k = keptBreaking[i];

      // URL overlap test
      const j = jaccardByUrl(c, k);
      if (j >= J) {
        dupIndex = i;
        break;
      }

      // Centroid similarity test
      const sim = clusterCentroidSim(c, k);
      if (sim >= S) {
        dupIndex = i;
        break;
      }
    }

    if (dupIndex === -1) {
      keptBreaking.push(c);
    } else {
      const existing = keptBreaking[dupIndex];
      const better =
        (c.score ?? 0) > (existing.score ?? 0) ? c : existing;
      keptBreaking[dupIndex] = better;
    }
  }

  // 2) Remove existing clusters that overlap with any keptBreaking
  const prunedExisting: Cluster[] = [];
  outer: for (const eRaw of existing) {
    const e = eRaw as ClusterWithCentroid;

    for (const b of keptBreaking) {
      const j = jaccardByUrl(e, b);
      if (j >= J) continue outer;

      const sim = clusterCentroidSim(e, b);
      if (sim >= S) continue outer;
    }

    prunedExisting.push(e);
  }

  return {
    breaking: keptBreaking,
    existing: prunedExisting,
  };
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
  } catch (err: any) {
    const msg = (err as Error)?.message ?? String(err);
    // This is where your "safety_violations=[sexual]" error is coming from
    if (msg.includes('safety_violations')) {
      console.warn('[embeddings] Request rejected by safety system, falling back to non-semantic clustering');
      // IMPORTANT: do NOT rethrow; just return null so we can gracefully fallback
      return null;
    }

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
 *  - Filter out very small earthquakes (M < 5.5)
 *  - Compute embedding per headline
 *  - For each item, assign to the most similar existing cluster if similarity >= threshold
 *  - Otherwise, start a new cluster
 */
export async function rankAndCluster(items: NewsItem[]): Promise<Cluster[]> {
  if (!items.length) return [];

  // Filter out small earthquakes (e.g. M < 5.5)
  const filteredItems = items.filter(i => {
    const mag = extractQuakeMagnitude(i.title || "");
    if (mag !== null && mag < 5.5) {
      return false; // ignore small quakes entirely
    }
    return true;
  });

  if (!filteredItems.length) {
    console.log("[clustering] All items filtered out (likely only small quakes); returning empty clusters");
    return [];
  }

  console.log(
    `[clustering] Processing ${filteredItems.length} items (filtered from ${items.length} total)`
  );

  // Step 1: Embeddings
  const titles = filteredItems.map(i => i.title);
  const embeddings = await getEmbeddings(titles);

  if (!embeddings || embeddings.length !== filteredItems.length) {
    // Fallback path: embeddings failed (including safety rejection)
    console.warn("[clustering] Embeddings unavailable or mismatched; returning single misc cluster");
    return [
      {
        id: "world:misc",
        kind: "world",
        title: "misc",
        items: filteredItems,
        score: filteredItems.length,
      },
    ];
  }

  type NewsItemWithEmbedding = NewsItem & { embedding: number[] };

  const itemsWithEmbeddings: NewsItemWithEmbedding[] = filteredItems.map((item, idx) => ({
    ...item,
    embedding: embeddings[idx],
  }));

  // Step 2: Greedy semantic clustering
  const similarityThreshold = 0.3; // tune as needed

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
      const uniqueSources = new Set(members.map(m => m.source || ""));
      const recAvg =
        members.reduce((s, m) => s + recencyScore(m.publishedAt), 0) / members.length;
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

      // First extract the "event phrase" from the representative title...
      const eventPhrase = extractEventPhrase(repTitle);
      // ...then normalize for earthquakes (Earthquake M#.##) if applicable
      const memberTitles = members.map(m => m.title || "");
      const title = normalizeClusterTitle(eventPhrase, memberTitles);

      return {
        id: `world:${idx}`,
        kind: "world",
        title,
        items: members,
        score,
      } as Cluster;
    });

  const sorted = clusters.sort((a, b) => (b.score || 0) - (a.score || 0));
  console.log(
    `[clustering] Created ${sorted.length} semantic clusters, top 3:`,
    sorted
      .slice(0, 3)
      .map(
        c =>
          `"${c.title}" (${c.items.length} items, score: ${c.score?.toFixed(1)})`
      )
  );

  return sorted;
}

/** Decide which clusters are "breaking" by coverage/recency. */
export function detectBreaking(clusters: Cluster[]): BreakingDecision[] {
  const out: BreakingDecision[] = [];
  const { minItems, minSources, recencyBoost } = config.breakingRules.world;

  for (const c of clusters) {
    const sources = new Set(c.items.map(i => i.source || ""));
    const recencies = c.items
      .map(i => recencyScore(i.publishedAt))
      .filter(r => Number.isFinite(r) && r > 0);

    if (!recencies.length) continue;

    const maxRecency = Math.max(...recencies);

    const isBreaking =
      (c.items.length >= minItems && sources.size >= minSources) ||
      (maxRecency >= recencyBoost && c.items.length >= 2);

    if (isBreaking) {
      console.log(
        `[breaking] Detected: "${c.title}" - ${c.items.length} items from ${sources.size} sources (recency: ${maxRecency.toFixed(
          2
        )})`
      );
      out.push({
        kind: "world",
        clusterId: c.id,
        rationale: `size=${c.items.length}, sources=${sources.size}, recentBoost=${maxRecency.toFixed(
          2
        )}`,
        sources: c.items.slice(0, 5).map(i => i.url),
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