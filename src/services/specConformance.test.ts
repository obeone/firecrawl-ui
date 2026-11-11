import { afterEach, describe, expect, it } from 'vitest';
import {
  CRAWL_REQUEST_KEYS,
  SCRAPE_OPTION_KEYS,
  SCRAPE_REQUEST_KEYS,
  SEARCH_REQUEST_KEYS,
  createFirecrawlApiClients,
  toJobStarted,
  toJobStatus,
} from './firecrawl';
import { stubHttp } from '@/test/httpStub';

const BASE = 'https://firecrawl.example.test';
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

/**
 * Every scrape option the views can set, so the request carries every key the
 * adapter knows how to send.
 */
const fullScrapeOptions: Record<string, unknown> = {
  formats: ['markdown', 'html', 'rawHtml', 'links', 'screenshot', 'json', 'changeTracking'],
  jsonOptions: { prompt: 'p' },
  changeTrackingOptions: { modes: ['git-diff'] },
  includeTags: ['main'],
  excludeTags: ['nav'],
  onlyMainContent: true,
  onlyCleanContent: true,
  timeout: 30000,
  waitFor: 100,
  mobile: false,
  actions: [{ type: 'wait', milliseconds: 10 }],
  location: { country: 'FR' },
  skipTlsVerification: false,
  removeBase64Images: true,
  blockAds: true,
  proxy: 'basic',
  maxAge: 0,
  minAge: 0,
  storeInCache: false,
  lockdown: false,
  redactPII: false,
  headers: { 'x-test': '1' },
  parsePDF: false,
};

/**
 * Send one POST through the adapter and return the JSON body it sent.
 */
async function sentBody(
  path: string,
  response: unknown,
  call: (api: ReturnType<typeof createFirecrawlApiClients>) => Promise<unknown>,
): Promise<Record<string, unknown>> {
  const stub = stubHttp({ [`${BASE}${path}`]: { data: response } });
  restore = stub.restore;
  await call(createFirecrawlApiClients('', BASE));
  return stub.requests[0].data as Record<string, unknown>;
}

describe('requests stay within the v2 spec', () => {
  it('sends only spec fields to /v2/scrape', async () => {
    const body = await sentBody('/v2/scrape', { success: true, data: {} }, (api) =>
      api.scraping.scrapeAndExtractFromUrl({
        url: 'https://site.test/',
        ...fullScrapeOptions,
        zeroDataRetention: true,
      }),
    );
    expect(Object.keys(body).length).toBeGreaterThan(20);
    for (const key of Object.keys(body)) {
      expect(SCRAPE_REQUEST_KEYS).toContain(key);
    }
  });

  it('sends only spec fields to /v2/crawl, scrape options included', async () => {
    const body = await sentBody('/v2/crawl', { success: true, id: 'c1' }, (api) =>
      api.crawling.crawlUrls({
        url: 'https://site.test/',
        excludePaths: ['a'],
        includePaths: ['b'],
        maxDepth: 2,
        ignoreSitemap: true,
        ignoreQueryParameters: true,
        limit: 2,
        allowExternalLinks: false,
        allowSubdomains: false,
        crawlEntireDomain: false,
        delay: 1,
        maxConcurrency: 1,
        webhook: { url: 'https://hook.test/' },
        scrapeOptions: fullScrapeOptions,
      }),
    );
    for (const key of Object.keys(body)) {
      expect(CRAWL_REQUEST_KEYS).toContain(key);
    }
    for (const key of Object.keys(body.scrapeOptions as Record<string, unknown>)) {
      expect(SCRAPE_OPTION_KEYS).toContain(key);
    }
  });

  it('sends only spec fields to /v2/search', async () => {
    const body = await sentBody('/v2/search', { success: true, data: {} }, (api) =>
      api.search.search({
        query: 'q',
        sources: [{ type: 'web' }],
        limit: 1,
        tbs: 'qdr:d',
        location: 'France',
        timeout: 1000,
        scrapeOptions: { formats: ['markdown'] },
      }),
    );
    for (const key of Object.keys(body)) {
      expect(SEARCH_REQUEST_KEYS).toContain(key);
    }
  });
});

describe('toJobStatus', () => {
  it('keeps the statuses the UI knows', () => {
    for (const status of ['scraping', 'completed', 'failed', 'cancelled'] as const) {
      expect(toJobStatus(status)).toBe(status);
    }
  });

  it('reports an absent or unknown status as still running', () => {
    expect(toJobStatus(undefined)).toBe('scraping');
    expect(toJobStatus('queued')).toBe('scraping');
  });

  it('applies to crawl status responses', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/crawl/c1`]: { data: { status: 'something-new', data: [] } },
    });
    restore = stub.restore;
    const api = createFirecrawlApiClients('', BASE);
    const { data } = await api.crawling.getCrawlStatus('c1');
    expect(data.status).toBe('scraping');
  });
});

describe('toJobStarted', () => {
  it('returns the job ID and status URL', () => {
    expect(toJobStarted({ success: true, id: 'j1', url: 'https://api/x' })).toEqual({
      id: 'j1',
      url: 'https://api/x',
    });
  });

  it('fails when the API returns no job ID', async () => {
    expect(() => toJobStarted({ success: true })).toThrow('did not return a job ID');
    const stub = stubHttp({ [`${BASE}/v2/batch/scrape`]: { data: { success: true } } });
    restore = stub.restore;
    const api = createFirecrawlApiClients('', BASE);
    await expect(api.batchScraping.batchScrape({ urls: ['https://a.test/'] })).rejects.toThrow(
      'did not return a job ID',
    );
  });
});
