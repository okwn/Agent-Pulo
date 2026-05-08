// radar/src/types.ts — Core types for PULO Radar

export type RadarCategory =
  | 'claim'
  | 'reward_program'
  | 'token_launch'
  | 'airdrop'
  | 'grant'
  | 'hackathon'
  | 'scam_warning'
  | 'social_trend'
  | 'unknown';

export type RadarRiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type RadarAdminStatus = 'detected' | 'watching' | 'approved' | 'rejected' | 'alerted' | 'archived';

export const RADAR_CATEGORIES: RadarCategory[] = [
  'claim', 'reward_program', 'token_launch', 'airdrop', 'grant', 'hackathon', 'scam_warning', 'social_trend', 'unknown',
];

export const RADAR_ADMIN_STATUSES: RadarAdminStatus[] = [
  'detected', 'watching', 'approved', 'rejected', 'alerted', 'archived',
];

export const RADAR_RISK_LEVELS: RadarRiskLevel[] = ['low', 'medium', 'high', 'unknown'];

// ─── Default watched channels ────────────────────────────────────────────────

export const DEFAULT_WATCHED_CHANNELS = [
  { channelId: 'base', name: 'Base' },
  { channelId: 'farcaster', name: 'Farcaster' },
  { channelId: 'miniapps', name: 'MiniApps' },
  { channelId: 'builders', name: 'Builders' },
  { channelId: 'crypto', name: 'Crypto' },
  { channelId: 'airdrop', name: 'Airdrop' },
  { channelId: 'token', name: 'Token' },
];

// ─── Default keywords ─────────────────────────────────────────────────────────

export const DEFAULT_KEYWORDS = {
  en: [
    'claim', 'airdrop', 'reward', 'rewards', 'eligibility', 'allocation',
    'snapshot', 'points', 'season', 'quest', 'mint', 'allowlist',
    'token', 'drop', 'grant', 'builder program', 'retro funding',
  ],
  tr: [
    'ödül', 'uygunluk', 'puan', 'görev', 'kampanya', 'başvuru', 'hibe',
  ],
};

// ─── Normalized cast for radar processing ───────────────────────────────────

export interface RadarCast {
  castHash: string;
  authorFid: number;
  authorUsername?: string;
  text: string;
  channelId?: string;
  timestamp: string;
  engagementCount?: number;
  recastCount?: number;
  replyCount?: number;
  watchwordMatches: string[];
  normalizedText: string;
}

// ─── Trend ────────────────────────────────────────────────────────────────────

export interface RadarTrend {
  id: string;
  title: string;
  normalizedTitle: string;
  category: RadarCategory;
  keywords: string[];
  score: number;
  velocity: number;
  riskLevel: RadarRiskLevel;
  confidence: number;
  adminStatus: RadarAdminStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceCount: number;
  castCount: number;
  trustedAuthorCount: number;
  summary: string;
  metadata: Record<string, unknown>;
}

// ─── Trend scoring breakdown ───────────────────────────────────────────────────

export interface TrendScoreBreakdown {
  volume_score: number;
  velocity_score: number;
  unique_author_score: number;
  trusted_author_score: number;
  engagement_score: number;
  channel_relevance_score: number;
  onchain_or_official_confirmation_score: number;
  spam_score: number;
  scam_risk_score: number;
  total: number;
}

// ─── Risk flags ───────────────────────────────────────────────────────────────

export interface RadarRiskFlag {
  type: 'scam' | 'phishing' | 'spam' | 'engagement_bait' | 'misinformation' | 'suspicious_link' | 'suspicious_claim';
  severity: RadarRiskLevel;
  description: string;
  castHash?: string;
}

// ─── Channel relevance ─────────────────────────────────────────────────────────

export const CHANNEL_RELEVANCE: Record<string, number> = {
  airdrop: 1.0,
  token: 0.9,
  builders: 0.8,
  crypto: 0.8,
  farcaster: 0.7,
  base: 0.7,
  miniapps: 0.6,
};

export const CATEGORY_KEYWORDS: Record<RadarCategory, string[]> = {
  claim: ['claim', 'claiming', 'eligibility', 'eligible', 'allocation', 'qualify'],
  reward_program: ['reward', 'rewards', 'points', 'season', 'quest', 'program'],
  token_launch: ['token', 'launch', 'mint', 'allowlist', 'presale', 'ICO', 'IDO', 'TGE'],
  airdrop: ['airdrop', 'snapshot', 'drop', 'free token', '分配'],
  grant: ['grant', 'funding', 'RFP', 'proposal', 'builder program', 'retro funding', 'hibe', 'başvuru'],
  hackathon: ['hackathon', 'bounty', 'contest', 'prize'],
  scam_warning: ['scam', 'fake', 'phishing', 'warning', '⚠️', '警惕'],
  social_trend: ['trending', 'viral', 'exploding', 'going crazy'],
  unknown: [],
};