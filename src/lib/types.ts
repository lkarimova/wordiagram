// src/lib/types.ts

export type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt?: string; // ISO (made optional since some feeds don't have it)
  summary?: string;
  category?: 'world'; // Only world news now
  regions?: string[];
  confidence?: number; // 0..1
};

export type Cluster = {
  id: string;
  kind: 'world'; // Only world news now
  title: string;
  items: NewsItem[];
  centroidEmbedding?: number[];
  score?: number;
  regions?: string[];
  firstSeenAt?: string;
};

export type BreakingDecision = {
  kind: 'world'; // Only world news now
  clusterId: string;
  rationale: string;
  sources: string[];
};

export type ComposePromptResult = {
  prompt: string;
  negative_prompt: string;
  seed_hint?: number;
  control_notes?: string;
};

// Removed: StyleDescriptor (no longer using art news for style)
// Removed: UpdatePlan (no longer doing additive updates)
// Removed: RestylePlan (no longer doing art-based restyling)