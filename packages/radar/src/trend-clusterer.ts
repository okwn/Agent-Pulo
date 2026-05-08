// radar/src/trend-clusterer.ts — Clusters related casts into trends

import { createChildLogger } from '@pulo/observability';
import type { RadarCast, RadarCategory } from './types.js';
import { castIngestionNormalizer } from './cast-ingestion-normalizer.js';

const log = createChildLogger('trend-clusterer');

interface TrendClusterInput {
  title: string;
  normalizedTitle: string;
  keywords: string[];
  casts: RadarCast[];
  category: RadarCategory;
  firstSeen: Date;
  lastSeen: Date;
}

export class TrendClusterer {
  /**
   * Cluster casts into trends by keyword/topic similarity.
   */
  cluster(casts: RadarCast[]): TrendClusterInput[] {
    const clusters = new Map<string, TrendClusterInput>();

    for (const cast of casts) {
      const key = castIngestionNormalizer.normalizeText(cast.text).slice(0, 80);
      if (!key) continue;

      if (!clusters.has(key)) {
        clusters.set(key, {
          title: cast.text.slice(0, 120),
          normalizedTitle: key,
          keywords: [...cast.watchwordMatches],
          casts: [],
          category: this.inferCategory(cast.watchwordMatches),
          firstSeen: new Date(cast.timestamp),
          lastSeen: new Date(cast.timestamp),
        });
      }

      const cluster = clusters.get(key)!;
      cluster.casts.push(cast);
      for (const kw of cast.watchwordMatches) {
        if (!cluster.keywords.includes(kw)) {
          cluster.keywords.push(kw);
        }
      }
      const castTime = new Date(cast.timestamp);
      if (castTime > cluster.lastSeen) cluster.lastSeen = castTime;
      if (castTime < cluster.firstSeen) cluster.firstSeen = castTime;
    }

    log.info({ input: casts.length, clusters: clusters.size }, 'Casts clustered into trends');

    // Merge very similar clusters (same keywords overlap >50%)
    const merged = this.mergeSimilarClusters([...clusters.values()]);

    return merged.map(c => ({
      ...c,
      title: this.buildTitle(c),
      keywords: c.keywords,
    }));
  }

  /**
   * Merge clusters with >50% keyword overlap.
   */
  private mergeSimilarClusters(clusters: TrendClusterInput[]): TrendClusterInput[] {
    const result: TrendClusterInput[] = [];
    const used = new Set<number>();

    for (let i = 0; i < clusters.length; i++) {
      if (used.has(i)) continue;
      const ci = clusters[i];
      if (!ci) continue;
      let current: TrendClusterInput = { ...ci };
      used.add(i);

      for (let j = i + 1; j < clusters.length; j++) {
        const cj = clusters[j];
        if (!cj || used.has(j)) continue;
        const overlap = this.keywordOverlap(current.keywords, cj.keywords);
        if (overlap > 0.5) {
          current.casts.push(...cj.casts);
          for (const kw of cj.keywords) {
            if (!current.keywords.includes(kw)) current.keywords.push(kw);
          }
          const castTime = new Date(cj.lastSeen);
          if (castTime > current.lastSeen) current.lastSeen = castTime;
          used.add(j);
        }
      }

      result.push(current);
    }

    return result;
  }

  private keywordOverlap(a: string[], b: string[]): number {
    if (a.length === 0) return 0;
    let overlap = 0;
    for (const kw of a) if (b.includes(kw)) overlap++;
    return overlap / a.length;
  }

  private inferCategory(keywords: string[]): RadarCategory {
    const map: Record<string, RadarCategory> = {
      claim: 'claim', airdrop: 'airdrop', token: 'token_launch',
      grant: 'grant', hackathon: 'hackathon', reward: 'reward_program',
      scam: 'scam_warning',
    };
    for (const kw of keywords) {
      const cat = map[kw.toLowerCase()];
      if (cat) return cat;
    }
    return 'social_trend';
  }

  private buildTitle(cluster: TrendClusterInput): string {
    if (cluster.casts.length === 0) return cluster.title;
    // Use shortest text among casts as title
    const texts = cluster.casts.map(c => c.text);
    const sorted = [...texts].sort((a, b) => a.length - b.length);
    return sorted[0]?.slice(0, 120) || 'Trending topic';
  }
}

export const trendClusterer = new TrendClusterer();