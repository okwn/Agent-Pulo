// truth/src/claim-extractor.ts — Extracts verifiable claims from a cast

import { createChildLogger } from '@pulo/observability';
import type { ExtractedClaim } from './types.js';

const log = createChildLogger('claim-extractor');

/**
 * Extracts the single most verifiable claim from a cast.
 * Uses rule-based extraction for now (LLM-powered extraction in future).
 */
export class ClaimExtractor {
  /**
   * Extract claims from a cast's text.
   */
  extract(castText: string): ExtractedClaim {
    const lower = castText.toLowerCase();
    const claims: string[] = [];

    // Extract factual claims using patterns
    const factPatterns = [
      // Token/chain claims
      /(?:ethereum|bitcoin|solana|degen|farcaster|warpscast) (?:switched|changed|migrated|upgraded) to (\w+)/i,
      /(?:token|coin|airdrop|governance) (?:is|was|will be) ([\w\s]+)/i,
      /(?:price|valuation|market cap) (?:is|was|at) (\$?[\d,]+(?:\.\d+)?%?)/i,
      // Protocol claims
      /(?:protocol|network|chain) (?:has|have) ([\w\s]+(?:exploit|vulnerability|upgrade|hard fork))/i,
      /(?:team|company|foundation) (?:announced|revealed|launched) ([\w\s]+)/i,
      // Distribution claims
      /(?:airdrop|claim|distribution|allocation) (?:is|was|will be) ([\w\s\d%]+(?:today|tonight|soon|confirmed))/i,
      // Supply claims
      /(?:total|maximum| circulating) supply (?:is|was) ([\d,]+(?:,?\d{3})*(?: \w+)?)/i,
    ];

    for (const pattern of factPatterns) {
      const match = castText.match(pattern);
      if (match) {
        claims.push(match[0]);
      }
    }

    // If no pattern matched, extract the longest sentence
    if (claims.length === 0) {
      const sentences = castText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences.length > 0) {
        // Pick the most specific sentence (contains numbers, proper nouns, etc.)
        const scored = sentences.map(s => ({
          text: s.trim(),
          score: (s.match(/\d+/g)?.length ?? 0) * 2 + (s.match(/[A-Z][a-z]+/g)?.length ?? 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        claims.push(scored[0]!.text);
      }
    }

    const primaryClaim = claims[0] ?? castText.slice(0, 200);

    return {
      claim: primaryClaim,
      category: this.categorize(primaryClaim),
      urgency: this.assessUrgency(primaryClaim),
      contextNeeded: this.getContextQuestions(primaryClaim),
      confidence: claims.length > 0 ? 0.75 : 0.4,
      additionalClaims: claims.slice(1),
    };
  }

  private categorize(claim: string): ExtractedClaim['category'] {
    const lower = claim.toLowerCase();
    if (/\b(will|预测|预计|price will|will be|will reach)\b/i.test(lower)) return 'prediction';
    if (/\b(i think|i believe|feels|seems|in my opinion)\b/i.test(lower)) return 'opinion';
    if (/\b(is|are|was|were|has|have|does|do)\b/i.test(lower)) return 'factual';
    return 'unstated';
  }

  private assessUrgency(claim: string): ExtractedClaim['urgency'] {
    const lower = claim.toLowerCase();
    if (/\b(urgent|immediate|now|today|tonight|limited time|act now)\b/i.test(lower)) return 'high';
    if (/\b(airdrop|claim|distribution|launch|announcement)\b/i.test(lower)) return 'medium';
    return 'low';
  }

  private getContextQuestions(claim: string): string[] {
    const questions: string[] = [];
    const lower = claim.toLowerCase();

    if (lower.includes('airdrop') || lower.includes('claim')) {
      questions.push('Is there an official announcement from the project?');
      questions.push('What is the official source for this airdrop?');
      questions.push('Is there a suspicious link or wallet request?');
    }

    if (lower.includes('price') || lower.includes('valuation')) {
      questions.push('What is the current market price from CoinGecko or an exchange?');
      questions.push('Is there on-chain data to support this claim?');
    }

    if (lower.includes('switched') || lower.includes('migrated')) {
      questions.push('Is there an official blog post or press release?');
      questions.push('Can this be verified on-chain?');
    }

    if (questions.length === 0) {
      questions.push('What sources confirm or deny this claim?');
      questions.push('Who is making this claim and what is their track record?');
    }

    return questions;
  }
}

export const claimExtractor = new ClaimExtractor();
