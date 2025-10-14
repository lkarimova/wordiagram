import Parser from 'rss-parser';
import { config } from '../config';
import type { NewsItem, Cluster, BreakingDecision } from '../types';

const parser = new Parser();

async function fetchRss(url: string): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url);
    return (feed.items || []).map((i) => ({
      title: i.title || '',
      url: i.link || '',
      source: new URL(url).hostname,
      publishedAt: i.isoDate || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function fetchWorldNews(): Promise<NewsItem[]> {
  if (config.mock.news) {
    return [
      { title: 'Global climate summit sees urgent pledges', url: 'https://example.com/a', source: 'mock', publishedAt: new Date().toISOString(), category: 'world' },
      { title: 'Markets react to multi-region policy shift', url: 'https://example.com/b', source: 'mock', publishedAt: new Date().toISOString(), category: 'world' },
    ];
  }
  const lists = await Promise.all(config.news.worldSources.map(fetchRss));
  return lists.flat().map(i => ({ ...i, category: 'world' as const }));
}

export async function fetchArtNews(): Promise<NewsItem[]> {
  if (config.mock.news) {
    return [
      { title: 'Major museum announces landmark retrospective', url: 'https://example.com/c', source: 'mock', publishedAt: new Date().toISOString(), category: 'art' },
      { title: 'Record-setting auction drives palette discourse', url: 'https://example.com/d', source: 'mock', publishedAt: new Date().toISOString(), category: 'art' },
    ];
  }
  const lists = await Promise.all(config.news.artSources.map(fetchRss));
  return lists.flat().map(i => ({ ...i, category: 'art' as const }));
}

export function rankAndCluster(items: NewsItem[]): Cluster[] {
  // Minimal placeholder clustering: by hostname + first keyword. Replace with embeddings later.
  const map = new Map<string, Cluster>();
  for (const item of items) {
    const key = (item.title.split(' ')[0] || 'general').toLowerCase();
    const id = `${item.category || 'world'}:${key}`;
    const cluster = map.get(id) || { id, kind: (item.category || 'world') as 'world'|'art', title: key, items: [] };
    cluster.items.push(item);
    map.set(id, cluster);
  }
  // crude scoring by item count
  return Array.from(map.values()).map(c => ({ ...c, score: c.items.length }));
}

export function detectBreaking(prev: Cluster[] | undefined, clusters: Cluster[], kind: 'world'|'art'): BreakingDecision[] {
  // Simplified rule set; to be replaced by full rules.
  const decisions: BreakingDecision[] = [];
  for (const c of clusters.filter(x => x.kind === kind)) {
    if ((c.score || 0) >= (kind === 'world' ? 3 : 2)) {
      decisions.push({ kind, clusterId: c.id, rationale: 'High coverage across sources', sources: c.items.map(i => i.url).slice(0, 5) });
    }
  }
  return decisions;
}
