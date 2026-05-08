// radar/src/velocity-scorer.ts — Scores trend velocity (acceleration/deceleration)

import { createChildLogger } from '@pulo/observability';

const log = createChildLogger('velocity-scorer');

export interface VelocityData {
  castCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  previousVelocity?: number;
}

export class VelocityScorer {
  /**
   * Score velocity (mentions per hour).
   */
  score(data: VelocityData): number {
    const hours = Math.max(0.5, (data.lastSeenAt.getTime() - data.firstSeenAt.getTime()) / (1000 * 60 * 60));
    const vph = data.castCount / hours;

    // Velocity levels
    if (vph >= 10) return 100;
    if (vph >= 5) return 80;
    if (vph >= 2) return 60;
    if (vph >= 1) return 40;
    if (vph >= 0.5) return 20;
    return Math.round(vph * 40);
  }

  /**
   * Detect if trend is accelerating.
   */
  isAccelerating(currentVelocity: number, previousVelocity?: number): boolean {
    if (!previousVelocity) return false;
    return currentVelocity > previousVelocity * 1.5;
  }

  /**
   * Detect if trend is fading.
   */
  isFading(castCount: number, firstSeenAt: Date, lastSeenAt: Date): boolean {
    const hours = Math.max(1, (lastSeenAt.getTime() - firstSeenAt.getTime()) / (1000 * 60 * 60));
    const vph = castCount / hours;
    // If less than 0.2 mentions/hour after 24+ hours, likely fading
    return hours > 24 && vph < 0.2;
  }
}

export const velocityScorer = new VelocityScorer();