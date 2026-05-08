// truth/src/truth-checker.ts — Main TruthChecker orchestrator

import { createChildLogger } from '@pulo/observability';
import type { NormalizedEvent } from '@pulo/farcaster';
import type {
  TruthReport,
  TruthCheckContext,
  EvidenceItem,
  Verdict,
} from './types.js';
import type { IFarcasterProvider } from '@pulo/farcaster';
import type { SafetyGate } from '@pulo/safety';

import { ClaimExtractor, claimExtractor } from './claim-extractor.js';
import { EvidenceCollector, createEvidenceCollector } from './evidence-collector.js';
import { ReplyCommentAnalyzer, replyCommentAnalyzer } from './reply-comment-analyzer.js';
import { SourceTrustScorer, sourceTrustScorer } from './source-trust-scorer.js';
import { ContradictionDetector, contradictionDetector } from './contradiction-detector.js';
import { ScamSignalDetector, scamSignalDetector } from './scam-signal-detector.js';
import { TruthVerdictEngine, truthVerdictEngine } from './verdict-engine.js';
import { TruthReportFormatter, truthReportFormatter } from './report-formatter.js';
import { TruthIntentDetector, truthIntentDetector } from './intent-detector.js';

const log = createChildLogger('truth-checker');

export interface TruthCheckerConfig {
  farcasterProvider?: IFarcasterProvider;
  claimExtractor?: ClaimExtractor;
  evidenceCollector?: EvidenceCollector;
  replyAnalyzer?: ReplyCommentAnalyzer;
  sourceScorer?: SourceTrustScorer;
  contradictionDetector?: ContradictionDetector;
  scamDetector?: ScamSignalDetector;
  verdictEngine?: TruthVerdictEngine;
  reportFormatter?: TruthReportFormatter;
}

export class TruthChecker {
  private farcasterProvider?: IFarcasterProvider;
  private claimExtractor: ClaimExtractor;
  private evidenceCollector: EvidenceCollector;
  private replyAnalyzer: ReplyCommentAnalyzer;
  private sourceScorer: SourceTrustScorer;
  private contradictionDetector: ContradictionDetector;
  private scamDetector: ScamSignalDetector;
  private verdictEngine: TruthVerdictEngine;
  private reportFormatter: TruthReportFormatter;

  constructor(config: TruthCheckerConfig = {}) {
    this.farcasterProvider = config.farcasterProvider;
    this.claimExtractor = config.claimExtractor ?? claimExtractor;
    this.evidenceCollector = config.evidenceCollector ?? createEvidenceCollector(config.farcasterProvider);
    this.replyAnalyzer = config.replyAnalyzer ?? replyCommentAnalyzer;
    this.sourceScorer = config.sourceScorer ?? sourceTrustScorer;
    this.contradictionDetector = config.contradictionDetector ?? contradictionDetector;
    this.scamDetector = config.scamDetector ?? scamSignalDetector;
    this.verdictEngine = config.verdictEngine ?? truthVerdictEngine;
    this.reportFormatter = config.reportFormatter ?? truthReportFormatter;
  }

  /**
   * Detect if a cast text contains a truth-check query.
   */
  detectIntent(castText: string) {
    return truthIntentDetector.detect(castText);
  }

  /**
   * Run full truth check workflow on a target cast.
   */
  async run(event: NormalizedEvent, safetyGate?: SafetyGate): Promise<TruthReport> {
    const startTime = Date.now();

    // Extract target info from the event
    const targetCastHash = this.extractCastHash(event);
    const targetCastText = this.extractCastText(event);
    const targetAuthorFid = this.extractAuthorFid(event);

    log.info({ targetCastHash, textLength: targetCastText.length }, 'Starting truth check');

    // 1. Extract claim
    const claim = this.claimExtractor.extract(targetCastText);

    // 2. Build context (fetch related casts)
    const context = await this.buildContext(targetCastHash, event);

    // 3. Collect evidence
    const evidence = await this.evidenceCollector.collect(claim, context);

    // 4. Analyze replies
    const replyAnalysis = this.replyAnalyzer.analyze(evidence, claim);

    // 5. Score sources
    const sourceAssessments = this.sourceScorer.score(evidence);

    // 6. Detect contradictions
    const contradictionResult = this.contradictionDetector.detect(claim, evidence);

    // 7. Detect scam signals
    const riskAssessment = this.scamDetector.detect(claim, evidence);

    // 8. Mark official/high-trust sources on evidence
    const markedEvidence = this.markTrustOnEvidence(evidence, sourceAssessments);

    // 9. Produce verdict
    const { verdict, confidence, reasoning } = this.verdictEngine.produceVerdict({
      claim,
      replyAnalysis,
      contradictionResult,
      riskAssessment,
      sourceAssessments,
      context,
    });

    // 10. Build short answer
    const shortAnswer = this.buildShortAnswer(verdict, confidence, claim);

    // 11. Build evidence summary
    const evidenceSummary = this.buildEvidenceSummary(markedEvidence, contradictionResult);

    // 12. Format report
    const processingTimeMs = Date.now() - startTime;

    const reportBase = {
      targetCastHash,
      targetCastText,
      targetAuthorFid,
      claim,
      verdict,
      confidence,
      shortAnswer,
      dashboardExplanation: this.reportFormatter.formatDashboardExplanation(
        verdict,
        confidence,
        evidenceSummary,
        riskAssessment,
        claim.claim
      ),
      evidence: evidenceSummary,
      riskAssessment,
      sourceCasts: evidence.map(e => e.castHash),
      sourcesChecked: sourceAssessments.filter(s => s.level !== 'unknown').map(s => s.source),
      createdAt: new Date().toISOString(),
      processingTimeMs,
    };

    // 13. Format full report with public reply
    const report = this.reportFormatter.format(reportBase, verdict, confidence);

    log.info({
      targetCastHash,
      verdict,
      confidence,
      processingTimeMs,
      recommendedAction: report.recommendedAction,
    }, 'Truth check complete');

    return report;
  }

  private extractCastHash(event: NormalizedEvent): string {
    return (event as { hash?: string }).hash ?? (event as { castHash?: string }).castHash ?? '';
  }

  private extractCastText(event: NormalizedEvent): string {
    if ('castText' in event) return (event as { castText: string }).castText;
    if ('text' in event) return (event as { text: string }).text;
    return '';
  }

  private extractAuthorFid(event: NormalizedEvent): number {
    return (event as { authorFid?: number }).authorFid ?? 0;
  }

  private async buildContext(targetCastHash: string, event: NormalizedEvent): Promise<TruthCheckContext> {
    const parentThreadHashes: string[] = [];
    const replyHashes: string[] = [];

    // Extract thread/reply info from event if available
    if ('parentHash' in event && event.parentHash) {
      parentThreadHashes.push(event.parentHash as string);
    }

    // Try to fetch parent casts
    if (this.farcasterProvider) {
      try {
        // Get direct parent
        if ('parentHash' in event && event.parentHash) {
          const parent = await this.farcasterProvider.getCastByHash(event.parentHash as string);
          if (parent) {
            // Fetch replies to parent
            const repliesResult = await this.farcasterProvider.getReplies(event.parentHash as string, { limit: 10 });
            replyHashes.push(...repliesResult.results.map(r => r.hash).filter(Boolean));
          }
        }

        // Fetch replies to target
        if (targetCastHash) {
          try {
            const repliesResult = await this.farcasterProvider.getReplies(targetCastHash, { limit: 10 });
            replyHashes.push(...repliesResult.results.map(r => r.hash).filter(Boolean));
          } catch {
            // Target might not support replies
          }
        }
      } catch (err) {
        log.debug({ err }, 'Failed to fetch full context');
      }
    }

    return {
      targetCastHash,
      targetCastText: this.extractCastText(event),
      targetAuthorFid: this.extractAuthorFid(event),
      parentThreadHashes,
      replyHashes: [...new Set(replyHashes)],
      keywordSearchResults: [],
      authorProfile: undefined,
    };
  }

  private markTrustOnEvidence(evidence: EvidenceItem[], sourceAssessments: ReturnType<SourceTrustScorer['score']>): EvidenceItem[] {
    const trustMap = new Map(sourceAssessments.map(s => [s.source, s.level]));

    return evidence.map(item => {
      const username = item.authorUsername ?? '';
      const trustLevel = trustMap.get(username.toLowerCase()) ?? 'unknown';
      return {
        ...item,
        isOfficialSource: trustLevel === 'official',
        isHighTrustUser: trustLevel === 'high_trust' || trustLevel === 'official',
      };
    });
  }

  private buildShortAnswer(verdict: Verdict, confidence: number, claim: { claim: string; category: string }): string {
    switch (verdict) {
      case 'likely_true':
        return `This claim appears to be accurate based on available evidence.`;

      case 'likely_false':
        return `This claim appears to be inaccurate or misleading based on available evidence.`;

      case 'mixed':
        return `Evidence is mixed — some sources support this claim, others contradict it.`;

      case 'unverified':
        return `I found people discussing this, but there is no clear confirmation from official sources yet.`;

      case 'scam_risk':
        return `This content shows signs of a scam. Do NOT engage or share.`;

      case 'insufficient_context':
        return `Not enough information is available to verify this claim.`;

      default:
        return `This claim could not be verified.`;
    }
  }

  private buildEvidenceSummary(
    evidence: EvidenceItem[],
    contradictionResult: ReturnType<ContradictionDetector['detect']>
  ): TruthReport['evidence'] {
    const supporting_casts = evidence.filter(e => e.sentiment === 'supporting' || e.isOfficialSource);
    const contradicting_casts = evidence.filter(e => e.sentiment === 'contradicting');
    const official_sources = evidence.filter(e => e.isOfficialSource);
    const high_trust_users = evidence.filter(e => e.isHighTrustUser && !e.isOfficialSource);
    const suspicious_patterns = evidence.filter(e => e.sentiment === 'suspicious' || this.containsSuspicious(e.text));

    const mentionedEvidence = new Set([
      ...supporting_casts.map(e => e.castHash),
      ...contradicting_casts.map(e => e.castHash),
    ]);
    const missing_evidence = contradictionResult.hasContradictions
      ? ['Original claim source could not be verified']
      : [];

    return {
      supporting_casts,
      contradicting_casts,
      official_sources,
      high_trust_users,
      suspicious_patterns,
      missing_evidence: missing_evidence,
    };
  }

  private containsSuspicious(text: string): boolean {
    const suspicious = ['bit.ly', 'tinyurl', 'wallet connect', 'send 0x', 'guaranteed'];
    return suspicious.some(p => text.toLowerCase().includes(p));
  }
}

export const truthChecker = new TruthChecker();
