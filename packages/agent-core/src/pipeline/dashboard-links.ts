// agent-core/src/pipeline/dashboard-links.ts — Generate dashboard report links

import { createChildLogger } from '@pulo/observability';

const log = createChildLogger('dashboard-links');

export class DashboardLinkGenerator {
  /**
   * Generate a link to a truth check report.
   */
  truthCheck(truthCheckId: string): string {
    return `https://pulo.xyz/dashboard/truth/${truthCheckId}`;
  }

  /**
   * Generate a link to a radar trend.
   */
  radarTrend(trendId: string): string {
    return `https://pulo.xyz/dashboard/radar/${trendId}`;
  }

  /**
   * Generate a link to the user's drafts.
   */
  drafts(): string {
    return 'https://pulo.xyz/dashboard/drafts';
  }

  /**
   * Generate a link to the user's agent runs.
   */
  agentRuns(runId?: string): string {
    return runId
      ? `https://pulo.xyz/admin/runs/${runId}`
      : 'https://pulo.xyz/admin/runs';
  }

  /**
   * Generate a link to the admin events page.
   */
  adminEvents(eventId?: string): string {
    return eventId
      ? `https://pulo.xyz/admin/events?event=${eventId}`
      : 'https://pulo.xyz/admin/events';
  }

  /**
   * Generate a link to reply drafts.
   */
  replyDrafts(draftId?: string): string {
    return draftId
      ? `https://pulo.xyz/admin/drafts/${draftId}`
      : 'https://pulo.xyz/admin/drafts';
  }

  /**
   * Generate a link to alert settings.
   */
  alertSettings(): string {
    return 'https://pulo.xyz/dashboard/settings/alerts';
  }

  /**
   * Format a CTA message with dashboard link.
   */
  cta(message: string): string {
    return `${message} → pulo.xyz/dashboard`;
  }

  /**
   * Format a dashboard link as a mentions-safe short URL (no @ symbols).
   */
  shortCta(message: string): string {
    return `${message} → pulo.app`;
  }
}

export const dashboardLinkGenerator = new DashboardLinkGenerator();
