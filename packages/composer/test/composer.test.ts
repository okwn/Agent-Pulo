import { describe, it, expect, beforeEach } from 'vitest';
import {
  CastRewriteAgent,
  ThreadBuilderAgent,
  CastRatingAgent,
  HookScorer,
  ChannelRecommender,
  PublishSafetyCheck,
  translateText,
  InMemoryDraftStore,
  type CastStyle,
  type Draft,
} from '../src/index.js';

describe('CastRewriteAgent', () => {
  const agent = new CastRewriteAgent();

  describe('rewrite', () => {
    it('returns a variant with text and style', async () => {
      const result = await agent.rewrite('I think that this is a great idea', 'sharp');
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('style', 'sharp');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reasoning');
    });

    it('sharp style removes filler words', async () => {
      const result = await agent.rewrite('I think that this is basically really great', 'sharp');
      expect(result.text).not.toContain('I think that');
      expect(result.text).not.toContain('basically');
    });

    it('founder style makes it confident', async () => {
      const result = await agent.rewrite('This could potentially be the best approach', 'founder');
      expect(result.text).not.toContain('could potentially');
    });

    it('concise style reduces word count', async () => {
      const longText = 'This is a very long sentence that has too many words and should be shortened significantly';
      const result = await agent.rewrite(longText, 'concise');
      const originalWords = longText.split(/\s+/).length;
      const resultWords = result.text.split(/\s+/).length;
      expect(resultWords).toBeLessThan(originalWords);
    });

    it('funny style adds wit', async () => {
      const result = await agent.rewrite('Buy Bitcoin now', 'funny');
      expect(result.text).not.toBe('Buy Bitcoin now');
    });

    it('technical style adds specificity marker for long text', async () => {
      const result = await agent.rewrite('The Ethereum protocol is extremely fast and efficient for all users today', 'technical');
      expect(result.text).toContain('[specify');
    });
  });

  describe('rewriteMultiple', () => {
    it('returns variants for all requested styles', async () => {
      const styles: CastStyle[] = ['sharp', 'founder', 'concise'];
      const results = await agent.rewriteMultiple('This is a test cast', styles);
      expect(results).toHaveLength(3);
      expect(results.map(r => r.style)).toEqual(styles);
    });
  });
});

describe('ThreadBuilderAgent', () => {
  const agent = new ThreadBuilderAgent();

  it('builds thread with correct post count', async () => {
    const text = 'This is a longer text that should be split into multiple posts to form a thread on farcaster';
    const result = await agent.buildThread(text, 5);
    expect(result.posts).toHaveLength(5);
  });

  it('first post is marked as hook', async () => {
    const result = await agent.buildThread('This is a test thread', 3);
    expect(result.posts[0].isHook).toBe(true);
    expect(result.posts[1].isHook).toBe(false);
  });

  it('returns hook string', async () => {
    const result = await agent.buildThread('This is a test thread', 3);
    expect(typeof result.hook).toBe('string');
    expect(result.hook.length).toBeGreaterThan(0);
  });

  it('returns total length', async () => {
    const text = 'Short text';
    const result = await agent.buildThread(text, 2);
    expect(result.totalLength).toBe(text.length);
  });
});

describe('CastRatingAgent', () => {
  const agent = new CastRatingAgent();

  it('returns rating with score 1-10', async () => {
    const result = await agent.rate('This is a great cast about crypto');
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it('returns critique string', async () => {
    const result = await agent.rate('Test cast');
    expect(typeof result.critique).toBe('string');
  });

  it('returns sub-scores', async () => {
    const result = await agent.rate('Test cast');
    expect(result).toHaveProperty('hookScore');
    expect(result).toHaveProperty('clarityScore');
    expect(result).toHaveProperty('engagementScore');
  });

  it('identifies risk flags', async () => {
    const result = await agent.rate('100% guaranteed to make money fast!');
    expect(result.riskFlags.length).toBeGreaterThan(0);
  });
});

describe('HookScorer', () => {
  const scorer = new HookScorer();

  it('scores hook quality', async () => {
    const result = await scorer.score('This is a test hook');
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(10);
  });

  it('returns factors array', async () => {
    const result = await scorer.score('This is a test hook');
    expect(Array.isArray(result.factors)).toBe(true);
  });

  it('higher score for good length', async () => {
    const shortResult = await scorer.score('Hi');
    const goodResult = await scorer.score('This is a properly sized hook that should score higher');
    expect(goodResult.score).toBeGreaterThan(shortResult.score);
  });

  it('suggests improvements', async () => {
    const suggestions = await scorer.suggestImprovements('Test hook');
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach(s => {
      expect(s).toHaveProperty('hook');
      expect(s).toHaveProperty('type');
      expect(s).toHaveProperty('score');
    });
  });
});

describe('ChannelRecommender', () => {
  const recommender = new ChannelRecommender();

  it('returns channel recommendations', async () => {
    const results = await recommender.recommend('Building a DeFi protocol on Ethereum');
    expect(Array.isArray(results)).toBe(true);
  });

  it('each recommendation has required fields', async () => {
    const results = await recommender.recommend('Testing the new swap feature');
    results.forEach(r => {
      expect(r).toHaveProperty('channel');
      expect(r).toHaveProperty('relevance');
      expect(r).toHaveProperty('reason');
    });
  });

  it('relevance scores are between 0 and 1', async () => {
    const results = await recommender.recommend(' NFT art is trending');
    results.forEach(r => {
      expect(r.relevance).toBeGreaterThanOrEqual(0);
      expect(r.relevance).toBeLessThanOrEqual(1);
    });
  });

  it('results are sorted by relevance', async () => {
    const results = await recommender.recommend('Solana trading strategies');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].relevance).toBeGreaterThanOrEqual(results[i].relevance);
    }
  });
});

describe('PublishSafetyCheck', () => {
  const checker = new PublishSafetyCheck();

  it('marks safe text correctly', async () => {
    const result = await checker.check('This is a normal cast about crypto');
    expect(result.safe).toBe(true);
    expect(result.riskLevel).toBe('low');
  });

  it('detects spam patterns', async () => {
    const result = await checker.check('Buy now! Limited time offer! Click here!');
    expect(result.safe).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('warns about long casts', async () => {
    const longText = 'a'.repeat(350);
    const result = await checker.check(longText);
    expect(result.warnings.some(w => w.includes('truncated'))).toBe(true);
  });

  it('warns about excessive caps', async () => {
    const result = await checker.check('THIS IS ALL CAPS AND LOOKS LIKE SHOUTING');
    expect(result.warnings.some(w => w.includes('caps') || w.includes('shouting'))).toBe(true);
  });

  it('warns about links', async () => {
    const result = await checker.check('Check out https://example.com for more');
    expect(result.warnings.some(w => w.includes('link'))).toBe(true);
  });
});

describe('Translation', () => {
  it('adds TR marker when translating to Turkish', async () => {
    const result = await translateText('Hello world', 'tr');
    expect(result).toContain('[TR]');
  });

  it('removes TR marker when translating to English', async () => {
    const result = await translateText('[TR] Hello world', 'en');
    expect(result).not.toContain('[TR]');
  });
});

describe('InMemoryDraftStore', () => {
  let store: InMemoryDraftStore;

  beforeEach(() => {
    store = new InMemoryDraftStore();
  });

  it('creates drafts with auto-generated IDs', async () => {
    const draft = await store.create({
      text: 'Test draft',
      status: 'draft',
      score: null,
      reason: null,
      sourceCastHash: null,
      publishedAt: null,
    });
    expect(draft.id).toBeTruthy();
    expect(draft.id).toMatch(/^draft_/);
  });

  it('retrieves all drafts sorted by updatedAt', async () => {
    await store.create({ text: 'First', status: 'draft', score: null, reason: null, sourceCastHash: null, publishedAt: null });
    await new Promise(r => setTimeout(r, 10));
    await store.create({ text: 'Second', status: 'draft', score: null, reason: null, sourceCastHash: null, publishedAt: null });

    const drafts = await store.getAll();
    expect(drafts[0].text).toBe('Second'); // Most recent first
  });

  it('gets draft by ID', async () => {
    const created = await store.create({ text: 'Test', status: 'draft', score: null, reason: null, sourceCastHash: null, publishedAt: null });
    const found = await store.getById(created.id);
    expect(found?.text).toBe('Test');
  });

  it('returns null for non-existent draft', async () => {
    const found = await store.getById('nonexistent');
    expect(found).toBeNull();
  });

  it('updates draft', async () => {
    const created = await store.create({ text: 'Original', status: 'draft', score: null, reason: null, sourceCastHash: null, publishedAt: null });
    const updated = await store.update(created.id, { text: 'Updated', status: 'approved' });
    expect(updated?.text).toBe('Updated');
    expect(updated?.status).toBe('approved');
  });

  it('deletes draft', async () => {
    const created = await store.create({ text: 'To delete', status: 'draft', score: null, reason: null, sourceCastHash: null, publishedAt: null });
    const deleted = await store.delete(created.id);
    expect(deleted).toBe(true);
    expect(await store.getById(created.id)).toBeNull();
  });

  it('updates updatedAt timestamp', async () => {
    const created = await store.create({ text: 'Test', status: 'draft', score: null, reason: null, sourceCastHash: null, publishedAt: null });
    const originalUpdatedAt = created.updatedAt;

    await new Promise(r => setTimeout(r, 10));
    const updated = await store.update(created.id, { text: 'Updated' });
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});