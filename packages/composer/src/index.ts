// @pulo/composer — Cast composition, rewriting, and draft management

import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CastStyle = 'sharp' | 'founder' | 'technical' | 'funny' | 'concise' | 'thread';
export type DraftStatus = 'draft' | 'approved' | 'published' | 'ignored';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ComposerOptions {
  style?: CastStyle;
  tone?: 'balanced' | 'formal' | 'casual' | 'witty';
  language?: 'en' | 'tr';
}

export interface RewriteVariant {
  text: string;
  style: CastStyle;
  score: number;
  reasoning: string;
}

export interface ThreadPost {
  text: string;
  index: number;
  isHook: boolean;
}

export interface Thread {
  posts: ThreadPost[];
  totalLength: number;
  hook: string;
}

export interface CastRating {
  score: number; // 1-10
  critique: string;
  suggestions: string[];
  hookScore: number;
  clarityScore: number;
  engagementScore: number;
  riskFlags: string[];
}

export interface HookSuggestion {
  hook: string;
  type: 'question' | 'statement' | 'number' | 'controversy' | 'emoji';
  score: number;
  reasoning: string;
}

export interface ChannelRecommendation {
  channel: string;
  relevance: number;
  reason: string;
  followerCount?: number;
}

export interface PublishCheck {
  safe: boolean;
  riskLevel: RiskLevel;
  issues: string[];
  warnings: string[];
}

export interface Draft {
  id: string;
  text: string;
  status: DraftStatus;
  score: number | null;
  reason: string | null;
  sourceCastHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

// ─── Rewrite Agent ───────────────────────────────────────────────────────────

const REWRITE_PROMPTS: Record<CastStyle, string> = {
  sharp: 'Make this cast sharper, more punchy, with a stronger hook. Remove filler words.',
  founder: 'Rewrite in a founder/CEO voice — confident, direct, opinionated, no corporate speak.',
  technical: 'Rewrite with technical precision, include specific details, metrics, or code references.',
  funny: 'Add humor, wit, or a clever twist. Keep it authentic, not forced.',
  concise: 'Cut to the essence. Every word must earn its place. Max clarity, min words.',
  thread: 'Transform into a thread opener with compelling hook.',
};

export class CastRewriteAgent {
  async rewrite(text: string, style: CastStyle): Promise<RewriteVariant> {
    const baseScore = this.calculateBaseScore(text);
    const reasoning = REWRITE_PROMPTS[style];

    const rewritten = this.applyStyle(text, style);

    return {
      text: rewritten,
      style,
      score: baseScore + (style === 'concise' ? 5 : style === 'sharp' ? 3 : 0),
      reasoning,
    };
  }

  async rewriteMultiple(text: string, styles: CastStyle[]): Promise<RewriteVariant[]> {
    return Promise.all(styles.map(style => this.rewrite(text, style)));
  }

  private applyStyle(text: string, style: CastStyle): string {
    // Simple style transformations
    switch (style) {
      case 'sharp':
        return this.makeSharp(text);
      case 'founder':
        return this.makeFounderStyle(text);
      case 'technical':
        return this.makeTechnical(text);
      case 'funny':
        return this.makeFunny(text);
      case 'concise':
        return this.makeConcise(text);
      case 'thread':
        return this.makeThreadHook(text);
      default:
        return text;
    }
  }

  private makeSharp(text: string): string {
    // Remove weak phrases, add punch
    let result = text
      .replace(/I think that/gi, '')
      .replace(/basically/gi, '')
      .replace(/really very/gi, 'very')
      .replace(/\s+/g, ' ')
      .trim();

    if (!result.endsWith('.') && !result.endsWith('!') && !result.endsWith('?')) {
      result += '.';
    }
    return result;
  }

  private makeFounderStyle(text: string): string {
    // Confident, direct, opinionated
    let result = text
      .replace(/might probably/gi, 'will')
      .replace(/could potentially/gi, 'will')
      .replace(/I believe that/gi, '')
      .trim();

    if (!result.endsWith('.') && !result.endsWith('!') && !result.endsWith('?')) {
      result += '.';
    }
    return result;
  }

  private makeTechnical(text: string): string {
    // Add precision
    const words = text.split(' ');
    if (words.length > 8) {
      return text + ' [specify metrics, numbers, or concrete details].';
    }
    return text;
  }

  private makeFunny(text: string): string {
    // Add a wit marker (mock mode)
    const witOptions = [
      ' (this is not financial advice)',
      ' *chef\'s kiss*',
      ' 🧵',
      ' cc: @everyone',
    ];
    return text + witOptions[Math.floor(Math.random() * witOptions.length)];
  }

  private makeConcise(text: string): string {
    // Aggressive cutting
    const words = text.split(' ').filter(w => w.length > 0);
    if (words.length <= 10) return text;

    // Take first 10 words and make them count
    return words.slice(0, 10).join(' ') + '.';
  }

  private makeThreadHook(text: string): string {
    // Create compelling thread opener
    if (text.length > 100) {
      return text.substring(0, 97) + '...';
    }
    return text;
  }

  private calculateBaseScore(text: string): number {
    const length = text.split(/\s+/).length;
    const hasQuestion = text.includes('?');
    const hasNumbers = /\d/.test(text);
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(text);

    let score = 6; // Base

    if (length >= 5 && length <= 20) score += 2;
    if (hasQuestion) score += 1;
    if (hasNumbers) score += 0.5;
    if (hasEmoji) score += 0.5;

    return Math.min(10, score);
  }
}

// ─── Thread Builder Agent ─────────────────────────────────────────────────────

export class ThreadBuilderAgent {
  async buildThread(text: string, postCount: number = 5): Promise<Thread> {
    const words = text.split(/\s+/);
    const hook = this.generateHook(text);

    const posts: ThreadPost[] = [];
    const wordsPerPost = Math.ceil(words.length / postCount);

    for (let i = 0; i < postCount; i++) {
      const start = i * wordsPerPost;
      const end = Math.min(start + wordsPerPost, words.length);
      const postWords = words.slice(start, end);

      posts.push({
        text: postWords.join(' ') + (i === 0 ? '' : '.'),
        index: i,
        isHook: i === 0,
      });
    }

    return {
      posts,
      totalLength: text.length,
      hook,
    };
  }

  private generateHook(text: string): string {
    const words = text.split(/\s+/).slice(0, 8);
    return words.join(' ') + (text.length > 50 ? '...' : '');
  }
}

// ─── Hook Scorer ─────────────────────────────────────────────────────────────

export class HookScorer {
  async score(text: string): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 5;

    // Length check
    if (text.length < 20) {
      score -= 1;
      factors.push('Too short to be effective');
    } else if (text.length >= 20 && text.length <= 100) {
      score += 2;
      factors.push('Good hook length');
    } else if (text.length > 200) {
      score -= 1;
      factors.push('May get cut off in feeds');
    }

    // Start with question
    if (text.trim().startsWith('?')) {
      score += 1.5;
      factors.push('Starts with question');
    }

    // Starts with number
    if (/^\d/.test(text)) {
      score += 1;
      factors.push('Numbers catch attention');
    }

    // Contains controversy
    if (this.hasControversy(text)) {
      score += 1;
      factors.push('Contains potentially controversial element');
    }

    // Has emoji
    if (/[\u{1F300}-\u{1F9FF}]/u.test(text)) {
      score += 0.5;
      factors.push('Uses emoji');
    }

    // All caps check
    if (text === text.toUpperCase() && text.length > 5) {
      score -= 0.5;
      factors.push('Avoid excessive caps');
    }

    return { score: Math.max(1, Math.min(10, score)), factors };
  }

  async suggestImprovements(text: string): Promise<HookSuggestion[]> {
    const suggestions: HookSuggestion[] = [
      {
        hook: this.rephraseAsQuestion(text),
        type: 'question',
        score: 8,
        reasoning: 'Questions engage readers',
      },
      {
        hook: this.addNumberHook(text),
        type: 'number',
        score: 7,
        reasoning: 'Numbers break the eye scan',
      },
      {
        hook: this.makeControversial(text),
        type: 'controversy',
        score: 6,
        reasoning: 'Controversy drives engagement',
      },
    ];

    return suggestions.sort((a, b) => b.score - a.score);
  }

  private hasControversy(text: string): boolean {
    const patterns = [/wrong/gi, /terrible/gi, /best|worst/gi, /actually/gi, /surprising/gi];
    return patterns.some(p => p.test(text));
  }

  private rephraseAsQuestion(text: string): string {
    return `Here's the thing about "${text.slice(0, 50)}..." — do you see it too?`;
  }

  private addNumberHook(text: string): string {
    return `3 thoughts on "${text.slice(0, 40)}..."`;
  }

  private makeControversial(text: string): string {
    return `Unpopular opinion: ${text}`;
  }
}

// ─── Channel Recommender ──────────────────────────────────────────────────────

export class ChannelRecommender {
  // Popular Far caster channels for recommendations
  private CHANNELS = [
    { name: 'farcaster', followers: 150000, category: 'general' },
    { name: 'degen', followers: 85000, category: 'trading' },
    { name: 'warrior', followers: 72000, category: 'meme' },
    { name: 'cryptopols', followers: 65000, category: 'gov' },
    { name: 'podcast', followers: 45000, category: 'audio' },
    { name: 'music', followers: 42000, category: 'art' },
    { name: 'design', followers: 38000, category: 'creative' },
    { name: 'photography', followers: 35000, category: 'art' },
    { name: 'dev', followers: 32000, category: 'tech' },
    { name: 'fc20', followers: 28000, category: 'tokens' },
    { name: 'protocols', followers: 25000, category: 'tech' },
    { name: '风险投资', followers: 22000, category: 'vc' },
    { name: 'solana', followers: 18000, category: 'chain' },
    { name: 'nft', followers: 15000, category: 'collectibles' },
  ];

  async recommend(text: string): Promise<ChannelRecommendation[]> {
    const keywords = this.extractKeywords(text);
    const scored = this.CHANNELS.map(ch => ({
      channel: ch.name,
      relevance: this.calculateRelevance(ch, keywords),
      reason: this.explainRelevance(ch, keywords),
      followerCount: ch.followers,
    }));

    return scored
      .filter(c => c.relevance > 0.2)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
  }

  private calculateRelevance(channel: typeof this.CHANNELS[0], keywords: string[]): number {
    const categoryKeywords: Record<string, string[]> = {
      trading: ['trade', 'buy', 'sell', 'degen', 'trade', 'swap', 'yield', 'farm'],
      tech: ['code', 'dev', 'build', 'protocol', 'api', 'contract', 'defi', 'web3'],
      gov: ['vote', 'proposal', 'governance', 'dao', 'delegate'],
      art: ['art', 'creative', 'design', 'photo', 'music', 'nft'],
      chain: ['solana', 'chain', 'token', 'sol'],
      collectibles: ['nft', 'collection', 'art', 'rare', 'mint'],
      vc: ['fund', 'invest', 'raise', 'venture', 'cap table'],
      general: [],
    };

    const catWords = categoryKeywords[channel.category] || [];
    const matches = keywords.filter(k => catWords.includes(k));
    return matches.length / Math.max(keywords.length, 1);
  }

  private explainRelevance(channel: typeof this.CHANNELS[0], keywords: string[]): string {
    const catWords: Record<string, string[]> = {
      trading: ['trading', 'defi'],
      tech: ['devel', 'protocol', 'code'],
      gov: ['governance', 'dao'],
      art: ['creative'],
      chain: ['solana'],
      collectibles: ['nft'],
      vc: ['fund', 'invest'],
      general: ['general'],
    };

    const words = catWords[channel.category] || [];
    const matches = keywords.filter(k => words.some(w => k.includes(w)));
    return matches.length > 0
      ? `Matches: ${matches.join(', ')}`
      : `Popular ${channel.category} channel`;
  }
}

// ─── Publish Safety Check ─────────────────────────────────────────────────────

export class PublishSafetyCheck {
  private SPAM_PATTERNS = [
    /buy now/i,
    /click here/i,
    /limited time/i,
    /act now/i,
    /guaranteed/i,
    /make money fast/i,
    /100[\s-]?% free/i,
  ];

  private RISK_PHRASES = [
    /wrong without context/gi,
    /not financial advice/gi,
    /dyor/gi,
    /this is not advice/gi,
  ];

  async check(text: string): Promise<PublishCheck> {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check for spam patterns
    for (const pattern of this.SPAM_PATTERNS) {
      if (pattern.test(text)) {
        issues.push('Detected spam-like language');
      }
    }

    // Check for risk phrases (not blocking but warnings)
    for (const pattern of this.RISK_PHRASES) {
      if (pattern.test(text)) {
        warnings.push('Contains disclaimer language');
      }
    }

    // Check length
    if (text.length > 320) {
      warnings.push('Cast may be truncated in some clients');
    }

    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3 && text.length > 10) {
      warnings.push('High ratio of capital letters may appear as shouting');
    }

    // Check for suspicious links
    if (/https?:\/\/[^\s]+/gi.test(text)) {
      warnings.push('Contains link - ensure it\'s safe');
    }

    const safe = issues.length === 0;

    return {
      safe,
      riskLevel: issues.length > 0 ? 'high' : warnings.length > 0 ? 'medium' : 'low',
      issues,
      warnings,
    };
  }
}

// ─── Cast Rating Agent ───────────────────────────────────────────────────────

export class CastRatingAgent {
  async rate(text: string): Promise<CastRating> {
    const scores = this.calculateScores(text);
    const riskFlags = this.identifyRiskFlags(text);

    const avgScore = (scores.hook + scores.clarity + scores.engagement) / 3;

    return {
      score: Math.round(avgScore * 10) / 10,
      critique: this.generateCritique(text, scores),
      suggestions: this.generateSuggestions(text, scores),
      hookScore: scores.hook,
      clarityScore: scores.clarity,
      engagementScore: scores.engagement,
      riskFlags,
    };
  }

  private calculateScores(text: string): { hook: number; clarity: number; engagement: number } {
    const words = text.split(/\s+/);

    // Hook score
    let hook = 5;
    if (text.length >= 20 && text.length <= 100) hook += 2;
    if (/^\d/.test(text)) hook += 1;
    if (text.includes('?')) hook += 1;
    if (/[\u{1F300}-\u{1F9FF}]/u.test(text)) hook += 0.5;

    // Clarity score
    let clarity = 5;
    if (words.length >= 5 && words.length <= 30) clarity += 2;
    if (!text.includes(',') && words.length > 20) clarity -= 1; // Run-on

    // Engagement score
    let engagement = 5;
    if (this.hasControversy(text)) engagement += 1.5;
    if (this.isQuestion(text)) engagement += 1;
    if (words.length <= 10) engagement += 0.5;

    return {
      hook: Math.max(1, Math.min(10, hook)),
      clarity: Math.max(1, Math.min(10, clarity)),
      engagement: Math.max(1, Math.min(10, engagement)),
    };
  }

  private hasControversy(text: string): boolean {
    return /wrong|terrible|best|worst|actually|surprising/i.test(text);
  }

  private isQuestion(text: string): boolean {
    return text.includes('?');
  }

  private identifyRiskFlags(text: string): string[] {
    const flags: string[] = [];

    if (/buy|sell|trade/i.test(text) && /guarantee|promise/i.test(text)) {
      flags.push('Financial guarantee language');
    }

    if (/dm|message me|contact/i.test(text) && /money|bitcoin|eth/i.test(text)) {
      flags.push('Potential scam outreach pattern');
    }

    if (/100[\s-]?%/i.test(text)) {
      flags.push('Absolute percentage claim');
    }

    return flags;
  }

  private generateCritique(text: string, scores: { hook: number; clarity: number; engagement: number }): string {
    const parts: string[] = [];

    if (scores.hook < 6) parts.push('Hook could be stronger');
    if (scores.clarity < 6) parts.push('Consider breaking into shorter sentences');
    if (scores.engagement < 6) parts.push('Could generate more engagement');

    if (parts.length === 0) parts.push('Solid cast overall');

    return parts.join('. ') + '.';
  }

  private generateSuggestions(text: string, scores: { hook: number; clarity: number; engagement: number }): string[] {
    const suggestions: string[] = [];

    if (scores.hook < 7) suggestions.push('Start with a question or bold statement');
    if (scores.clarity < 7) suggestions.push('Use fewer, more direct sentences');
    if (scores.engagement < 7) suggestions.push('Add a call-to-action or question');

    if (text.length > 200) suggestions.push('Consider trimming for readability');
    if (!/[?!.]$/.test(text)) suggestions.push('End with a question or call to action');

    return suggestions;
  }
}

// ─── Translation ─────────────────────────────────────────────────────────────

export async function translateText(text: string, targetLang: 'en' | 'tr'): Promise<string> {
  // Mock translation for demo
  if (targetLang === 'tr') {
    // Very basic mock - in production use proper translation API
    return `[TR] ${text}`;
  }
  return text.replace(/^\[TR\] /, '');
}

// ─── Draft Queue ─────────────────────────────────────────────────────────────

export interface DraftStore {
  getAll(): Promise<Draft[]>;
  getById(id: string): Promise<Draft | null>;
  create(draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft>;
  update(id: string, updates: Partial<Draft>): Promise<Draft | null>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryDraftStore implements DraftStore {
  private drafts: Map<string, Draft> = new Map();

  async getAll(): Promise<Draft[]> {
    return Array.from(this.drafts.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getById(id: string): Promise<Draft | null> {
    return this.drafts.get(id) || null;
  }

  async create(data: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft> {
    const id = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const draft: Draft = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.drafts.set(id, draft);
    return draft;
  }

  async update(id: string, updates: Partial<Draft>): Promise<Draft | null> {
    const existing = this.drafts.get(id);
    if (!existing) return null;

    const updated: Draft = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.drafts.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.drafts.delete(id);
  }
}

// Singleton instance
let _draftStore: DraftStore | null = null;

export function getDraftStore(): DraftStore {
  if (!_draftStore) {
    _draftStore = new InMemoryDraftStore();
  }
  return _draftStore;
}

export function resetDraftStore(): void {
  _draftStore = null;
}