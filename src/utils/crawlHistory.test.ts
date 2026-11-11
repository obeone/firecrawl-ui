import { describe, expect, it } from 'vitest';
import {
  CRAWL_HISTORY_STORAGE_KEY,
  clearCrawlHistory,
  loadCrawlHistory,
  sanitizeCrawlHistoryItem,
  saveCrawlHistory,
} from './crawlHistory';
import type { StorageLike } from './jobHistory';

const SECRETS = [
  'Bearer webhook-token',
  'webhook-signing-secret',
  'hooks.slack.com',
  'session=cookie-value',
  'scrape-auth-token',
  'hunter2',
  'fc-api-key',
  'tenant-secret',
];

function memoryStorage(initial?: string): StorageLike & {
  raw(): string | null;
  writes: number;
} {
  const map = new Map<string, string>();
  if (initial !== undefined) {
    map.set(CRAWL_HISTORY_STORAGE_KEY, initial);
  }
  const store = {
    writes: 0,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.writes += 1;
      map.set(k, v);
    },
    removeItem: (k: string) => void map.delete(k),
    raw: () => map.get(CRAWL_HISTORY_STORAGE_KEY) ?? null,
  };
  return store;
}

/** A history entry shaped like what older versions stored: the whole form. */
function legacyEntry(id: string): Record<string, unknown> {
  return {
    id,
    url: 'https://user:pass@example.com/docs',
    createdAt: '2026-11-01T10:00:00.000Z',
    status: 'completed',
    apiKey: 'fc-api-key',
    crawlerOptions: {
      includes: ['/docs/*'],
      excludes: ['/private/*'],
      maxDepth: 3,
      limit: 10,
    },
    scrapeOptions: {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      includeTags: ['article'],
      excludeTags: ['nav'],
      headers: { Cookie: 'session=cookie-value', Authorization: 'scrape-auth-token' },
      actions: [{ type: 'write', text: 'hunter2' }],
      jsonOptions: { schema: { type: 'object' }, prompt: 'Extract' },
      location: { country: 'FR', languages: ['fr'] },
      changeTrackingOptions: { modes: ['git-diff'], schema: { type: 'object' } },
    },
    webhookOptions: {
      url: 'https://hooks.slack.com/services/T000/B000/XXXX',
      headers: {
        Authorization: 'Bearer webhook-token',
        'X-Signature': 'webhook-signing-secret',
      },
      metadata: { tenant: 'tenant-secret' },
      events: ['completed'],
    },
  };
}

function expectNoSecret(text: string | null): void {
  for (const secret of SECRETS) {
    expect(text ?? '').not.toContain(secret);
  }
  expect(text ?? '').not.toContain('webhook');
  expect(text ?? '').not.toContain('user:pass');
}

describe('crawlHistory', () => {
  it('never writes webhook options, request headers, actions or keys', () => {
    const s = memoryStorage();
    saveCrawlHistory([legacyEntry('a')], s);
    expectNoSecret(s.raw());
  });

  it('keeps the fields the Crawl view reads back', () => {
    expect(sanitizeCrawlHistoryItem(legacyEntry('a'))).toEqual({
      id: 'a',
      url: 'https://example.com/docs',
      createdAt: '2026-11-01T10:00:00.000Z',
      status: 'completed',
      crawlerOptions: { includes: ['/docs/*'], excludes: ['/private/*'] },
      scrapeOptions: {
        formats: ['markdown', 'html'],
        includeTags: ['article'],
        excludeTags: ['nav'],
        location: { languages: ['fr'] },
        jsonOptions: { schema: { type: 'object' } },
        changeTrackingOptions: { modes: ['git-diff'], schema: { type: 'object' } },
      },
    });
  });

  it('migrates entries stored by older versions on load', () => {
    const s = memoryStorage(JSON.stringify([legacyEntry('a'), legacyEntry('b')]));
    const list = loadCrawlHistory(s);
    expect(list.map((item) => item.id)).toEqual(['a', 'b']);
    expect(list[0].scrapeOptions?.formats).toEqual(['markdown', 'html']);
    expectNoSecret(s.raw());
    expect(JSON.parse(s.raw() as string)).toEqual(list);
  });

  it('does not rewrite a history that is already clean', () => {
    const s = memoryStorage();
    saveCrawlHistory([legacyEntry('a')], s);
    const writes = s.writes;
    loadCrawlHistory(s);
    expect(s.writes).toBe(writes);
  });

  it('drops invalid entries and keeps the valid ones', () => {
    const raw = JSON.stringify([legacyEntry('ok'), null, 'x', { id: '' }, { url: 'u' }]);
    const s = memoryStorage(raw);
    expect(loadCrawlHistory(s).map((item) => item.id)).toEqual(['ok']);
    expect(JSON.parse(s.raw() as string)).toHaveLength(1);
  });

  it('removes unreadable or empty data', () => {
    const corrupted = memoryStorage('{"webhookOptions":{"headers":{"Authorization":"Bearer x"');
    expect(loadCrawlHistory(corrupted)).toEqual([]);
    expect(corrupted.raw()).toBeNull();

    const notArray = memoryStorage(JSON.stringify(legacyEntry('a')));
    expect(loadCrawlHistory(notArray)).toEqual([]);
    expect(notArray.raw()).toBeNull();
  });

  it('returns an empty list when nothing is stored', () => {
    const s = memoryStorage();
    expect(loadCrawlHistory(s)).toEqual([]);
    expect(s.writes).toBe(0);
  });

  it('tolerates storage failures', () => {
    const failing: StorageLike = {
      getItem: () => JSON.stringify([legacyEntry('a')]),
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadCrawlHistory(failing).map((item) => item.id)).toEqual(['a']);
    expect(() => saveCrawlHistory([legacyEntry('a')], failing)).not.toThrow();
    expect(() => clearCrawlHistory(failing)).not.toThrow();
  });

  it('clears the stored history', () => {
    const s = memoryStorage(JSON.stringify([legacyEntry('a')]));
    clearCrawlHistory(s);
    expect(s.raw()).toBeNull();
  });
});
