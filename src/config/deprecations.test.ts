import { describe, expect, it } from 'vitest';
import { deprecationFor, formatRemovalDate } from './deprecations';

describe('deprecationFor', () => {
  it('flags deep research and llms.txt as deprecated v1 tools', () => {
    for (const path of ['/research', '/llmstxt']) {
      const entry = deprecationFor(path);
      expect(entry?.badge).toBe('v1');
      expect(entry?.migrationGuide).toMatch(/^https:\/\/docs\.firecrawl\.dev\//);
    }
  });

  it('leaves the v2 tools alone', () => {
    for (const path of ['/scrape', '/batch-scrape', '/crawl', '/extract', '/map', '/search']) {
      expect(deprecationFor(path)).toBeUndefined();
    }
  });

  it('ignores inherited object keys', () => {
    expect(deprecationFor('toString')).toBeUndefined();
  });
});

describe('formatRemovalDate', () => {
  it('shows the announced removal date in UTC', () => {
    expect(formatRemovalDate(deprecationFor('/research')!.removal)).toBe(
      '10 December 2026, 15:00 UTC',
    );
  });
});
