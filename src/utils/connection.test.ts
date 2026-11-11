import { afterEach, describe, expect, it } from 'vitest';
import { isApiKeyMissing, isFirecrawlCloud, testConnection } from './connection';
import { stubHttp } from '@/test/httpStub';

const SELF_HOSTED = 'https://firecrawl.example.test';
let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
});

const queueStatus = {
  success: true,
  jobsInQueue: 0,
  activeJobsInQueue: 0,
  waitingJobsInQueue: 0,
  maxConcurrency: 2,
  mostRecentSuccess: null,
};

describe('isFirecrawlCloud', () => {
  it('treats an empty URL and api.firecrawl.dev as Firecrawl Cloud', () => {
    expect(isFirecrawlCloud('')).toBe(true);
    expect(isFirecrawlCloud(undefined)).toBe(true);
    expect(isFirecrawlCloud('https://api.firecrawl.dev/v2')).toBe(true);
  });

  it('treats any other host as self-hosted', () => {
    expect(isFirecrawlCloud(SELF_HOSTED)).toBe(false);
    expect(isFirecrawlCloud('http://localhost:3002')).toBe(false);
    // A host that merely contains the cloud name is not the cloud.
    expect(isFirecrawlCloud('https://api.firecrawl.dev.example.test')).toBe(false);
  });
});

describe('isApiKeyMissing', () => {
  it('requires a key for Firecrawl Cloud only', () => {
    expect(isApiKeyMissing('', '')).toBe(true);
    expect(isApiKeyMissing('', '  ')).toBe(true);
    expect(isApiKeyMissing('', 'fc-test')).toBe(false);
    expect(isApiKeyMissing(SELF_HOSTED, '')).toBe(false);
  });
});

describe('testConnection', () => {
  it('reaches a self-hosted queue status without a key or an Authorization header', async () => {
    const stub = stubHttp({ [`${SELF_HOSTED}/v2/team/queue-status`]: { data: queueStatus } });
    restore = stub.restore;

    const result = await testConnection(`${SELF_HOSTED}/v2/`, '');

    expect(result.ok).toBe(true);
    expect(result.message).toContain('max concurrency 2');
    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0].headers.Authorization).toBeUndefined();
  });

  it('sends the key under test, not the saved one', async () => {
    const stub = stubHttp({ [`${SELF_HOSTED}/v2/team/queue-status`]: { data: queueStatus } });
    restore = stub.restore;

    await testConnection(SELF_HOSTED, ' fc-under-test ');

    expect(stub.requests[0].headers.Authorization).toBe('Bearer fc-under-test');
  });

  it('reports a missing or rejected key on 401', async () => {
    const stub = stubHttp({
      [`${SELF_HOSTED}/v2/team/queue-status`]: {
        status: 401,
        data: { success: false, error: 'Unauthorized' },
      },
    });
    restore = stub.restore;

    const withoutKey = await testConnection(SELF_HOSTED, '');
    const withKey = await testConnection(SELF_HOSTED, 'fc-wrong');

    expect(withoutKey).toEqual({ ok: false, message: `${SELF_HOSTED} requires an API key (401).` });
    expect(withKey).toEqual({ ok: false, message: `${SELF_HOSTED} rejected the API key (401).` });
  });

  it('does not report a non-Firecrawl answer as connected', async () => {
    const stub = stubHttp({
      [`${SELF_HOSTED}/v2/team/queue-status`]: { data: '<!doctype html><title>Login</title>' },
    });
    restore = stub.restore;

    const result = await testConnection(SELF_HOSTED, '');

    expect(result.ok).toBe(false);
    expect(result.message).toContain('not like a Firecrawl v2 API');
  });

  it('reports any other failure with its status', async () => {
    const stub = stubHttp({
      [`${SELF_HOSTED}/v2/team/queue-status`]: {
        status: 500,
        data: { success: false, error: 'Internal error' },
      },
    });
    restore = stub.restore;

    const result = await testConnection(SELF_HOSTED, '');

    expect(result.ok).toBe(false);
    expect(result.message).toBe(`Could not reach ${SELF_HOSTED}: Internal error (HTTP 500)`);
  });
});
