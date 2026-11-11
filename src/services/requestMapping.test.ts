import { afterEach, describe, expect, it } from 'vitest';
import { createFirecrawlApiClients } from './firecrawl';
import { stubHttp } from '@/test/httpStub';

const BASE = 'https://firecrawl.example.test';
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

/**
 * Stub one POST endpoint and return the body the client sent to it.
 */
async function sentBody(
  path: string,
  response: unknown,
  call: (api: ReturnType<typeof createFirecrawlApiClients>) => Promise<unknown>,
): Promise<Record<string, unknown>> {
  const stub = stubHttp({ [`${BASE}${path}`]: { data: response } });
  restore = stub.restore;
  await call(createFirecrawlApiClients('', BASE));
  expect(stub.requests).toHaveLength(1);
  return stub.requests[0].data as Record<string, unknown>;
}

const scrapeOk = { success: true, data: { markdown: '# ok', metadata: {} } };

describe('scrape request mapping', () => {
  it('sends an empty parser list when PDF parsing is turned off', async () => {
    const body = await sentBody('/v2/scrape', scrapeOk, (api) =>
      api.scraping.scrapeAndExtractFromUrl({
        url: 'https://site.test/doc.pdf',
        formats: ['markdown'],
        parsePDF: false,
      }),
    );
    expect(body.parsers).toEqual([]);
  });

  it('leaves parsers to the server default when PDF parsing is on', async () => {
    const body = await sentBody('/v2/scrape', scrapeOk, (api) =>
      api.scraping.scrapeAndExtractFromUrl({
        url: 'https://site.test/doc.pdf',
        formats: ['markdown'],
        parsePDF: true,
      }),
    );
    // An explicit ['pdf'] list would silently turn image OCR off.
    expect(body).not.toHaveProperty('parsers');
  });

  it('forwards an explicit timeout and the change-tracking format without legacy fields', async () => {
    const body = await sentBody('/v2/scrape', scrapeOk, (api) =>
      api.scraping.scrapeAndExtractFromUrl({
        url: 'https://site.test/',
        formats: ['markdown', 'changeTracking'],
        timeout: 30000,
        location: { country: 'DE' },
      }),
    );
    expect(body.timeout).toBe(30000);
    expect(body.location).toEqual({ country: 'DE' });
    expect(body.formats).toEqual(['markdown', { type: 'changeTracking', modes: ['git-diff'] }]);
    expect(JSON.stringify(body)).not.toMatch(/threshold|frequency/);
  });
});

describe('crawl request mapping', () => {
  const crawlOk = { success: true, id: 'job-1', url: `${BASE}/v2/crawl/job-1` };

  it('sends crawlEntireDomain and the sitemap mode', async () => {
    const body = await sentBody('/v2/crawl', crawlOk, (api) =>
      api.crawling.crawlUrls({
        url: 'https://site.test/docs',
        crawlEntireDomain: true,
        sitemap: 'skip',
        limit: 5,
      }),
    );
    expect(body).toMatchObject({
      url: 'https://site.test/docs',
      crawlEntireDomain: true,
      sitemap: 'skip',
      limit: 5,
    });
    expect(body).not.toHaveProperty('allowBackwardLinks');
  });

  it('builds the json format from prompt and schema only', async () => {
    const schema = { type: 'object', properties: { title: { type: 'string' } } };
    const body = await sentBody('/v2/crawl', crawlOk, (api) =>
      api.crawling.crawlUrls({
        url: 'https://site.test/',
        scrapeOptions: {
          formats: ['json'],
          jsonOptions: { prompt: 'Get the title', schema },
          timeout: 45000,
        },
      }),
    );
    expect(body.scrapeOptions).toEqual({
      formats: [{ type: 'json', prompt: 'Get the title', schema }],
      timeout: 45000,
    });
  });
});

describe('map request mapping', () => {
  it('forwards includeSubdomains and a limit above the old 30000 cap', async () => {
    const body = await sentBody('/v2/map', { success: true, links: [] }, (api) =>
      api.mapping.mapUrls({
        url: 'https://site.test/',
        sitemap: 'include',
        includeSubdomains: true,
        limit: 100000,
      }),
    );
    expect(body).toEqual({
      url: 'https://site.test/',
      sitemap: 'include',
      includeSubdomains: true,
      limit: 100000,
    });
  });

  it('keeps title and description and still accepts plain-string links', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/map`]: {
        data: {
          success: true,
          links: [
            { url: 'https://site.test/a', title: 'A', description: 'About A' },
            'https://site.test/b',
          ],
        },
      },
    });
    restore = stub.restore;
    const result = await createFirecrawlApiClients('', BASE).mapping.mapUrls({
      url: 'https://site.test/',
    });
    expect(result.data.links).toEqual([
      { url: 'https://site.test/a', title: 'A', description: 'About A' },
      { url: 'https://site.test/b' },
    ]);
  });
});
