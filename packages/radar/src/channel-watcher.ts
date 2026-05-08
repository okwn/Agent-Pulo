// radar/src/channel-watcher.ts — Watches specific channels for relevant casts

import { createChildLogger } from '@pulo/observability';
import type { RadarCast } from './types.js';
import type { IFarcasterProvider, Cast } from '@pulo/farcaster';

const log = createChildLogger('channel-watcher');

export const DEFAULT_CHANNELS = ['base', 'farcaster', 'miniapps', 'builders', 'crypto', 'airdrop', 'token'];

export class ChannelWatcher {
  constructor(private provider?: IFarcasterProvider) {}

  /**
   * Fetch recent casts from watched channels.
   */
  async fetchChannelCasts(channels: string[] = DEFAULT_CHANNELS): Promise<RadarCast[]> {
    const casts: RadarCast[] = [];

    if (!this.provider) {
      log.debug('No farcaster provider, returning empty');
      return casts;
    }

    for (const channelId of channels) {
      try {
        const result = await this.provider.searchCasts(`channel:${channelId}`, { limit: 20 });
        for (const cast of result.results) {
          casts.push(this.castToRadarCast(cast, channelId));
        }
      } catch (err) {
        log.debug({ channelId, err }, 'Failed to fetch channel casts');
      }
    }

    log.info({ channels: channels.length, casts: casts.length }, 'Channel casts fetched');
    return casts;
  }

  /**
   * Fetch casts from all default watched channels.
   */
  async fetchAllChannels(): Promise<RadarCast[]> {
    return this.fetchChannelCasts(DEFAULT_CHANNELS);
  }

  private castToRadarCast(cast: Cast, channelId: string): RadarCast {
    return {
      castHash: cast.hash,
      authorFid: cast.authorFid,
      authorUsername: cast.authorUsername,
      text: cast.text,
      channelId: cast.channelId ?? channelId,
      timestamp: cast.timestamp,
      engagementCount: cast.reactionsCount,
      recastCount: cast.recastsCount,
      replyCount: cast.repliesCount,
      watchwordMatches: [],
      normalizedText: this.normalizeText(cast.text),
    };
  }

  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/\$\w+/g, 'TOKEN')
      .replace(/0x[a-fA-F0-9]+/g, 'ADDRESS')
      .replace(/\d+\.\d+/g, 'NUM')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export const channelWatcher = new ChannelWatcher();