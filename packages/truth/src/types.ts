// truth/src/types.ts — Core types for truth analysis

import type { SafetyResult } from '@pulo/safety';

// ─── Verdict Types ────────────────────────────────────────────────────────────

export type Verdict =
  | 'likely_true'
  | 'likely_false'
  | 'mixed'
  | 'unverified'
  | 'scam_risk'
  | 'insufficient_context';

export const VERDICTS: Verdict[] = [
  'likely_true',
  'likely_false',
  'mixed',
  'unverified',
  'scam_risk',
  'insufficient_context',
];

// ─── Evidence Categories ──────────────────────────────────────────────────────

export interface EvidenceItem {
  type: 'cast' | 'web';
  castHash: string;
  authorFid: number;
  authorUsername?: string;
  text: string;
  sentiment?: 'supporting' | 'contradicting' | 'neutral' | 'suspicious';
  isOfficialSource?: boolean;
  isHighTrustUser?: boolean;
  timestamp?: string;
  // web-only fields
  url?: string;
  source?: string;
}

export interface EvidenceSummary {
  supporting_casts: EvidenceItem[];
  contradicting_casts: EvidenceItem[];
  official_sources: EvidenceItem[];
  high_trust_users: EvidenceItem[];
  suspicious_patterns: EvidenceItem[];
  missing_evidence: string[]; // descriptions of evidence that was not found
}

// ─── Source Trust ──────────────────────────────────────────────────────────────

export type SourceTrustLevel = 'official' | 'high_trust' | 'medium_trust' | 'low_trust' | 'unknown';

export interface SourceAssessment {
  level: SourceTrustLevel;
  source: string;
  reason: string;
  confidence: number;
}

// ─── Risk Flags ──────────────────────────────────────────────────────────────

export interface RiskFlag {
  type: 'scam' | 'phishing' | 'spam' | 'engagement_bait' | 'misinformation' | 'manipulation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  castHash?: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  flags: RiskFlag[];
  summary: string;
  score: number; // 0-1
}

// ─── Claim ────────────────────────────────────────────────────────────────────

export interface ExtractedClaim {
  claim: string;
  category: 'factual' | 'opinion' | 'prediction' | 'unstated';
  urgency: 'low' | 'medium' | 'high';
  contextNeeded: string[];
  confidence: number; // how confident we are this is the main claim
  additionalClaims: string[];
}

// ─── Truth Report ─────────────────────────────────────────────────────────────

export interface TruthReport {
  id?: string;
  targetCastHash: string;
  targetCastText: string;
  targetAuthorFid: number;
  claim: ExtractedClaim;
  verdict: Verdict;
  confidence: number; // 0-1
  shortAnswer: string; // 1-2 sentence answer
  dashboardExplanation: string; // 2-3 sentence explanation for dashboard
  evidence: EvidenceSummary;
  riskAssessment: RiskAssessment;
  recommendedAction: 'safe_to_share' | 'verify_first' | 'do_not_share' | 'report' | 'cannot_determine';
  publicReplyText: string;
  sourceCasts: string[]; // cast hashes used as evidence
  sourcesChecked: string[];
  processingTimeMs?: number;
  createdAt: string;
}

// ─── Workflow Context ──────────────────────────────────────────────────────────

export interface TruthCheckContext {
  targetCastHash: string;
  targetCastText: string;
  targetAuthorFid: number;
  userFid?: number; // who triggered the check
  parentThreadHashes: string[];
  replyHashes: string[];
  keywordSearchResults: string[];
  authorProfile?: {
    fid: number;
    username?: string;
    displayName?: string;
    followerCount?: number;
    isActive?: boolean;
  };
}

// ─── Intent Detection ─────────────────────────────────────────────────────────

export interface TruthCheckIntent {
  detected: boolean;
  queryLanguage?: 'en' | 'tr' | 'unknown';
  patterns: string[]; // which patterns matched
  confidence: number;
}

export const TRUTH_CHECK_PATTERNS = {
  en: [
    'is this true',
    'is this real',
    'is this accurate',
    'is this correct',
    'true or false',
    'fact check',
    'fact-check',
    'verify this',
    'can you verify',
    'source check',
    'check this',
    'true?',
    'fake?',
    'real?',
    'accurate?',
    'scam?',
    'legit?',
    'real or fake',
    'true or scam',
  ],
  tr: [
    'bu doğru mu',
    'doğru mu',
    'gerçek mi',
    'doğrul',
    'doğrula',
    'gerçek mi bu',
    'bu gerçek mi',
    'scam mı',
    'sahte mi',
    'source?',
    'claim doğru mu',
    'iddia doğru mu',
    'bu iddia doğru mu',
    'gerçekten doğru mu',
    'kontrol et',
    'incele',
  ],
} as const;

// ─── Reply Style ──────────────────────────────────────────────────────────────

export const MAX_PUBLIC_REPLY_LENGTH = 320;

export function formatVerdictLabel(verdict: Verdict, lang: 'en' | 'tr' | 'unknown' = 'en'): string {
  if (lang === 'tr') {
    switch (verdict) {
      case 'likely_true': return 'Pulo kontrol: Büyük ihtimalle doğru';
      case 'likely_false': return 'Pulo kontrol: Büyük ihtimalle yanlış';
      case 'mixed': return 'Pulo kontrol: Karma';
      case 'unverified': return 'Pulo kontrol: Doğrulanmamış';
      case 'scam_risk': return 'Pulo kontrol: Dolandırıcılık riski';
      case 'insufficient_context': return 'Pulo kontrol: Yetersiz bağlam';
    }
  }
  switch (verdict) {
    case 'likely_true': return 'Pulo check: Likely true';
    case 'likely_false': return 'Pulo check: Likely false';
    case 'mixed': return 'Pulo check: Mixed';
    case 'unverified': return 'Pulo check: Unverified';
    case 'scam_risk': return 'Pulo check: Scam risk';
    case 'insufficient_context': return 'Pulo check: Insufficient context';
  }
}
