import type { Cluster, StyleDescriptor, ComposePromptResult, UpdatePlan, RestylePlan } from '../types';

export function buildContentMotifs(clusters: Cluster[]): { themes: { title: string; motif: string; rationale: string; sources: string[] }[] } {
  const top = clusters
    .filter(c => c.kind === 'world')
    .sort((a,b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);
  const motifs = top.map(c => ({
    title: c.title,
    motif: `Motif inspired by ${c.title}: layered metaphors, distant scale, copper dawn`,
    rationale: 'Global significance inferred from coverage.',
    sources: c.items.map(i => i.url).slice(0, 3),
  }));
  return { themes: motifs };
}

export function buildStyleDescriptor(artClusters: Cluster[], prior?: StyleDescriptor): StyleDescriptor {
  const base: StyleDescriptor = {
    descriptor: 'post-digital painterly minimalism with impasto texture and archival grain',
    palette: ['#4b6cc1','#e2c290','#1a1a1a','#f2efe9'],
    references: ['color-field', 'brutalist layout'],
  };
  if (!prior) return base;
  const ratio = { previous: 0.4, news: 0.6 };
  return {
    descriptor: `${Math.round(ratio.previous*100)}% ${prior.descriptor} blended with ${Math.round(ratio.news*100)}% ${base.descriptor}`,
    palette: Array.from(new Set([...(prior.palette||[]), ...base.palette])).slice(0,6),
    references: Array.from(new Set([...(prior.references||[]), ...(base.references||[])])),
    blendRatio: ratio,
  };
}

export function composePaintingPrompt(motifs: ReturnType<typeof buildContentMotifs>, style: StyleDescriptor): ComposePromptResult {
  const motifsText = motifs.themes.map(t => t.motif).join('; ');
  const prompt = `A museum-grade painting, aspect 3:4 portrait, painterly textures, cohesive composition, ornate frame visible. ${motifsText}. Style: ${style.descriptor}. Avoid text or logos. Culturally neutral metaphors.`;
  const negative = 'photorealism, nudity, graphic harm, flags, text, logos, gore, identifiable private persons';
  return { prompt, negative_prompt: negative, control_notes: 'keep frame visible, balanced rule-of-thirds', seed_hint: undefined };
}

export function buildAdditiveUpdatePlan(worldCluster: Cluster): UpdatePlan {
  return {
    update_prompt: `Add a new element symbolizing ${worldCluster.title}, placed on an upper third, small scale, palette harmonized`,
    suggested_mask: undefined,
    rationale: 'New breaking world event, additive only',
    sources: worldCluster.items.map(i => i.url).slice(0,3),
  };
}

export function buildRestylePlan(artCluster: Cluster, prior: StyleDescriptor): RestylePlan {
  return {
    restyle_prompt: `Restyle with ${artCluster.title} influence while preserving content; palette shift and brushwork per latest art headlines` ,
    blend_details: '60% new influence, 40% prior',
    rationale: 'Breaking art-world style update',
    sources: artCluster.items.map(i => i.url).slice(0,3),
  };
}
