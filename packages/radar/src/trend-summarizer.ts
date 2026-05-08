// radar/src/trend-summarizer.ts — Generates summaries for detected trends

import { createChildLogger } from '@pulo/observability';
import type { RadarCast, RadarCategory } from './types.js';

const log = createChildLogger('trend-summarizer');

export interface TrendSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  recommendedAction: 'watch' | 'alert' | 'ignore' | 'investigate';
  confidence: number;
}

export class TrendSummarizer {
  /**
   * Generate a summary for a trend cluster.
   */
  summarize(
    casts: RadarCast[],
    category: RadarCategory,
    keywords: string[],
    riskLevel: string
  ): TrendSummary {
    const title = this.generateTitle(casts, keywords);
    const keyPoints = this.extractKeyPoints(casts);
    const recommendedAction = this.decideAction(category, riskLevel, casts.length);
    const confidence = this.calculateConfidence(casts.length, keyPoints.length);

    // Build summary paragraph
    const summary = this.buildSummary(casts.length, category, keywords, riskLevel);

    return { title, summary, keyPoints, recommendedAction, confidence };
  }

  private generateTitle(casts: RadarCast[], keywords: string[]): string {
    // Use most informative keyword or first cast text
    if (keywords.length > 0) {
      const kw = keywords[0]!;
      return `${kw.charAt(0).toUpperCase() + kw.slice(1)} - trending`;
    }
    // Fall back to first cast text (truncated)
    const text = casts[0]?.text ?? 'Unknown trend';
    return text.slice(0, 80) + (text.length > 80 ? '...' : '');
  }

  private extractKeyPoints(casts: RadarCast[]): string[] {
    const points: string[] = [];
    const seen = new Set<string>();

    for (const cast of casts.slice(0, 10)) {
      // Extract first sentence as key point
      const firstSentence = cast.text.split(/[.!?]/)[0]?.trim() ?? '';
      const normalized = firstSentence.toLowerCase().slice(0, 50);
      if (normalized.length > 10 && !seen.has(normalized)) {
        seen.add(normalized);
        points.push(firstSentence.slice(0, 100));
      }
    }

    return points.slice(0, 5);
  }

  private decideAction(category: RadarCategory, riskLevel: string, castCount: number): TrendSummary['recommendedAction'] {
    if (riskLevel === 'high' || category === 'scam_warning') return 'alert';
    if (castCount < 3) return 'watch';
    if (castCount >= 10 && (category === 'airdrop' || category === 'token_launch')) return 'investigate';
    return 'watch';
  }

  private calculateConfidence(castCount: number, keyPointCount: number): number {
    let confidence = Math.min(0.9, 0.3 + castCount * 0.05 + keyPointCount * 0.1);
    return Math.round(confidence * 100);
  }

  private buildSummary(castCount: number, category: RadarCategory, keywords: string[], riskLevel: string): string {
    const categoryLabel = category.replace(/_/g, ' ');
    const kwStr = keywords.slice(0, 3).join(', ');
    const risk = riskLevel === 'unknown' ? '' : ` Risk: ${riskLevel}.`;

    return `Detected ${castCount} cast(s) about ${categoryLabel}${kwStr ? ` (${kwStr})` : ''}.${risk}`;
  }
}

export const trendSummarizer = new TrendSummarizer();