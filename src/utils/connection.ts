import { createFirecrawlApiClients, normalizeFirecrawlBaseUrl } from '@/services/firecrawl';
import { FirecrawlApiError, describeRequestError } from './errors';

/** Host of Firecrawl Cloud, the only deployment that always requires a key. */
const FIRECRAWL_CLOUD_HOST = 'api.firecrawl.dev';

/**
 * Tell whether a base URL points at Firecrawl Cloud.
 *
 * An empty value means the default URL, which is Firecrawl Cloud. Any other
 * host is treated as a self-hosted instance, which may run without a key.
 *
 * @param baseUrl - The configured base URL, possibly empty.
 * @returns True when requests go to Firecrawl Cloud.
 */
export function isFirecrawlCloud(baseUrl: string | undefined): boolean {
  const normalized = normalizeFirecrawlBaseUrl(baseUrl);
  try {
    return new URL(normalized).hostname.toLowerCase() === FIRECRAWL_CLOUD_HOST;
  } catch {
    return false;
  }
}

/**
 * Tell whether a configuration lacks a key it needs.
 *
 * @param baseUrl - The configured base URL, possibly empty.
 * @param apiKey - The configured API key, possibly empty.
 * @returns True when the target is Firecrawl Cloud and no key is set.
 */
export function isApiKeyMissing(baseUrl: string | undefined, apiKey: string | undefined): boolean {
  return isFirecrawlCloud(baseUrl) && !apiKey?.trim();
}

/**
 * Outcome of {@link testConnection}.
 */
export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

/**
 * Check that a base URL and key reach a working Firecrawl API.
 *
 * Calls `GET /v2/team/queue-status`, which costs no credits and answers on
 * self-hosted instances too. The values tested are the ones passed in, not the
 * saved configuration, so a setting can be checked before it is saved.
 *
 * @param baseUrl - The base URL to test, possibly empty for Firecrawl Cloud.
 * @param apiKey - The API key to test, possibly empty.
 * @returns Whether the API answered, and a message for the settings form.
 */
export async function testConnection(
  baseUrl: string,
  apiKey: string,
): Promise<ConnectionTestResult> {
  const target = normalizeFirecrawlBaseUrl(baseUrl);
  try {
    const { data } = await createFirecrawlApiClients(apiKey.trim(), target).team.getQueueStatus();
    // A proxy or another web app can answer 200 too; only trust the documented shape.
    if (typeof data?.jobsInQueue !== 'number' || typeof data?.maxConcurrency !== 'number') {
      return {
        ok: false,
        message: `${target} answered, but not like a Firecrawl v2 API (no queue status).`,
      };
    }
    return {
      ok: true,
      message:
        `Connected to ${target}: ${data.jobsInQueue} job(s) in queue, ` +
        `max concurrency ${data.maxConcurrency}.`,
    };
  } catch (error) {
    if (error instanceof FirecrawlApiError && error.status === 401) {
      return {
        ok: false,
        message: apiKey.trim()
          ? `${target} rejected the API key (401).`
          : `${target} requires an API key (401).`,
      };
    }
    return { ok: false, message: `Could not reach ${target}: ${describeRequestError(error)}` };
  }
}
