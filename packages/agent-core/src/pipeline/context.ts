// pipeline/context.ts — Builds AgentContext from NormalizedEvent + provider data

import { sql } from 'drizzle-orm';
import type { NormalizedEvent, Cast, CastThread } from '@pulo/farcaster';
import type { AgentContext, UserPreferences, PlanLimits, Plan } from '../types.js';
import { getProvider } from '@pulo/farcaster';
import { getDB, schema } from '@pulo/db';

const { userPreferences, users } = schema;

export class ContextBuilder {
  async build(event: NormalizedEvent): Promise<AgentContext> {
    const provider = getProvider();

    const [actorUser, preferences, recentCasts, relatedThread, relevantTrends] = await Promise.all([
      this.resolveUser(event.fid),
      this.loadPreferences(event.fid),
      this.loadRecentCasts(event.fid, 10),
      this.loadRelatedThread(event),
      this.loadRelevantTrends(event),
    ]);

    const plan: Plan = actorUser?.plan ?? 'free';

    return {
      event,
      user: {
        fid: event.fid,
        username: event.username,
        displayName: (event as { displayName?: string | null }).displayName ?? null,
        plan,
      },
      preferences,
      recentCasts,
      relatedThread,
      relevantTrends,
      createdAt: new Date(),
    };
  }

  private async resolveUser(fid: number): Promise<{ fid: number; username: string; plan: Plan } | null> {
    try {
      const provider = getProvider();
      const user = await provider.getUserByFid(fid);
      return { fid: user.fid, username: user.username, plan: 'free' };
    } catch {
      return null;
    }
  }

  private async loadPreferences(fid: number): Promise<UserPreferences | null> {
    try {
      const db = getDB();

      // Look up user by fid, then get their preferences
      const [userRow] = await db.select({ id: users.id }).from(users).where(sql`fid = ${fid}`).limit(1);
      if (!userRow) return null;

      const [pref] = await db.select().from(userPreferences).where(sql`user_id = ${userRow.id}`).limit(1);
      if (!pref) return null;

      return {
        userId: pref.userId,
        fid,
        preferredReplyTone: (pref.tone as UserPreferences['preferredReplyTone']) ?? 'concise',
        maxCastLength: pref.dailyReplyLimit ?? 320,
        enableTruthChecks: true,
        enableTrendAlerts: true,
        enableAutoReplies: pref.autoReplyMode !== 'off',
        blockedWords: pref.blockedTopics ?? [],
        allowedChannels: pref.preferredChannels ?? [],
        customInstructions: '',
      };
    } catch {
      return null;
    }
  }

  private async loadRecentCasts(fid: number, limit: number): Promise<Cast[]> {
    try {
      const provider = getProvider();
      const result = await provider.getUserRecentCasts(fid, { limit });
      return result.results;
    } catch {
      return [];
    }
  }

  private async loadRelatedThread(event: NormalizedEvent): Promise<CastThread | null> {
    try {
      const provider = getProvider();

      if (event.type === 'reply' || event.type === 'mention') {
        const hash = (event as { castHash?: string }).castHash ?? null;
        const parent = event.parentHash;
        if (event.type === 'reply' && hash) {
          return provider.getCastThread(hash, { depth: 2 });
        }
        if (event.type === 'mention' && parent) {
          return provider.getCastThread(parent, { depth: 1 });
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private async loadRelevantTrends(event: NormalizedEvent): Promise<Cast[]> {
    try {
      const provider = getProvider();
      const text = (event as { castText?: string }).castText
        ?? (event as { message?: string }).message
        ?? '';
      const trendKeywords = ['airdrop', 'grant', '$', 'launch', 'token', 'reward'];

      for (const kw of trendKeywords) {
        if (text.toLowerCase().includes(kw)) {
          const results = await provider.searchCasts(kw, { limit: 3 });
          return results.results;
        }
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const contextBuilder = new ContextBuilder();