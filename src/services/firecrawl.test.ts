import { describe, expect, it } from 'vitest';
import { normalizeFirecrawlBaseUrl } from './firecrawl';

describe('normalizeFirecrawlBaseUrl', () => {
  it('falls back to the hosted API when no URL is configured', () => {
    expect(normalizeFirecrawlBaseUrl()).toBe('https://api.firecrawl.dev');
    expect(normalizeFirecrawlBaseUrl('')).toBe('https://api.firecrawl.dev');
    expect(normalizeFirecrawlBaseUrl('   ')).toBe('https://api.firecrawl.dev');
  });

  it('strips a trailing version segment so routes can add their own', () => {
    expect(normalizeFirecrawlBaseUrl('https://api.firecrawl.dev/v1')).toBe(
      'https://api.firecrawl.dev',
    );
    expect(normalizeFirecrawlBaseUrl('https://firecrawl.example.com/v2/')).toBe(
      'https://firecrawl.example.com',
    );
    expect(normalizeFirecrawlBaseUrl('https://firecrawl.example.com/V2')).toBe(
      'https://firecrawl.example.com',
    );
  });

  it('keeps a self-hosted URL without a version segment as is', () => {
    expect(normalizeFirecrawlBaseUrl(' http://localhost:3002 ')).toBe('http://localhost:3002');
    expect(normalizeFirecrawlBaseUrl('https://example.com/firecrawl')).toBe(
      'https://example.com/firecrawl',
    );
  });
});
