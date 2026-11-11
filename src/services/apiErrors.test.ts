import axios, { AxiosError } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { createFirecrawlApiClients } from './firecrawl';
import { stubHttp } from '@/test/httpStub';
import { FirecrawlApiError, describeRequestError, isUnauthorized } from '@/utils/errors';

const BASE = 'https://firecrawl.example.test';
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

/**
 * Run a call and return what it threw.
 */
async function thrown(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw');
}

describe('API errors', () => {
  it('keeps the HTTP status, code and details of an error response', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/scrape`]: {
        status: 400,
        data: {
          success: false,
          code: 'BAD_REQUEST',
          error: 'Invalid country code',
          details: [{ path: ['location', 'country'] }],
        },
      },
    });
    restore = stub.restore;
    const api = createFirecrawlApiClients('', BASE);

    const error = await thrown(() =>
      api.scraping.scrapeAndExtractFromUrl({ url: 'https://site.test', formats: ['markdown'] }),
    );

    expect(error).toBeInstanceOf(FirecrawlApiError);
    const apiError = error as FirecrawlApiError;
    expect(apiError.message).toBe('Invalid country code');
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe('BAD_REQUEST');
    expect(apiError.details).toEqual([{ path: ['location', 'country'] }]);
    expect(apiError.network).toBe(false);
    expect(describeRequestError(apiError)).toBe('Invalid country code (HTTP 400)');
  });

  it('recognises a 401 even though the message is the server text', async () => {
    const stub = stubHttp({
      [`${BASE}/v2/crawl/job-1`]: {
        status: 401,
        data: { success: false, error: 'Unauthorized: Invalid token' },
      },
    });
    restore = stub.restore;
    const api = createFirecrawlApiClients('', BASE);

    const error = await thrown(() => api.crawling.getCrawlStatus('job-1'));

    // The old check looked for "401" in the message, which the server text lacks.
    expect((error as Error).message).not.toContain('401');
    expect(isUnauthorized(error)).toBe(true);
  });

  it('labels a 404 and a network failure from the status, not the message', async () => {
    const stub = stubHttp({});
    restore = stub.restore;
    const api = createFirecrawlApiClients('', BASE);

    const notFound = await thrown(() => api.crawling.getCrawlStatus('missing'));
    expect((notFound as FirecrawlApiError).status).toBe(404);
    expect(describeRequestError(notFound)).toBe('Resource not found (404): Not found');
    expect(isUnauthorized(notFound)).toBe(false);

    stub.restore();
    const previous = axios.defaults.adapter;
    axios.defaults.adapter = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };
    restore = () => {
      axios.defaults.adapter = previous;
    };

    const offline = await thrown(() =>
      createFirecrawlApiClients('', BASE).crawling.getCrawlStatus('job-1'),
    );
    expect((offline as FirecrawlApiError).network).toBe(true);
    expect((offline as FirecrawlApiError).status).toBeUndefined();
    expect(describeRequestError(offline)).toBe('Network connection failed: Network Error');
  });
});
