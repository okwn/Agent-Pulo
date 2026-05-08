// radar/src/cast-ingestion-normalizer.ts — Normalizes casts for radar processing

import { createChildLogger } from '@pulo/observability';
import type { RadarCast } from './types.js';

const log = createChildLogger('cast-normalizer');

export class CastIngestionNormalizer {
  /**
   * Normalize a raw cast into RadarCast format.
   * Works with both Cast interface (hash) and RadarCast (castHash).
   */
  normalize(cast: {
    hash?: string;
    castHash?: string;
    text: string;
    authorFid: number;
    authorUsername?: string;
    timestamp?: string;
    engagementCount?: number;
    reactionsCount?: number;
    recastsCount?: number;
    repliesCount?: number;
    channelId?: string;
  }): RadarCast {
    return {
      castHash: cast.hash ?? cast.castHash ?? '',
      authorFid: cast.authorFid,
      authorUsername: cast.authorUsername,
      text: cast.text,
      channelId: cast.channelId,
      timestamp: cast.timestamp ?? new Date().toISOString(),
      engagementCount: cast.engagementCount ?? cast.reactionsCount,
      recastCount: cast.recastsCount,
      replyCount: cast.repliesCount,
      watchwordMatches: [],
      normalizedText: this.normalizeText(cast.text),
    };
  }

  /**
   * Normalize batch of casts.
   */
  normalizeBatch(casts: Array<{
    hash?: string;
    castHash?: string;
    text: string;
    authorFid: number;
    authorUsername?: string;
    timestamp?: string;
    engagementCount?: number;
    reactionsCount?: number;
    recastsCount?: number;
    repliesCount?: number;
    channelId?: string;
  }>): RadarCast[] {
    return casts.map(c => this.normalize(c));
  }

  /**
   * Strip handles, tokens, addresses for clustering.
   */
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/@\w+/g, 'USER')
      .replace(/\$\w+/g, 'TOKEN')
      .replace(/0x[a-fA-F0-9]{8,}/g, 'ADDRESS')
      .replace(/https?:\/\/\S+/g, 'LINK')
      .replace(/\d+\.\d+%?/g, 'NUM')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract significant keywords from normalized text.
   */
  extractKeywords(normalizedText: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'and', 'or', 'this', 'that', 'with', 'on', 'at', 'by', 'it', 'its', 'be', 'have', 'has', 'do', 'does', 'did']);
    return normalizedText.split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 10);
  }
}

export const castIngestionNormalizer = new CastIngestionNormalizer();