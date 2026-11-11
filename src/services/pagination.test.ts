import { afterEach, describe, expect, it } from 'vitest';
import { createFirecrawlApiClients, toNextPagePath } from './firecrawl';
import { stubHttp } from '@/test/httpStub';

const BASE = 'https://firecrawl.example.test';
const KEY = 'fc-test-not-a-real-key';
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

function page(url: string) {
  return { markdown: `# ${url}`, metadata: { sourceURL: url } };
}

describe('toNextPagePath', () => {
  it('keeps the query string and rebuilds the path from the job', () => {
    expect(toNextPagePath(`${BASE}/v2/crawl/abc?skip=10`, '/v2/crawl/abc')).toBe(
      '/v2/crawl/abc?skip=10',
    );
  });

  it('drops a foreign origin instead of following it', () => {
    expect(toNextPagePath('https://evil.example/v2/crawl/abc?skip=10', '/v2/crawl/abc')).toBe(
      '/v2/crawl/abc?skip=10',
    );
  });

  it('rejects a next link that points at another job', () => {
    expect(() => toNextPagePath(`${BASE}/v2/crawl/other?skip=10`, '/v2/crawl/abc')).toThrow(
      /Unexpected pagination URL/,
    );
  });
});

describe('crawl results', () => {
  it('follows next through the authenticated client and normalizes every page', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/crawl/abc`]: {
        data: {
          success: true,
          status: 'completed',
          completed: 3,
          total: 3,
          next: `${BASE}/v2/crawl/abc?skip=2`,
          data: [page('https://site.test/a'), page('https://site.test/b')],
        },
      },
      [`${BASE}/v2/crawl/abc?skip=2`]: {
        data: { success: true, status: 'completed', data: [page('https://site.test/c')] },
      },
    });
    restore = stub.restore;

    const api = createFirecrawlApiClients(KEY, BASE);
    const result = await api.crawling.getCrawlResults('abc');

    expect(result.data.data.map((d) => (d.metadata as { sourceURL: string }).sourceURL)).toEqual([
      'https://site.test/a',
      'https://site.test/b',
      'https://site.test/c',
    ]);
    expect(result.data.data[2]).toHaveProperty('markdown', '# https://site.test/c');
    expect(result.data.next).toBeNull();
    expect(stub.requests).toHaveLength(2);
    for (const request of stub.requests) {
      expect(request.url.startsWith(BASE)).toBe(true);
      expect(request.headers.Authorization).toBe(`Bearer ${KEY}`);
    }
  });

  it('never sends the key to another origin named in next', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/crawl/abc`]: {
        data: {
          status: 'completed',
          next: 'https://attacker.example/v2/crawl/abc?skip=1',
          data: [page('https://site.test/a')],
        },
      },
      [`${BASE}/v2/crawl/abc?skip=1`]: {
        data: { status: 'completed', data: [page('https://site.test/b')] },
      },
    });
    restore = stub.restore;

    const api = createFirecrawlApiClients(KEY, BASE);
    const result = await api.crawling.getCrawlResults('abc');

    expect(result.data.data).toHaveLength(2);
    expect(stub.requests.some((r) => r.url.includes('attacker.example'))).toBe(false);
  });

  it('stops on an empty page even when next is still present', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/crawl/abc`]: {
        data: {
          status: 'cancelled',
          next: `${BASE}/v2/crawl/abc?skip=1`,
          data: [page('https://site.test/a')],
        },
      },
      [`${BASE}/v2/crawl/abc?skip=1`]: {
        data: { status: 'cancelled', next: `${BASE}/v2/crawl/abc?skip=1`, data: [] },
      },
    });
    restore = stub.restore;

    const api = createFirecrawlApiClients(KEY, BASE);
    const result = await api.crawling.getCrawlResults('abc');

    expect(result.data.status).toBe('cancelled');
    expect(result.data.data).toHaveLength(1);
    expect(stub.requests).toHaveLength(2);
  });

  it('does not page a running crawl that has no documents yet', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/crawl/abc`]: {
        data: { status: 'scraping', next: `${BASE}/v2/crawl/abc?skip=0`, data: [] },
      },
    });
    restore = stub.restore;

    const api = createFirecrawlApiClients(KEY, BASE);
    const result = await api.crawling.getCrawlResults('abc');

    expect(result.data.data).toEqual([]);
    expect(stub.requests).toHaveLength(1);
  });
});

describe('batch scrape results', () => {
  it('follows next across two pages', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/batch/scrape/xyz`]: {
        data: {
          status: 'completed',
          completed: 2,
          total: 2,
          creditsUsed: 2,
          next: `${BASE}/v2/batch/scrape/xyz?skip=1`,
          data: [page('https://site.test/a')],
        },
      },
      [`${BASE}/v2/batch/scrape/xyz?skip=1`]: {
        data: { status: 'completed', data: [page('https://site.test/b')] },
      },
    });
    restore = stub.restore;

    const api = createFirecrawlApiClients(KEY, BASE);
    const result = await api.batchScraping.getBatchScrapeResults('xyz');

    expect(result.data.data).toHaveLength(2);
    expect(result.data.creditsUsed).toBe(2);
    expect(stub.requests.every((r) => r.headers.Authorization === `Bearer ${KEY}`)).toBe(true);
  });
});
