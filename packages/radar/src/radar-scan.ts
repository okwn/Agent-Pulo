// radar/src/radar-scan.ts — Main radar orchestrator for the scan workflow

import { createChildLogger } from '@pulo/observability';
import type { RadarCast, RadarTrend, RadarCategory } from './types.js';
import type { IFarcasterProvider } from '@pulo/farcaster';

import { channelWatcher, DEFAULT_CHANNELS } from './channel-watcher.js';
import { keywordWatcher } from './keyword-watcher.js';
import { castIngestionNormalizer } from './cast-ingestion-normalizer.js';
import { trendClusterer } from './trend-clusterer.js';
import { trendScorer, type TrendScoringInput } from './trend-scorer.js';
import { velocityScorer } from './velocity-scorer.js';
import { trustWeightedAuthorScorer } from './trust-weighted-author-scorer.js';
import { engagementScorer } from './engagement-scorer.js';
import { linkRiskAnalyzer } from './link-risk-analyzer.js';
import { claimRiskAnalyzer } from './claim-risk-analyzer.js';
import { trendSummarizer } from './trend-summarizer.js';
import { alertCandidateSelector } from './alert-candidate-selector.js';

import type { DB } from '@pulo/db';
import { radarTrendRepository, radarKeywordRepository, radarChannelRepository } from '@pulo/db';

const log = createChildLogger('radar-scan');

export interface RadarScanOptions {
  channels?: string[];
  provider?: IFarcasterProvider;
  db?: DB;
  minScore?: number;
}

export interface ScanResult {
  trendsFound: number;
  newTrends: number;
  updatedTrends: number;
  alerts: string[];
}

export class RadarScan {
  constructor(private options: RadarScanOptions = {}) {}

  /**
   * Run a full radar scan.
   */
  async run(): Promise<ScanResult> {
    log.info('Starting radar scan');

    // 1. Fetch casts from watched channels
    const rawCasts = await channelWatcher.fetchChannelCasts(this.options.channels ?? DEFAULT_CHANNELS);

    // 2. Normalize casts
    const normalized = castIngestionNormalizer.normalizeBatch(rawCasts);

    // 3. Scan for keywords
    const scanned = keywordWatcher.scanBatch(normalized);

    // 4. Filter casts with keyword matches
    const relevant = scanned.filter(c => c.watchwordMatches.length > 0);

    log.info({ total: rawCasts.length, relevant: relevant.length }, 'Relevant casts filtered');

    if (relevant.length === 0) {
      return { trendsFound: 0, newTrends: 0, updatedTrends: 0, alerts: [] };
    }

    // 5. Cluster into trends
    const clusters = trendClusterer.cluster(relevant);

    log.info({ clusters: clusters.length }, 'Trends clustered');

    // 6. Score each cluster and create/update trends
    let newTrends = 0;
    let updatedTrends = 0;
    const alertIds: string[] = [];

    for (const cluster of clusters) {
      const trendData = await this.scoreAndPersist(cluster, relevant);
      if (trendData.isNew) newTrends++;
      else updatedTrends++;

      if (trendData.shouldAlert) {
        alertIds.push(trendData.id);
      }
    }

    log.info({ newTrends, updatedTrends, alertIds: alertIds.length }, 'Scan complete');
    return { trendsFound: clusters.length, newTrends, updatedTrends, alerts: alertIds };
  }

  private async scoreAndPersist(cluster: {
    title: string;
    normalizedTitle: string;
    keywords: string[];
    casts: RadarCast[];
    category: RadarCategory;
    firstSeen: Date;
    lastSeen: Date;
  }, allCasts: RadarCast[]): Promise<{ id: string; isNew: boolean; shouldAlert: boolean }> {
    const casts = cluster.casts;
    const authorScores = trustWeightedAuthorScorer.calculateTrendTrust(casts);
    const engScore = engagementScorer.score(casts);
    const velocity = velocityScorer.score({ castCount: casts.length, firstSeenAt: cluster.firstSeen, lastSeenAt: cluster.lastSeen });

    // Risk analysis
    let maxLinkRisk = 0;
    let maxClaimRisk = 0;
    for (const cast of casts) {
      const linkRisk = linkRiskAnalyzer.analyze(cast.text);
      const claimRisk = claimRiskAnalyzer.analyze(cast.text);
      maxLinkRisk = Math.max(maxLinkRisk, linkRisk.riskScore);
      maxClaimRisk = Math.max(maxClaimRisk, claimRisk.riskScore);
    }
    const overallRisk = maxLinkRisk > 0.5 || maxClaimRisk > 0.5 ? 'medium' : maxLinkRisk > 0.3 || maxClaimRisk > 0.3 ? 'low' : 'unknown';

    // Score
    const breakdown = trendScorer.calculateBreakdown({
      castCount: casts.length,
      uniqueAuthorCount: new Set(casts.map(c => c.authorFid)).size,
      trustedAuthorCount: authorScores.highTrustCount,
      engagementTotal: engScore.total,
      channelIds: [...new Set(casts.map(c => c.channelId).filter(Boolean))] as string[],
      onchainConfirmation: false,
      officialSourceCount: authorScores.officialCount,
      spamSignals: 0,
      scamSignals: maxClaimRisk > 0.5 ? 1 : 0,
      velocityPerHour: velocity / 10,
    });

    const summary = trendSummarizer.summarize(casts, cluster.category, cluster.keywords, overallRisk);

    const db = this.options.db;
    if (!db) {
      return { id: 'mock', isNew: true, shouldAlert: false };
    }

    // Check if trend exists
    const existing = await radarTrendRepository.findByNormalizedTitle(db, cluster.normalizedTitle);

    if (existing) {
      // Update
      await radarTrendRepository.updateScore(db, existing.id, breakdown.total, velocity, casts.length);
      await radarTrendRepository.update(db, existing.id, {
        lastSeenAt: new Date(),
        castCount: casts.length,
        sourceCount: casts.length,
        trustedAuthorCount: authorScores.highTrustCount,
        summary: summary.summary,
        riskLevel: overallRisk as 'low' | 'medium' | 'high' | 'unknown',
        confidence: summary.confidence,
      });

      // Add new sources
      for (const cast of casts.slice(0, 5)) {
        await radarTrendRepository.addSource(db, existing.id, {
          castHash: cast.castHash,
          authorFid: cast.authorFid,
          authorUsername: cast.authorUsername,
          channelId: cast.channelId,
          text: cast.text,
          engagementScore: engagementScorer.scoreCast(cast),
          trustScore: trustWeightedAuthorScorer.scoreAuthor(cast.authorUsername).trustScore,
          hasSuspiciousLink: linkRiskAnalyzer.analyze(cast.text).hasSuspiciousLink,
          hasClaimRisk: claimRiskAnalyzer.analyze(cast.text).hasRisk,
        });
      }

      const shouldAlert = alertCandidateSelector.shouldAlert({
        score: breakdown.total,
        velocity,
        riskLevel: overallRisk,
        category: cluster.category,
        breakdown,
        castCount: casts.length,
        trustedAuthorCount: authorScores.highTrustCount,
      }) !== null;

      return { id: existing.id, isNew: false, shouldAlert };
    } else {
      // Create new
      const trend = await radarTrendRepository.create(db, {
        title: summary.title,
        normalizedTitle: cluster.normalizedTitle,
        category: cluster.category,
        keywords: cluster.keywords,
        score: breakdown.total,
        velocity,
        riskLevel: overallRisk as 'low' | 'medium' | 'high' | 'unknown',
        confidence: summary.confidence,
        adminStatus: 'detected',
        firstSeenAt: cluster.firstSeen,
        lastSeenAt: cluster.lastSeen,
        sourceCount: casts.length,
        castCount: casts.length,
        trustedAuthorCount: authorScores.highTrustCount,
        summary: summary.summary,
        metadata: { breakdown, category: cluster.category },
      });

      // Add sources
      for (const cast of casts.slice(0, 10)) {
        await radarTrendRepository.addSource(db, trend.id, {
          castHash: cast.castHash,
          authorFid: cast.authorFid,
          authorUsername: cast.authorUsername,
          channelId: cast.channelId,
          text: cast.text,
          engagementScore: engagementScorer.scoreCast(cast),
          trustScore: trustWeightedAuthorScorer.scoreAuthor(cast.authorUsername).trustScore,
          hasSuspiciousLink: linkRiskAnalyzer.analyze(cast.text).hasSuspiciousLink,
          hasClaimRisk: claimRiskAnalyzer.analyze(cast.text).hasRisk,
        });
      }

      return { id: trend.id, isNew: true, shouldAlert: false };
    }
  }
}

export const radarScan = new RadarScan();