// radar/src/keyword-watcher.ts — Monitors casts for keyword matches

import { createChildLogger } from '@pulo/observability';
import type { RadarCast } from './types.js';
import { DEFAULT_KEYWORDS, CATEGORY_KEYWORDS, type RadarCategory } from './types.js';

const log = createChildLogger('keyword-watcher');

export class KeywordWatcher {
  private enKeywords: string[];
  private trKeywords: string[];
  private categoryMap: Map<string, RadarCategory>;

  constructor() {
    this.enKeywords = DEFAULT_KEYWORDS.en;
    this.trKeywords = DEFAULT_KEYWORDS.tr;
    this.categoryMap = new Map();
    for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of kws) {
        this.categoryMap.set(kw.toLowerCase(), cat as RadarCategory);
      }
    }
  }

  /**
   * Scan a cast for keyword matches and categorize.
   */
  scan(cast: RadarCast): RadarCast {
    const lower = cast.text.toLowerCase();
    const matched: string[] = [];

    // Check EN keywords
    for (const kw of this.enKeywords) {
      if (lower.includes(kw.toLowerCase())) {
        matched.push(kw);
      }
    }

    // Check TR keywords
    for (const kw of this.trKeywords) {
      if (lower.includes(kw)) {
        matched.push(kw);
      }
    }

    return {
      ...cast,
      watchwordMatches: matched,
    };
  }

  /**
   * Scan multiple casts.
   */
  scanBatch(casts: RadarCast[]): RadarCast[] {
    return casts.map(c => this.scan(c));
  }

  /**
   * Get matched categories for a set of keywords.
   */
  getCategories(keywords: string[]): RadarCategory[] {
    const cats = new Set<RadarCategory>();
    for (const kw of keywords) {
      const cat = this.categoryMap.get(kw.toLowerCase());
      if (cat) cats.add(cat);
    }
    // Default to social_trend if no category matched
    return cats.size > 0 ? [...cats] : ['unknown'];
  }

  /**
   * Cluster casts by keyword overlap.
   */
  clusterByKeywords(casts: RadarCast[]): Map<string, RadarCast[]> {
    const clusters = new Map<string, RadarCast[]>();

    for (const cast of casts) {
      if (cast.watchwordMatches.length === 0) continue;
      // Use the first keyword as cluster key
      const key = cast.watchwordMatches[0] ?? '';
      if (key && !clusters.has(key)) clusters.set(key, []);
      if (key) clusters.get(key)!.push(cast);
    }

    return clusters;
  }

  /**
   * Check if a cast has any suspicious claim patterns.
   */
  hasSuspiciousClaim(text: string): boolean {
    const lower = text.toLowerCase();
    const suspicious = [
      'guaranteed', '100% sure', 'will definitely', 'act now limited',
      'wallet connect', 'private key', 'send 0x', 'bit.ly', 'tinyurl',
      'claim now before', 'expires today', 'urgent airdrop',
    ];
    return suspicious.some(p => lower.includes(p));
  }

  /**
   * Normalize title from cast text for dedup.
   */
  normalizeTitle(text: string): string {
    return text.toLowerCase()
      .replace(/\$\w+/g, '')
      .replace(/0x[a-fA-F0-9]+/g, '')
      .replace(/\d+\.\d+/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);
  }
}

export const keywordWatcher = new KeywordWatcher();