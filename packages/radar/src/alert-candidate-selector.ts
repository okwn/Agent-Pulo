// radar/src/alert-candidate-selector.ts — Selects trends that should become alerts

import { createChildLogger } from '@pulo/observability';
import type { TrendScoreBreakdown } from './types.js';

const log = createChildLogger('alert-selector');

export interface AlertCandidate {
  trendId: string;
  score: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export class AlertCandidateSelector {
  /**
   * Determine if a trend should be alerted.
   */
  shouldAlert(params: {
    score: number;
    velocity: number;
    riskLevel: string;
    category: string;
    breakdown: TrendScoreBreakdown;
    castCount: number;
    trustedAuthorCount: number;
  }): AlertCandidate | null {
    const { score, velocity, riskLevel, category, breakdown, castCount, trustedAuthorCount } = params;

    // High risk = always alert
    if (riskLevel === 'high' || riskLevel === 'critical') {
      return {
        trendId: '',
        score,
        reason: `High risk (${riskLevel}) detected in ${category}`,
        priority: 'high',
      };
    }

    // Scam warning category = always alert
    if (category === 'scam_warning') {
      return {
        trendId: '',
        score,
        reason: 'Scam warning trend detected',
        priority: 'high',
      };
    }

    // High velocity + high score = alert
    if (velocity >= 5 && score >= 60) {
      return {
        trendId: '',
        score,
        reason: `High velocity (${velocity}/hr) and strong score (${score})`,
        priority: breakdown.scam_risk_score > 0.3 ? 'high' : 'medium',
      };
    }

    // Many trusted authors = alert
    if (trustedAuthorCount >= 5 && score >= 50) {
      return {
        trendId: '',
        score,
        reason: `${trustedAuthorCount} trusted authors discussing this`,
        priority: 'medium',
      };
    }

    // Very high score regardless
    if (score >= 75) {
      return {
        trendId: '',
        score,
        reason: `Very high trend score (${score})`,
        priority: 'medium',
      };
    }

    // Low engagement but high risk
    if (castCount < 5 && breakdown.scam_risk_score > 0.3) {
      return {
        trendId: '',
        score,
        reason: 'Low engagement but high scam risk signals',
        priority: 'high',
      };
    }

    return null;
  }

  /**
   * Select top N candidates from a list.
   */
  selectTop(candidates: AlertCandidate[], limit = 10): AlertCandidate[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...candidates]
      .sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return b.score - a.score;
      })
      .slice(0, limit);
  }
}

export const alertCandidateSelector = new AlertCandidateSelector();