export type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
  summary?: string;
  category?: 'world' | 'art';
  regions?: string[];
  confidence?: number; // 0..1
};

export type Cluster = {
  id: string;
  kind: 'world' | 'art';
  title: string;
  items: NewsItem[];
  centroidEmbedding?: number[];
  score?: number;
  regions?: string[];
  firstSeenAt?: string;
};

export type BreakingDecision = {
  kind: 'world' | 'art';
  clusterId: string;
  rationale: string;
  sources: string[];
};

export type StyleDescriptor = {
  descriptor: string;
  palette: string[];
  references?: string[];
  blendRatio?: { previous: number; news: number };
};

export type ComposePromptResult = {
  prompt: string;
  negative_prompt: string;
  seed_hint?: number;
  control_notes?: string;
};

export type UpdatePlan = {
  update_prompt: string;
  suggested_mask?: string; // url to mask if generated
  rationale: string;
  sources: string[];
};

export type RestylePlan = {
  restyle_prompt: string;
  blend_details: string;
  rationale: string;
  sources: string[];
};
