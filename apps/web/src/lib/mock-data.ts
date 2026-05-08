// MOCK DATA - All sections marked with [MOCK] in UI
// This file contains seed data for development. Replace with real API calls in production.

export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise';
export type SystemStatus = 'operational' | 'degraded' | 'down' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Verdict = 'true' | 'false' | 'unverified' | 'misleading';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  plan: PlanTier;
  farcasterId?: number;
  email?: string;
  createdAt: string;
}

export interface Trend {
  id: string;
  title: string;
  category: 'airdrop' | 'grant' | 'reward' | 'program' | 'news' | 'hack';
  mentions: number;
  velocity: number;
  sentiment: number;
  firstMentioned: string;
  lastMentioned: string;
  sources: number;
  status: 'active' | 'pending' | 'approved' | 'rejected';
  sparkline?: number[];
}

export interface TruthCheck {
  id: string;
  claim: string;
  verdict: Verdict;
  confidence: number;
  sources: { name: string; url: string; credibility: number }[];
  analyzedAt: string;
  caster?: string;
  castHash?: string;
}

export interface Alert {
  id: string;
  type: 'trend' | 'safety' | 'mention' | 'system' | 'billing';
  title: string;
  description: string;
  severity: RiskLevel;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface AgentRun {
  id: string;
  agentType: 'truth' | 'radar' | 'reply' | 'alert';
  status: 'running' | 'completed' | 'failed' | 'timeout';
  startedAt: string;
  completedAt?: string;
  input: string;
  output?: string;
  error?: string;
  duration?: number;
}

export interface SafetyFlag {
  id: string;
  type: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other';
  severity: RiskLevel;
  description: string;
  reporter: string;
  createdAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
  castHash?: string;
}

export interface UsageData {
  castsUsed: number;
  castsLimit: number;
  truthChecksUsed: number;
  truthChecksLimit: number;
  trendsTracked: number;
  trendsLimit: number;
  periodEnd: string;
}

export interface SystemHealth {
  worker: { id: string; status: SystemStatus; latency: number }[];
  api: { endpoint: string; status: SystemStatus; latency: number }[];
  db: { status: SystemStatus; connections: number; latency: number };
  redis: { status: SystemStatus; memory: number; connections: number };
  lastWebhook: string;
}

// MOCK USER DATA
export const mockUser: User = {
  id: 'user_1',
  username: 'faruser',
  displayName: 'Farcaster User',
  plan: 'pro',
  farcasterId: 12345,
  email: 'user@farcaster.xyz',
  createdAt: '2024-01-15T00:00:00Z',
};

// MOCK USAGE DATA
export const mockUsage: UsageData = {
  castsUsed: 47,
  castsLimit: 50,
  truthChecksUsed: 12,
  truthChecksLimit: 100,
  trendsTracked: 8,
  trendsLimit: 50,
  periodEnd: '2026-05-08T23:59:59Z',
};

// MOCK TRENDS
export const mockTrends: Trend[] = [
  {
    id: 'trend_1',
    title: 'Farcaster Open Graph Update',
    category: 'news',
    mentions: 2847,
    velocity: 156,
    sentiment: 0.78,
    firstMentioned: '2026-05-07T08:00:00Z',
    lastMentioned: '2026-05-08T10:30:00Z',
    sources: 23,
    status: 'active',
    sparkline: [12, 28, 45, 67, 89, 120, 156],
  },
  {
    id: 'trend_2',
    title: 'Ethereum Foundation Grant Program',
    category: 'grant',
    mentions: 1923,
    velocity: 89,
    sentiment: 0.72,
    firstMentioned: '2026-05-06T14:00:00Z',
    lastMentioned: '2026-05-08T09:15:00Z',
    sources: 15,
    status: 'active',
    sparkline: [8, 15, 32, 48, 67, 78, 89],
  },
  {
    id: 'trend_3',
    title: 'LayerZero Airdrop Season 2',
    category: 'airdrop',
    mentions: 8921,
    velocity: 234,
    sentiment: 0.65,
    firstMentioned: '2026-05-05T20:00:00Z',
    lastMentioned: '2026-05-08T11:00:00Z',
    sources: 67,
    status: 'pending',
    sparkline: [45, 78, 123, 167, 198, 215, 234],
  },
  {
    id: 'trend_4',
    title: 'Uniswap DEX Rewards Program',
    category: 'reward',
    mentions: 1567,
    velocity: 45,
    sentiment: 0.81,
    firstMentioned: '2026-05-07T10:00:00Z',
    lastMentioned: '2026-05-08T08:00:00Z',
    sources: 12,
    status: 'approved',
    sparkline: [5, 12, 23, 31, 38, 42, 45],
  },
  {
    id: 'trend_5',
    title: 'OpenSea Royalty Suite Launch',
    category: 'program',
    mentions: 892,
    velocity: 28,
    sentiment: 0.54,
    firstMentioned: '2026-05-07T16:00:00Z',
    lastMentioned: '2026-05-08T07:30:00Z',
    sources: 8,
    status: 'active',
    sparkline: [3, 8, 14, 19, 24, 27, 28],
  },
];

// MOCK TRUTH CHECKS
export const mockTruthChecks: TruthCheck[] = [
  {
    id: 'truth_1',
    claim: 'Ethereum is switching to proof-of-stake',
    verdict: 'true',
    confidence: 0.94,
    sources: [
      { name: 'Ethereum Foundation', url: 'https://ethereum.org', credibility: 0.98 },
      { name: 'CoinDesk', url: 'https://coindesk.com', credibility: 0.85 },
    ],
    analyzedAt: '2026-05-08T09:30:00Z',
    caster: 'vitalik.eth',
  },
  {
    id: 'truth_2',
    claim: 'Bitcoin max supply is 21 million coins',
    verdict: 'true',
    confidence: 0.99,
    sources: [
      { name: 'Bitcoin Whitepaper', url: 'https://bitcoin.org/bitcoin.pdf', credibility: 0.99 },
      { name: 'Blockchain.com', url: 'https://blockchain.com', credibility: 0.92 },
    ],
    analyzedAt: '2026-05-08T08:15:00Z',
    caster: 'nakamoto_fan',
  },
  {
    id: 'truth_3',
    claim: 'Uniswap has processed $1 trillion in volume',
    verdict: 'misleading',
    confidence: 0.67,
    sources: [
      { name: 'Uniswap Labs', url: 'https://uniswap.org', credibility: 0.88 },
    ],
    analyzedAt: '2026-05-07T22:00:00Z',
    caster: 'defi_king',
  },
  {
    id: 'truth_4',
    claim: 'ETH merge happened in September 2022',
    verdict: 'true',
    confidence: 0.97,
    sources: [
      { name: 'Ethereum Foundation', url: 'https://ethereum.org', credibility: 0.98 },
      { name: 'The Verge', url: 'https://theverge.com', credibility: 0.78 },
    ],
    analyzedAt: '2026-05-07T18:00:00Z',
    caster: 'eth_maximalist',
  },
  {
    id: 'truth_5',
    claim: 'All DeFi protocols are audited',
    verdict: 'false',
    confidence: 0.88,
    sources: [
      { name: 'DeFi Llama', url: 'https://defillama.com', credibility: 0.82 },
    ],
    analyzedAt: '2026-05-07T14:00:00Z',
    caster: 'security_researcher',
  },
];

// MOCK ALERTS
export const mockAlerts: Alert[] = [
  {
    id: 'alert_1',
    type: 'trend',
    title: 'New airdrop detected: LayerZero Season 2',
    description: 'LayerZero airdrop hype is growing rapidly. Velocity increasing.',
    severity: 'medium',
    read: false,
    createdAt: '2026-05-08T10:30:00Z',
    actionUrl: '/dashboard/radar/trend_3',
  },
  {
    id: 'alert_2',
    type: 'mention',
    title: 'You were mentioned by vitalik.eth',
    description: '@faruser thanks for the detailed truth check on my claim!',
    severity: 'low',
    read: false,
    createdAt: '2026-05-08T09:45:00Z',
    actionUrl: '/dashboard/inbox',
  },
  {
    id: 'alert_3',
    type: 'safety',
    title: 'Potential misinformation detected',
    description: 'High-velocity claim about token launch may be misleading.',
    severity: 'high',
    read: true,
    createdAt: '2026-05-08T08:00:00Z',
    actionUrl: '/dashboard/truth/truth_suspicious',
  },
  {
    id: 'alert_4',
    type: 'system',
    title: 'API response time degraded',
    description: 'P95 latency exceeded threshold (850ms vs 200ms target).',
    severity: 'medium',
    read: true,
    createdAt: '2026-05-07T22:00:00Z',
    actionUrl: '/admin/system',
  },
  {
    id: 'alert_5',
    type: 'billing',
    title: 'Usage at 94% of daily limit',
    description: 'You have used 47 of 50 casts today. Upgrade for more.',
    severity: 'low',
    read: false,
    createdAt: '2026-05-08T11:00:00Z',
    actionUrl: '/dashboard/billing',
  },
];

// MOCK AGENT RUNS
export const mockAgentRuns: AgentRun[] = [
  {
    id: 'run_1',
    agentType: 'truth',
    status: 'completed',
    startedAt: '2026-05-08T10:28:00Z',
    completedAt: '2026-05-08T10:28:45Z',
    input: 'Is Ethereum switching to proof-of-stake?',
    output: 'VERDICT: true (94% confidence)',
    duration: 45,
  },
  {
    id: 'run_2',
    agentType: 'radar',
    status: 'completed',
    startedAt: '2026-05-08T10:25:00Z',
    completedAt: '2026-05-08T10:25:23Z',
    input: 'Scan for new airdrops',
    output: 'Found 3 new trends',
    duration: 23,
  },
  {
    id: 'run_3',
    agentType: 'reply',
    status: 'failed',
    startedAt: '2026-05-08T10:20:00Z',
    completedAt: '2026-05-08T10:21:00Z',
    input: 'Help me reply to this cast...',
    error: 'Rate limit exceeded',
    duration: 60,
  },
  {
    id: 'run_4',
    agentType: 'truth',
    status: 'running',
    startedAt: '2026-05-08T10:30:00Z',
    input: 'Check this claim about Bitcoin max supply',
  },
  {
    id: 'run_5',
    agentType: 'alert',
    status: 'completed',
    startedAt: '2026-05-08T10:15:00Z',
    completedAt: '2026-05-08T10:15:08Z',
    input: 'Check safety flags',
    output: '3 new flags, 1 critical',
    duration: 8,
  },
];

// MOCK SAFETY FLAGS
export const mockSafetyFlags: SafetyFlag[] = [
  {
    id: 'safety_1',
    type: 'misinformation',
    severity: 'high',
    description: 'Claim about token presale with guaranteed returns',
    reporter: 'automated',
    createdAt: '2026-05-08T09:00:00Z',
    status: 'pending',
    castHash: '0x1234...abcd',
  },
  {
    id: 'safety_2',
    type: 'spam',
    severity: 'medium',
    description: 'Repetitive promotional casts from same user',
    reporter: 'user_report',
    createdAt: '2026-05-08T08:30:00Z',
    status: 'pending',
  },
  {
    id: 'safety_3',
    type: 'harassment',
    severity: 'critical',
    description: 'Coordinated harassment campaign against project team',
    reporter: 'user_report',
    createdAt: '2026-05-08T07:00:00Z',
    status: 'resolved',
  },
  {
    id: 'safety_4',
    type: 'copyright',
    severity: 'low',
    description: 'Copyrighted music in cast attachments',
    reporter: 'automated',
    createdAt: '2026-05-07T20:00:00Z',
    status: 'dismissed',
  },
  {
    id: 'safety_5',
    type: 'misinformation',
    severity: 'medium',
    description: 'Fabricated partnership announcement',
    reporter: 'user_report',
    createdAt: '2026-05-07T15:00:00Z',
    status: 'pending',
  },
];

// MOCK SYSTEM HEALTH
export const mockSystemHealth: SystemHealth = {
  worker: [
    { id: 'worker_1', status: 'operational', latency: 45 },
    { id: 'worker_2', status: 'operational', latency: 52 },
    { id: 'worker_3', status: 'degraded', latency: 180 },
    { id: 'worker_4', status: 'operational', latency: 38 },
  ],
  api: [
    { endpoint: '/api/truth', status: 'operational', latency: 120 },
    { endpoint: '/api/radar', status: 'operational', latency: 85 },
    { endpoint: '/api/alerts', status: 'operational', latency: 65 },
    { endpoint: '/api/mentions', status: 'degraded', latency: 450 },
  ],
  db: { status: 'operational', connections: 24, latency: 12 },
  redis: { status: 'operational', memory: 67, connections: 8 },
  lastWebhook: '2026-05-08T10:29:55Z',
};

// MOCK DASHBOARD DATA
export const mockDashboardData = {
  status: 'operational' as SystemStatus,
  lastCheck: '2026-05-08T10:30:00Z',
  user: mockUser,
  usage: mockUsage,
  pendingDrafts: 3,
  recentAlerts: mockAlerts.slice(0, 5),
  activeTrends: mockTrends.slice(0, 3),
  recentTruthChecks: mockTruthChecks.slice(0, 3),
  safetyNotices: 2,
};

// MOCK ADMIN DATA
export const mockAdminData = {
  workerHealth: mockSystemHealth.worker,
  apiHealth: mockSystemHealth.api,
  dbHealth: mockSystemHealth.db,
  redisHealth: mockSystemHealth.redis,
  lastWebhookEvents: mockAgentRuns.slice(0, 10),
  failedAgentRuns: mockAgentRuns.filter((r) => r.status === 'failed'),
  pendingTrendApprovals: mockTrends.filter((t) => t.status === 'pending').length,
  safetyFlags: mockSafetyFlags.filter((f) => f.status === 'pending').length,
  technicalDebtCount: 12,
};

// MOCK INBOX MESSAGES
export const mockInboxMessages = [
  {
    id: 'msg_1',
    type: 'mention',
    from: 'vitalik.eth',
    content: '@faruser thanks for the truth check!',
    castHash: '0xabcd...1234',
    timestamp: '2026-05-08T09:45:00Z',
    read: false,
  },
  {
    id: 'msg_2',
    type: 'reply',
    from: 'defi_teacher',
    content: 'Great analysis on the Uniswap topic',
    castHash: '0xdef0...5678',
    timestamp: '2026-05-08T08:30:00Z',
    read: true,
  },
  {
    id: 'msg_3',
    type: 'mention',
    from: 'anon_user',
    content: '@pulo check this claim',
    castHash: '0x9876...abcd',
    timestamp: '2026-05-07T22:00:00Z',
    read: true,
  },
];

// MOCK COMPOSER DATA
export const mockComposerDrafts = [
  {
    id: 'draft_1',
    content: 'I think Ethereum proof-of-stake is a game changer for...',
    createdAt: '2026-05-08T10:00:00Z',
    updatedAt: '2026-05-08T10:15:00Z',
  },
  {
    id: 'draft_2',
    content: 'After researching the LayerZero airdrop, I believe...',
    createdAt: '2026-05-07T18:00:00Z',
    updatedAt: '2026-05-07T18:30:00Z',
  },
  {
    id: 'draft_3',
    content: 'The Uniswap rewards program looks promising because...',
    createdAt: '2026-05-07T14:00:00Z',
    updatedAt: '2026-05-07T14:00:00Z',
  },
];

// MOCK TECHNICAL DEBT
export const mockTechnicalDebt = [
  { id: 'td_1', title: 'Migrate from REST to GraphQL', priority: 'high', category: 'api', estimatedHours: 40 },
  { id: 'td_2', title: 'Add comprehensive error handling', priority: 'medium', category: 'backend', estimatedHours: 24 },
  { id: 'td_3', title: 'Implement proper caching layer', priority: 'medium', category: 'performance', estimatedHours: 16 },
  { id: 'td_4', title: 'Add unit tests for core agents', priority: 'high', category: 'testing', estimatedHours: 32 },
  { id: 'td_5', title: 'Database indexing optimization', priority: 'low', category: 'database', estimatedHours: 8 },
  { id: 'td_6', title: 'Documentation cleanup', priority: 'low', category: 'docs', estimatedHours: 12 },
];

// MOCK EVENT LOG
export const mockEventLog = [
  { id: 'evt_1', type: 'mention_received', timestamp: '2026-05-08T10:29:55Z', data: { from: 'vitalik.eth' } },
  { id: 'evt_2', type: 'truth_check_completed', timestamp: '2026-05-08T10:28:45Z', data: { claim: 'ETH POS' } },
  { id: 'evt_3', type: 'alert_triggered', timestamp: '2026-05-08T10:25:00Z', data: { alertId: 'alert_1' } },
  { id: 'evt_4', type: 'trend_detected', timestamp: '2026-05-08T10:20:00Z', data: { trendId: 'trend_3' } },
  { id: 'evt_5', type: 'agent_run_failed', timestamp: '2026-05-08T10:21:00Z', data: { runId: 'run_3' } },
  { id: 'evt_6', type: 'user_signup', timestamp: '2026-05-08T09:00:00Z', data: { userId: 'user_2' } },
  { id: 'evt_7', type: 'plan_upgraded', timestamp: '2026-05-08T08:30:00Z', data: { userId: 'user_3', plan: 'pro' } },
  { id: 'evt_8', type: 'api_rate_limited', timestamp: '2026-05-08T07:45:00Z', data: { endpoint: '/api/mentions' } },
  { id: 'evt_9', type: 'cache_cleared', timestamp: '2026-05-08T06:00:00Z', data: {} },
  { id: 'evt_10', type: 'backup_completed', timestamp: '2026-05-08T00:00:00Z', data: {} },
];

// MOCK USERS (Admin)
interface MockUser {
  id: string;
  username: string;
  plan: PlanTier;
  castsUsed: number;
  castsLimit: number;
  status: string;
  createdAt: string;
}

export const mockUsers: MockUser[] = [
  { id: 'user_1', username: 'faruser', plan: 'pro', castsUsed: 47, castsLimit: 50, status: 'active', createdAt: '2024-01-15' },
  { id: 'user_2', username: 'defi_king', plan: 'team', castsUsed: 234, castsLimit: 500, status: 'active', createdAt: '2024-02-20' },
  { id: 'user_3', username: 'eth_maximalist', plan: 'free', castsUsed: 12, castsLimit: 50, status: 'active', createdAt: '2024-03-10' },
  { id: 'user_4', username: 'anon_trader', plan: 'pro', castsUsed: 89, castsLimit: 50, status: 'active', createdAt: '2024-04-05' },
  { id: 'user_5', username: 'new_user', plan: 'free', castsUsed: 5, castsLimit: 50, status: 'pending', createdAt: '2026-05-08' },
];

// MOCK BILLING PLANS
export const mockPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['50 casts/day', '5 truth checks/day', 'Basic radar', 'Community support'],
    limits: { casts: 50, truthChecks: 5, trendsTracked: 10 },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    features: ['200 casts/day', '50 truth checks/day', 'Full radar', 'Priority support', 'Custom alerts'],
    limits: { casts: 200, truthChecks: 50, trendsTracked: 50 },
    popular: true,
  },
  {
    id: 'team',
    name: 'Team',
    price: 29,
    features: ['1000 casts/day', '200 truth checks/day', 'Team features', 'API access', 'Dedicated support'],
    limits: { casts: 1000, truthChecks: 200, trendsTracked: 200 },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    features: ['Unlimited casts', 'Unlimited truth checks', 'Custom integrations', 'SLA guarantee', 'Account manager'],
    limits: { casts: -1, truthChecks: -1, trendsTracked: -1 },
  },
];
