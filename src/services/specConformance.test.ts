import { afterEach, describe, expect, it } from 'vitest';
import {
  CRAWL_REQUEST_KEYS,
  PLAIN_FORMATS,
  SCRAPE_OPTION_KEYS,
  SCRAPE_REQUEST_KEYS,
  SEARCH_REQUEST_KEYS,
  createFirecrawlApiClients,
  toJobStarted,
  toJobStatus,
  type CrawlRequestOptions,
  type ScrapeRequestOptions,
  type SearchRequestBody,
} from './firecrawl';
import { stubHttp } from '@/test/httpStub';
import type { V2CrawlRequest, V2FormatEntry, V2ScrapeRequest } from '@/types/firecrawlApi';

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

describe('request values match the v2 spec', () => {
  it('sends the nested scrape values in their v2 shape', async () => {
    const body = await sentBody('/v2/scrape', { success: true, data: {} }, (api) =>
      api.scraping.scrapeAndExtractFromUrl({ url: 'https://site.test/', ...fullScrapeOptions }),
    );
    expect(body.formats).toEqual([
      'markdown',
      'html',
      'rawHtml',
      'links',
      'screenshot',
      { type: 'json', prompt: 'p' },
      { type: 'changeTracking', modes: ['git-diff'] },
    ]);
    expect(body.actions).toEqual([{ type: 'wait', milliseconds: 10 }]);
    expect(body.location).toEqual({ country: 'FR' });
    expect(body.headers).toEqual({ 'x-test': '1' });
    expect(body.proxy).toBe('basic');
    expect(body.parsers).toEqual([]);
  });

  it('keeps option blocks, attribute selectors and a country-code location', async () => {
    const body = await sentBody('/v2/scrape', { success: true, data: {} }, (api) =>
      api.scraping.scrapeAndExtractFromUrl({
        url: 'https://site.test/',
        formats: ['screenshot@fullPage', 'attributes', 'json'],
        attributesOptions: { selectors: [{ selector: 'a', attribute: 'href' }, { selector: 1 }] },
        jsonOptions: { schema: { type: 'object' } },
        location: 'DE',
        proxy: 'stealth',
      }),
    );
    expect(body.formats).toEqual([
      { type: 'screenshot', fullPage: true },
      { type: 'attributes', selectors: [{ selector: 'a', attribute: 'href' }] },
      { type: 'json', schema: { type: 'object' } },
    ]);
    expect(body.location).toEqual({ country: 'DE' });
    expect(body.proxy).toBe('stealth');
  });

  it('drops values the v2 spec does not define', async () => {
    const body = await sentBody('/v2/scrape', { success: true, data: {} }, (api) =>
      api.scraping.scrapeAndExtractFromUrl({
        url: 'https://site.test/',
        formats: ['markdown', 'not-a-format', 42],
        changeTrackingOptions: { modes: ['git-diff', 'bogus'] },
        actions: [{ type: 'wait', milliseconds: 1 }, { type: 'teleport' }, 'click'],
        includeTags: ['main', 3],
        proxy: 'residential',
        headers: { 'x-ok': 'yes', 'x-bad': 1 },
      }),
    );
    expect(body.formats).toEqual(['markdown']);
    expect(body.actions).toEqual([{ type: 'wait', milliseconds: 1 }]);
    expect(body).not.toHaveProperty('includeTags');
    expect(body).not.toHaveProperty('proxy');
    expect(body.headers).toEqual({ 'x-ok': 'yes' });
  });

  it('drops browser actions with missing or mistyped fields', async () => {
    const body = await sentBody('/v2/scrape', { success: true, data: {} }, (api) =>
      api.scraping.scrapeAndExtractFromUrl({
        url: 'https://site.test/',
        actions: [
          { type: 'wait', milliseconds: 'not-a-number' },
          { type: 'wait', milliseconds: '' },
          { type: 'click' },
          { type: 'click', selector: '' },
          { type: 'scroll', direction: 'sideways' },
          { type: 'press', key: 13 },
          { type: 'write' },
          { type: 'executeJavascript', script: '' },
          { type: 'wait', selector: '#ready' },
          { type: 'click', selector: '#more', all: 'yes', milliseconds: 5 },
          { type: 'scroll', direction: 'up', selector: '' },
          { type: 'screenshot', fullPage: true, quality: 'high' },
          { type: 'write', text: '' },
          { type: 'scrape', selector: '#stale' },
        ],
      }),
    );
    expect(body.actions).toEqual([
      { type: 'wait', selector: '#ready' },
      { type: 'click', selector: '#more' },
      { type: 'scroll', direction: 'up' },
      { type: 'screenshot', fullPage: true },
      { type: 'write', text: '' },
      { type: 'scrape' },
    ]);
  });

  it('sends the crawl webhook and scrape options in their v2 shape', async () => {
    const body = await sentBody('/v2/crawl', { success: true, id: 'c1' }, (api) =>
      api.crawling.crawlUrls({
        url: 'https://site.test/',
        maxDepth: 2,
        ignoreSitemap: true,
        webhook: {
          url: 'https://hook.test/',
          headers: { Authorization: 'Bearer x', retries: 3 },
          metadata: { run: 1 },
          events: ['page', 'completed', 'exploded'],
        },
        scrapeOptions: { formats: ['markdown'], location: { country: 'FR', languages: ['fr'] } },
      }),
    );
    expect(body.maxDiscoveryDepth).toBe(2);
    expect(body.sitemap).toBe('skip');
    expect(body.webhook).toEqual({
      url: 'https://hook.test/',
      headers: { Authorization: 'Bearer x' },
      metadata: { run: 1 },
      events: ['page', 'completed'],
    });
    expect(body.scrapeOptions).toEqual({
      formats: ['markdown'],
      location: { country: 'FR', languages: ['fr'] },
    });
  });

  it('leaves out a crawl webhook without a URL', async () => {
    const body = await sentBody('/v2/crawl', { success: true, id: 'c1' }, (api) =>
      api.crawling.crawlUrls({ url: 'https://site.test/', webhook: { events: ['page'] } }),
    );
    expect(body).not.toHaveProperty('webhook');
  });

  it('sends search sources in string or object form', async () => {
    const body = await sentBody('/v2/search', { success: true, data: {} }, (api) =>
      api.search.search({
        query: 'q',
        sources: ['web', 'news', 'videos', { type: 'images' }, { type: 'web', tbs: 'qdr:d' }],
      }),
    );
    expect(body.sources).toEqual([
      'web',
      'news',
      { type: 'images' },
      { type: 'web', tbs: 'qdr:d' },
    ]);
  });

  it('rejects values outside the spec at compile time', () => {
    // Every plain format string the spec allows is listed, so none is dropped.
    const allPlainFormatsListed: [
      Exclude<Extract<V2FormatEntry, string>, (typeof PLAIN_FORMATS)[number]>,
    ] extends [never]
      ? true
      : false = true;
    // Apart from the documented format and proxy exceptions, the built options are spec values.
    const scrapeMatchesSpec: Omit<
      ScrapeRequestOptions,
      'formats' | 'proxy'
    > extends Partial<V2ScrapeRequest>
      ? true
      : false = true;
    const crawlMatchesSpec: Omit<
      CrawlRequestOptions,
      'scrapeOptions'
    > extends Partial<V2CrawlRequest>
      ? true
      : false = true;

    // @ts-expect-error: proxy mode missing from the spec
    const badProxy: ScrapeRequestOptions = { proxy: 'residential' };
    // @ts-expect-error: `attributes` needs selectors, so it has no plain string form
    const badFormat: ScrapeRequestOptions = { formats: ['attributes'] };
    // @ts-expect-error: a question format needs its question
    const badQuestion: ScrapeRequestOptions = { formats: [{ type: 'question' }] };
    // @ts-expect-error: location languages are a list
    const badLocation: ScrapeRequestOptions = { location: { languages: 'fr' } };
    // @ts-expect-error: a webhook needs a URL
    const badWebhook: CrawlRequestOptions = { webhook: { events: ['page'] } };
    const badEvent: CrawlRequestOptions = {
      // @ts-expect-error: unknown webhook event
      webhook: { url: 'https://hook.test/', events: ['exploded'] },
    };
    const badHeader: CrawlRequestOptions = {
      // @ts-expect-error: webhook header values are strings
      webhook: { url: 'https://hook.test/', headers: { retries: 3 } },
    };
    // @ts-expect-error: a click action needs its selector
    const badClick: ScrapeRequestOptions = { actions: [{ type: 'click' }] };
    const badWait: ScrapeRequestOptions = {
      // @ts-expect-error: a wait duration is a number
      actions: [{ type: 'wait', milliseconds: '10' }],
    };
    const badScroll: ScrapeRequestOptions = {
      // @ts-expect-error: scroll directions are up and down
      actions: [{ type: 'scroll', direction: 'sideways' }],
    };
    // @ts-expect-error: unknown search source
    const badSource: SearchRequestBody = { sources: ['videos'] };
    const plainMarkdown: ScrapeRequestOptions = { formats: ['markdown', { type: 'summary' }] };

    expect([allPlainFormatsListed, scrapeMatchesSpec, crawlMatchesSpec]).toEqual([
      true,
      true,
      true,
    ]);
    expect([
      badProxy,
      badFormat,
      badQuestion,
      badLocation,
      badWebhook,
      badEvent,
      badHeader,
      badSource,
      badClick,
      badWait,
      badScroll,
      plainMarkdown,
    ]).toHaveLength(12);
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
