// truth/src/search-provider.ts — Web search provider abstraction

import { createChildLogger } from '@pulo/observability';

const log = createChildLogger('search-provider');

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
}

export interface WebSearchProvider {
  readonly name: string;
  readonly mode: 'mock' | 'tavily' | 'serpapi' | 'disabled';
  search(query: string): Promise<SearchResult[]>;
}

// ─── Mock Search Provider ───────────────────────────────────────────────────

export class MockSearchProvider implements WebSearchProvider {
  readonly name = 'mock';
  readonly mode: WebSearchProvider['mode'] = 'mock';

  async search(query: string): Promise<SearchResult[]> {
    log.debug({ query }, 'MockSearchProvider: simulating web search');

    // Return mock results based on query keywords
    const q = query.toLowerCase();

    if (q.includes('airdrop') || q.includes('claim')) {
      return [
        {
          title: 'Official Airdrop Announcement — No wallet needed',
          url: 'https://example.com/official/airdrop-announcement',
          snippet: 'This is the official announcement. Airdrop is processed automatically for eligible users. Never share your private keys.',
          source: 'example.com',
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          title: 'Community Discussion on Social Media',
          url: 'https://warpcast.com/group/community/123',
          snippet: 'Users discussing airdrop eligibility criteria. No official confirmation yet.',
          source: 'warpcast.com',
        },
      ];
    }

    if (q.includes('scam') || q.includes('fake')) {
      return [
        {
          title: 'Scam Alert — Suspicious Links Detected',
          url: 'https://example.com/security/scam-alert',
          snippet: 'WARNING: There are reports of scammers impersonating this project. Do NOT click suspicious links or connect your wallet.',
          source: 'example.com',
          publishedAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ];
    }

    return [
      {
        title: `Search results for: ${query}`,
        url: 'https://example.com/search?q=' + encodeURIComponent(query),
        snippet: 'This is a mock search result. In live mode, real search results from Tavily or SerpAPI would appear here.',
        source: 'mock',
      },
    ];
  }
}

// ─── Tavily Search Provider ─────────────────────────────────────────────────

export class TavilySearchProvider implements WebSearchProvider {
  readonly name = 'tavily';
  readonly mode: WebSearchProvider['mode'] = 'tavily';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.startsWith('PLACEHOLDER') || apiKey === 'undefined') {
      throw new Error('TAVILY_API_KEY is required for TavilySearchProvider');
    }
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<SearchResult[]> {
    log.debug({ query, provider: 'tavily' }, 'TavilySearchProvider: searching');

    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'tv-api-key': this.apiKey,
        },
        body: JSON.stringify({
          query,
          search_depth: 'basic',
          max_results: 5,
          include_answer: false,
          include_images: false,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        log.error('Tavily API key invalid or missing');
        throw new Error('Tavily API key invalid or missing');
      }

      if (res.status === 429) {
        log.warn('Tavily rate limit hit');
        throw new Error('Tavily rate limit exceeded');
      }

      if (!res.ok) {
        throw new Error(`Tavily API error: ${res.status}`);
      }

      const data = await res.json() as { results?: Array<{ title: string; url: string; content: string; published_date?: string }> };

      return (data.results ?? []).map(r => ({
        title: r.title ?? '',
        url: r.url ?? '',
        snippet: r.content ?? '',
        source: new URL(r.url ?? 'https://example.com').hostname,
        publishedAt: r.published_date,
      }));
    } catch (err) {
      log.error({ err, query }, 'Tavily search failed');
      throw err;
    }
  }
}

// ─── SerpAPI Search Provider ─────────────────────────────────────────────────

export class SerpApiSearchProvider implements WebSearchProvider {
  readonly name = 'serpapi';
  readonly mode: WebSearchProvider['mode'] = 'serpapi';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.startsWith('PLACEHOLDER') || apiKey === 'undefined') {
      throw new Error('SERPAPI_API_KEY is required for SerpApiSearchProvider');
    }
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<SearchResult[]> {
    log.debug({ query, provider: 'serpapi' }, 'SerpApiSearchProvider: searching');

    try {
      const params = new URLSearchParams({
        q: query,
        api_key: this.apiKey,
        engine: 'google',
        num: '5',
      });

      const res = await fetch(`https://serpapi.com/search?${params}`);

      if (res.status === 401 || res.status === 403) {
        log.error('SerpAPI key invalid or missing');
        throw new Error('SerpAPI key invalid or missing');
      }

      if (res.status === 429) {
        log.warn('SerpAPI rate limit hit');
        throw new Error('SerpAPI rate limit exceeded');
      }

      if (!res.ok) {
        throw new Error(`SerpAPI error: ${res.status}`);
      }

      const data = await res.json() as {
        organic_results?: Array<{
          title?: string;
          link?: string;
          snippet?: string;
          published_date?: string;
        }>;
      };

      return (data.organic_results ?? []).map(r => ({
        title: r.title ?? '',
        url: r.link ?? '',
        snippet: r.snippet ?? '',
        source: r.link ? new URL(r.link).hostname : 'unknown',
        publishedAt: r.published_date,
      }));
    } catch (err) {
      log.error({ err, query }, 'SerpAPI search failed');
      throw err;
    }
  }
}

// ─── Disabled Provider ──────────────────────────────────────────────────────

export class DisabledSearchProvider implements WebSearchProvider {
  readonly name = 'disabled';
  readonly mode: WebSearchProvider['mode'] = 'disabled';

  async search(_query: string): Promise<SearchResult[]> {
    log.debug('Search is disabled, returning no results');
    return [];
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export type SearchMode = 'mock' | 'tavily' | 'serpapi' | 'disabled';

export function createSearchProvider(mode?: SearchMode): WebSearchProvider {
  const searchMode = mode ?? (process.env.PULO_SEARCH_MODE as SearchMode) ?? 'mock';

  switch (searchMode) {
    case 'tavily': {
      const apiKey = process.env.TAVILY_API_KEY ?? '';
      if (!apiKey || apiKey.startsWith('PLACEHOLDER') || apiKey === 'undefined') {
        log.warn('TAVILY_API_KEY not set, falling back to mock search');
        return new MockSearchProvider();
      }
      return new TavilySearchProvider(apiKey);
    }
    case 'serpapi': {
      const apiKey = process.env.SERPAPI_API_KEY ?? '';
      if (!apiKey || apiKey.startsWith('PLACEHOLDER') || apiKey === 'undefined') {
        log.warn('SERPAPI_API_KEY not set, falling back to mock search');
        return new MockSearchProvider();
      }
      return new SerpApiSearchProvider(apiKey);
    }
    case 'disabled':
      return new DisabledSearchProvider();
    case 'mock':
    default:
      return new MockSearchProvider();
  }
}