// truth/src/evidence-collector.ts — Collects evidence casts related to a claim

import { createChildLogger } from '@pulo/observability';
import type { EvidenceItem, ExtractedClaim, TruthCheckContext } from './types.js';
import type { IFarcasterProvider } from '@pulo/farcaster';
import type { WebSearchProvider } from './search-provider.js';

const log = createChildLogger('evidence-collector');

export class EvidenceCollector {
  constructor(
    private farcasterProvider?: IFarcasterProvider,
    private searchProvider?: WebSearchProvider,
  ) {}

  /**
   * Collect evidence by searching for related casts using claim keywords.
   */
  async collect(
    claim: ExtractedClaim,
    context: TruthCheckContext
  ): Promise<EvidenceItem[]> {
    const evidence: EvidenceItem[] = [];

    // 1. Collect parent thread casts
    for (const hash of context.parentThreadHashes) {
      try {
        if (this.farcasterProvider) {
          const cast = await this.farcasterProvider.getCastByHash(hash);
          if (cast) {
            evidence.push(this.castToEvidenceItem(cast, 'neutral'));
          }
        }
      } catch (err) {
        log.debug({ hash, err }, 'Failed to fetch parent cast');
      }
    }

    // 2. Collect reply casts
    for (const hash of context.replyHashes) {
      try {
        if (this.farcasterProvider) {
          const cast = await this.farcasterProvider.getCastByHash(hash);
          if (cast) {
            const sentiment = this.classifySentiment(cast.text, claim.claim);
            evidence.push(this.castToEvidenceItem(cast, sentiment));
          }
        }
      } catch (err) {
        log.debug({ hash, err }, 'Failed to fetch reply cast');
      }
    }

    // 3. Keyword search for related casts
    const keywords = this.extractKeywords(claim.claim);
    for (const keyword of keywords.slice(0, 3)) {
      try {
        if (this.farcasterProvider) {
          const searchResult = await this.farcasterProvider.searchCasts(keyword, { limit: 5 });
          for (const cast of searchResult.results) {
            // Don't duplicate
            if (!evidence.some(e => e.castHash === cast.hash)) {
              evidence.push(this.castToEvidenceItem(cast, 'neutral'));
            }
          }
        }
      } catch (err) {
        log.debug({ keyword, err }, 'Keyword search failed');
      }
    }

    // 4. Web search (if search provider available)
    if (this.searchProvider) {
      try {
        const webResults = await this.searchProvider.search(claim.claim);
        for (const result of webResults) {
          evidence.push({
            type: 'web',
            castHash: result.url,
            authorFid: 0,
            text: result.snippet,
            sentiment: 'neutral',
            timestamp: result.publishedAt,
            url: result.url,
            source: result.source,
          });
        }
      } catch (err) {
        log.debug({ err }, 'Web search failed, continuing without web evidence');
      }
    }

    log.info({ evidenceCount: evidence.length }, 'Collected evidence');
    return evidence;
  }

  private castToEvidenceItem(
    cast: { hash: string; text: string; authorFid: number; authorUsername?: string; timestamp?: string },
    sentiment: EvidenceItem['sentiment']
  ): EvidenceItem {
    return {
      type: 'cast',
      castHash: cast.hash,
      authorFid: cast.authorFid,
      authorUsername: cast.authorUsername,
      text: cast.text,
      sentiment,
      timestamp: cast.timestamp,
    };
  }

  private extractKeywords(claim: string): string[] {
    // Extract significant words/n-grams from the claim
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'and', 'or', 'this', 'that', 'with', 'on', 'at', 'by']);
    const words = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

    // Multi-word keywords (bigrams)
    const bigrams: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]} ${words[i + 1]}`);
    }

    return [...bigrams.slice(0, 3), ...words.slice(0, 5)];
  }

  private classifySentiment(castText: string, claim: string): EvidenceItem['sentiment'] {
    const lower = castText.toLowerCase();
    const claimLower = claim.toLowerCase();

    const supportWords = ['yes', 'confirmed', 'true', 'correct', 'official', 'announced', 'verified', '确实', 'doğru', 'evet'];
    const contradictWords = ['no', 'false', 'fake', 'scam', 'not true', 'wrong', 'incorrect', '假的', 'sahte', 'hayır', '警惕', 'warning', 'suspicious'];

    const claimWords = new Set(claimLower.split(/\s+/));

    let supportScore = 0;
    let contradictScore = 0;

    for (const word of supportWords) {
      if (lower.includes(word)) supportScore++;
    }
    for (const word of contradictWords) {
      if (lower.includes(word)) contradictScore++;
    }

    // Check for claim repetition (support signal)
    const overlap = [...claimWords].filter(w => lower.includes(w) && w.length > 4).length;
    if (overlap > 3) supportScore += overlap;

    if (contradictScore > supportScore) return 'contradicting';
    if (supportScore > contradictScore) return 'supporting';
    return 'neutral';
  }
}

export function createEvidenceCollector(
  farcasterProvider?: IFarcasterProvider,
  searchProvider?: WebSearchProvider,
): EvidenceCollector {
  return new EvidenceCollector(farcasterProvider, searchProvider);
}
