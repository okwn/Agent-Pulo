// truth/src/index.ts — Public API for @pulo/truth

// Types
export type {
  Verdict,
  EvidenceItem,
  EvidenceSummary,
  SourceTrustLevel,
  SourceAssessment,
  RiskFlag,
  RiskAssessment,
  ExtractedClaim,
  TruthReport,
  TruthCheckContext,
  TruthCheckIntent,
} from './types.js';

export {
  TRUTH_CHECK_PATTERNS,
  VERDICTS,
  formatVerdictLabel,
  MAX_PUBLIC_REPLY_LENGTH,
} from './types.js';

// Intent Detection
export { TruthIntentDetector, truthIntentDetector } from './intent-detector.js';

// Components
export { ClaimExtractor, claimExtractor } from './claim-extractor.js';
export { EvidenceCollector, createEvidenceCollector } from './evidence-collector.js';
export { ReplyCommentAnalyzer, replyCommentAnalyzer, type ReplyAnalysis } from './reply-comment-analyzer.js';
export { SourceTrustScorer, sourceTrustScorer } from './source-trust-scorer.js';
export { ContradictionDetector, contradictionDetector, type ContradictionResult } from './contradiction-detector.js';
export { ScamSignalDetector, scamSignalDetector } from './scam-signal-detector.js';
export { TruthVerdictEngine, truthVerdictEngine, type VerdictInput } from './verdict-engine.js';
export { TruthReportFormatter, truthReportFormatter } from './report-formatter.js';

// Orchestrator
export { TruthChecker, truthChecker, type TruthCheckerConfig } from './truth-checker.js';

// Search Provider
export type { WebSearchProvider, SearchResult } from './search-provider.js';
export { createSearchProvider, MockSearchProvider } from './search-provider.js';
