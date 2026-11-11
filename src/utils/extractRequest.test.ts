import { afterEach, describe, expect, it } from 'vitest';
import { SCRAPE_REQUEST_KEYS, createFirecrawlApiClients } from '@/services/firecrawl';
import { stubHttp } from '@/test/httpStub';
import {
  EXTRACT_SCRAPE_DEFAULTS,
  buildExtractScrapePayload,
  combineExtractResults,
  defaultExtractScrapeOptions,
  formatResultValue,
  parseExtractUrls,
  toExtractPageResult,
  toResultRows,
  type ExtractRequestInput,
} from './extractRequest';

const BASE = 'https://firecrawl.example.test';
const SCHEMA = { type: 'object', properties: { title: { type: 'string' } } };
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

/**
 * Send one extraction through the real adapter against a stubbed server.
 *
 * @returns The body sent to `/v2/scrape`, every request made, and the document
 *   the adapter handed back to the view.
 */
async function extractThroughAdapter(input: ExtractRequestInput, document: unknown) {
  const stub = stubHttp({
    [`${BASE}/v2/scrape`]: { data: { success: true, data: document } },
  });
  restore = stub.restore;
  const api = createFirecrawlApiClients('', BASE);
  const response = await api.scraping.scrapeAndExtractFromUrl(buildExtractScrapePayload(input));
  return {
    body: stub.requests[0].data as Record<string, unknown>,
    requests: stub.requests,
    document: response.data.data,
  };
}

describe('buildExtractScrapePayload through the adapter', () => {
  it('sends the json format with prompt and schema to /v2/scrape only', async () => {
    const { body, requests } = await extractThroughAdapter(
      {
        url: 'https://example.com',
        prompt: '  Get the title  ',
        schema: SCHEMA,
        options: defaultExtractScrapeOptions(),
      },
      { json: { title: 'Example' } },
    );

    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('POST');
    expect(requests[0].url).toBe(`${BASE}/v2/scrape`);
    expect(body).toEqual({
      url: 'https://example.com',
      formats: [{ type: 'json', prompt: 'Get the title', schema: SCHEMA }],
    });
  });

  it('sends a json format with only a prompt or only a schema', async () => {
    const promptOnly = await extractThroughAdapter(
      { url: 'https://a.test', prompt: 'p', options: defaultExtractScrapeOptions() },
      { json: {} },
    );
    expect(promptOnly.body.formats).toEqual([{ type: 'json', prompt: 'p' }]);

    const schemaOnly = await extractThroughAdapter(
      { url: 'https://a.test', schema: SCHEMA, options: defaultExtractScrapeOptions() },
      { json: {} },
    );
    expect(schemaOnly.body.formats).toEqual([{ type: 'json', schema: SCHEMA }]);
  });

  it('sends only the options that differ from the v2 defaults', async () => {
    const { body } = await extractThroughAdapter(
      {
        url: 'https://example.com',
        prompt: 'p',
        headers: { 'x-test': '1' },
        options: {
          ...defaultExtractScrapeOptions(),
          onlyMainContent: false,
          includeTags: 'main, article',
          excludeTags: 'nav',
          waitFor: 500,
          timeout: 30000,
          maxAge: 0,
          mobile: true,
          blockAds: false,
          removeBase64Images: false,
          skipTlsVerification: true,
          storeInCache: false,
          proxy: 'enhanced',
          locationCountry: ' fr ',
          locationLanguages: 'fr-FR, en',
        },
      },
      { json: {} },
    );

    expect(body).toEqual({
      url: 'https://example.com',
      formats: [{ type: 'json', prompt: 'p' }],
      onlyMainContent: false,
      includeTags: ['main', 'article'],
      excludeTags: ['nav'],
      waitFor: 500,
      timeout: 30000,
      maxAge: 0,
      mobile: true,
      blockAds: false,
      removeBase64Images: false,
      skipTlsVerification: true,
      storeInCache: false,
      proxy: 'enhanced',
      location: { country: 'FR', languages: ['fr-FR', 'en'] },
      headers: { 'x-test': '1' },
    });
    for (const key of Object.keys(body)) {
      expect(SCRAPE_REQUEST_KEYS).toContain(key);
    }
  });

  it('never sends the /v2/extract-only fields', async () => {
    const { body } = await extractThroughAdapter(
      { url: 'https://example.com', prompt: 'p', options: defaultExtractScrapeOptions() },
      { json: {} },
    );
    for (const key of [
      'urls',
      'enableWebSearch',
      'showSources',
      'allowExternalLinks',
      'ignoreSitemap',
      'includeSubdomains',
      'ignoreInvalidURLs',
      'scrapeOptions',
      'extract',
      'jsonOptions',
    ]) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it('hands the json output back to the view', async () => {
    const { document } = await extractThroughAdapter(
      { url: 'https://example.com', prompt: 'p', options: defaultExtractScrapeOptions() },
      { json: { title: 'Example' }, metadata: { statusCode: 200 } },
    );
    expect(toExtractPageResult('https://example.com', document)).toEqual({
      url: 'https://example.com',
      ok: true,
      json: { title: 'Example' },
    });
  });
});

describe('buildExtractScrapePayload', () => {
  it('rejects a request with neither a prompt nor a schema', () => {
    expect(() =>
      buildExtractScrapePayload({
        url: 'https://example.com',
        prompt: '   ',
        options: defaultExtractScrapeOptions(),
      }),
    ).toThrow('Provide a prompt or a JSON schema.');
  });

  it('leaves out an invalid country code and empty headers', () => {
    const payload = buildExtractScrapePayload({
      url: 'https://example.com',
      prompt: 'p',
      headers: {},
      options: { ...defaultExtractScrapeOptions(), locationCountry: 'EUROPE' },
    });
    expect(payload).not.toHaveProperty('location');
    expect(payload).not.toHaveProperty('headers');
  });

  it('defaults to the documented v2 values', () => {
    expect(EXTRACT_SCRAPE_DEFAULTS.removeBase64Images).toBe(true);
    expect(EXTRACT_SCRAPE_DEFAULTS.proxy).toBe('auto');
    expect(defaultExtractScrapeOptions()).not.toBe(defaultExtractScrapeOptions());
  });
});

describe('parseExtractUrls', () => {
  it('trims, drops blank lines and de-duplicates in order', () => {
    expect(parseExtractUrls(' https://a.test \n\nhttps://b.test\nhttps://a.test\n')).toEqual([
      'https://a.test',
      'https://b.test',
    ]);
  });

  it('returns nothing for an empty field', () => {
    expect(parseExtractUrls('  \n ')).toEqual([]);
  });
});

describe('toExtractPageResult', () => {
  it('fails with the server warning when the page has no json', () => {
    expect(toExtractPageResult('https://a.test', { warning: 'LLM extraction failed' })).toEqual({
      url: 'https://a.test',
      ok: false,
      error: 'LLM extraction failed',
    });
  });

  it('fails with a generic message when there is no json and no warning', () => {
    expect(toExtractPageResult('https://a.test', { json: null })).toEqual({
      url: 'https://a.test',
      ok: false,
      error: 'The page returned no JSON data.',
    });
    expect(toExtractPageResult('https://a.test', undefined).ok).toBe(false);
  });

  it('keeps falsy but present json values', () => {
    expect(toExtractPageResult('https://a.test', { json: 0 })).toEqual({
      url: 'https://a.test',
      ok: true,
      json: 0,
    });
  });
});

describe('combineExtractResults', () => {
  it('returns the json itself for a single URL', () => {
    expect(combineExtractResults([{ url: 'https://a.test', ok: true, json: { a: 1 } }])).toEqual({
      a: 1,
    });
  });

  it('keys the successful pages by URL when there are several', () => {
    expect(
      combineExtractResults([
        { url: 'https://a.test', ok: true, json: { a: 1 } },
        { url: 'https://b.test', ok: false, error: 'boom' },
        { url: 'https://c.test', ok: true, json: [1, 2] },
      ]),
    ).toEqual({ 'https://a.test': { a: 1 }, 'https://c.test': [1, 2] });
  });

  it('returns null when no page succeeded', () => {
    expect(combineExtractResults([])).toBeNull();
    expect(combineExtractResults([{ url: 'https://a.test', ok: false, error: 'x' }])).toBeNull();
  });
});

describe('result display', () => {
  it('turns an object into key/value rows', () => {
    expect(toResultRows({ title: 'Example', price: 9.5, tags: ['a'], owner: null })).toEqual([
      { key: 'title', value: 'Example' },
      { key: 'price', value: '9.5' },
      { key: 'tags', value: '["a"]' },
      { key: 'owner', value: '—' },
    ]);
  });

  it('leaves scalars and arrays to the pre-formatted fallback', () => {
    expect(toResultRows('text')).toBeNull();
    expect(toResultRows([1, 2])).toBeNull();
    expect(toResultRows(null)).toBeNull();
  });

  it('formats single values', () => {
    expect(formatResultValue(undefined)).toBe('—');
    expect(formatResultValue({ a: 1 })).toBe('{"a":1}');
    expect(formatResultValue(true)).toBe('true');
  });
});
