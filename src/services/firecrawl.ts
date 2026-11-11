import axios, { AxiosError, type AxiosInstance } from 'axios';
import { FirecrawlApiError } from '../utils/errors';
import { normalizeMapLinks, type MapLink } from '../utils/mapLinks';
import type {
  V2BatchScrapeStarted,
  V2BatchScrapeStatus,
  V2CrawlErrors,
  V2Action,
  V2CrawlRequest,
  V2CrawlStarted,
  V2CrawlWebhook,
  V2CrawlStatus,
  V2CreditUsageResponse,
  V2Document,
  V2FormatEntry,
  V2MapRequest,
  V2MapResponse,
  V2QueueStatus,
  V2ScrapeOptions,
  V2ScrapeRequest,
  V2SearchRequest,
  V2SearchSource,
  V2TokenUsageResponse,
} from '../types/firecrawlApi';

/**
 * Normalize a Firecrawl base URL so v2 calls are built from the service root.
 *
 * @param baseUrl - The configured Firecrawl base URL.
 * @returns The normalized API root URL.
 */
export function normalizeFirecrawlBaseUrl(baseUrl?: string): string {
  const fallbackUrl = 'https://api.firecrawl.dev';
  const trimmedBaseUrl = baseUrl?.trim();

  if (!trimmedBaseUrl) {
    return fallbackUrl;
  }

  return trimmedBaseUrl.replace(/\/v[12]\/?$/i, '');
}

/**
 * A Firecrawl v2 document, as described by the official spec.
 *
 * The spec omits two fields the API does return: `json` (the `json` format
 * output) and `images` (the `images` format output); they are added here.
 */
type Document = V2Document & {
  json?: unknown;
  images?: string[];
};

/**
 * Minimal Firecrawl v2 crawl status representation used by the UI.
 */
interface CrawlJob {
  status: 'scraping' | 'completed' | 'failed' | 'cancelled';
  completed: number;
  total: number;
  next?: string | null;
  data: Document[];
}

/**
 * Legacy-shaped response wrapper used by the existing Vue views.
 */
interface WrappedResponse<T> {
  data: T;
}

/**
 * Minimal legacy-shaped scrape response expected by the current UI.
 */
interface LegacyScrapeResponse {
  success: boolean;
  data: Record<string, unknown>;
}

/**
 * Minimal legacy-shaped crawl status response expected by the current UI.
 */
interface LegacyCrawlStatusResponse {
  status: CrawlJob['status'];
  completed: number;
  total: number;
  next: string | null;
  data: Record<string, unknown>[];
}

/**
 * Minimal legacy-shaped search response expected by the current UI.
 */
interface LegacySearchResponse {
  web: Array<Record<string, unknown>>;
  news: Array<Record<string, unknown>>;
  images: Array<Record<string, unknown>>;
}

/**
 * Legacy-compatible scraping client.
 */
export interface FirecrawlScrapingApi {
  scrapeAndExtractFromUrl(
    payload: Record<string, unknown>,
  ): Promise<WrappedResponse<LegacyScrapeResponse>>;
}

/**
 * Legacy-compatible crawling client.
 */
export type CrawlError = NonNullable<V2CrawlErrors['errors']>[number];

/**
 * Crawl error report returned by the errors endpoint.
 */
export interface CrawlErrorsReport {
  errors: CrawlError[];
  robotsBlocked: string[];
}

export interface ActiveCrawl {
  id: string;
  url?: string;
  teamId?: string;
  options?: Record<string, unknown>;
}

export interface FirecrawlCrawlingApi {
  crawlUrls(
    payload: Record<string, unknown>,
  ): Promise<WrappedResponse<{ id: string; url: string }>>;
  getCrawlStatus(id: string): Promise<WrappedResponse<LegacyCrawlStatusResponse>>;
  /**
   * Fetch a crawl's status and every result page, following `next`.
   */
  getCrawlResults(id: string): Promise<WrappedResponse<LegacyCrawlStatusResponse>>;
  cancelCrawl(id: string): Promise<WrappedResponse<{ status: string }>>;
  getCrawlErrors(id: string): Promise<WrappedResponse<CrawlErrorsReport>>;
  getActiveCrawls(): Promise<WrappedResponse<{ crawls: ActiveCrawl[] }>>;
}

/**
 * Status of a batch scrape job, mirroring the crawl status structure with the
 * extra `creditsUsed` counter exposed by the batch endpoint.
 */
export interface BatchScrapeStatusResponse {
  status: CrawlJob['status'];
  completed: number;
  total: number;
  creditsUsed: number;
  next: string | null;
  data: Record<string, unknown>[];
}

/**
 * Legacy-compatible batch scraping client.
 */
export interface FirecrawlBatchScrapingApi {
  batchScrape(
    payload: Record<string, unknown>,
  ): Promise<WrappedResponse<{ id: string; url: string }>>;
  getBatchScrapeStatus(id: string): Promise<WrappedResponse<BatchScrapeStatusResponse>>;
  /**
   * Fetch a batch scrape's status and every result page, following `next`.
   */
  getBatchScrapeResults(id: string): Promise<WrappedResponse<BatchScrapeStatusResponse>>;
  cancelBatchScrape(id: string): Promise<WrappedResponse<{ message: string }>>;
  getBatchScrapeErrors(id: string): Promise<WrappedResponse<CrawlErrorsReport>>;
}

/**
 * Legacy-compatible mapping client.
 */
export interface FirecrawlMappingApi {
  mapUrls(payload: Record<string, unknown>): Promise<WrappedResponse<{ links: MapLink[] }>>;
}

/**
 * Legacy-compatible search client.
 */
export interface FirecrawlSearchApi {
  search(payload: Record<string, unknown>): Promise<WrappedResponse<LegacySearchResponse>>;
}

/**
 * Team credit usage information returned by Firecrawl.
 *
 * Only `remainingCredits` is guaranteed by the API contract; the optional
 * fields are surfaced when the Firecrawl plan exposes them.
 */
export interface CreditUsage {
  remainingCredits: number | null;
  planCredits?: number | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
}

/**
 * Team token usage information returned by Firecrawl (Extract feature).
 */
export interface TokenUsage {
  remainingTokens: number | null;
  planTokens?: number | null;
  billingPeriodStart?: string | null;
  billingPeriodEnd?: string | null;
}

/**
 * Raw `data` object of `GET /v2/team/credit-usage` and `/v2/team/token-usage`.
 *
 * The v2 API answers in camelCase; snake_case keys are still read as a
 * fallback for older self-hosted deployments.
 */
type RawUsage = Record<string, unknown>;

function pickNumber(data: RawUsage, camel: string, snake: string): number | null {
  const value = data[camel] ?? data[snake];
  return typeof value === 'number' ? value : null;
}

function pickString(data: RawUsage, camel: string, snake: string): string | null {
  const value = data[camel] ?? data[snake];
  return typeof value === 'string' ? value : null;
}

/**
 * Normalize the `data` object of `GET /v2/team/credit-usage`.
 *
 * @param data - Raw response `data` object, possibly missing.
 * @returns Credit usage with `null` for every field the server did not send.
 */
export function toCreditUsage(data: RawUsage | null | undefined): CreditUsage {
  const raw = data ?? {};
  return {
    remainingCredits: pickNumber(raw, 'remainingCredits', 'remaining_credits'),
    planCredits: pickNumber(raw, 'planCredits', 'plan_credits'),
    billingPeriodStart: pickString(raw, 'billingPeriodStart', 'billing_period_start'),
    billingPeriodEnd: pickString(raw, 'billingPeriodEnd', 'billing_period_end'),
  };
}

/**
 * Normalize the `data` object of `GET /v2/team/token-usage`.
 *
 * @param data - Raw response `data` object, possibly missing.
 * @returns Token usage with `null` for every field the server did not send.
 */
export function toTokenUsage(data: RawUsage | null | undefined): TokenUsage {
  const raw = data ?? {};
  return {
    remainingTokens: pickNumber(raw, 'remainingTokens', 'remaining_tokens'),
    planTokens: pickNumber(raw, 'planTokens', 'plan_tokens'),
    billingPeriodStart: pickString(raw, 'billingPeriodStart', 'billing_period_start'),
    billingPeriodEnd: pickString(raw, 'billingPeriodEnd', 'billing_period_end'),
  };
}

/**
 * Legacy-compatible billing client.
 */
export interface FirecrawlBillingApi {
  getCreditUsage(): Promise<WrappedResponse<CreditUsage>>;
  getTokenUsage(): Promise<WrappedResponse<TokenUsage>>;
}

/**
 * `GET /v2/team/queue-status` response: the team's scrape queue metrics.
 *
 * Kept exactly as the spec describes it, every counter optional: the
 * connection check relies on missing counters to spot a server that is not a
 * Firecrawl v2 API.
 */
export type QueueStatus = V2QueueStatus;

/**
 * Team-level endpoints.
 */
export interface FirecrawlTeamApi {
  getQueueStatus(): Promise<WrappedResponse<QueueStatus>>;
}

/**
 * A single activity entry emitted while a deep research job progresses.
 */
export interface ResearchActivity {
  type?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  depth?: number;
}

/**
 * A source discovered and analyzed during a deep research job.
 */
export interface ResearchSource {
  url?: string;
  title?: string;
  description?: string;
  favicon?: string;
}

/**
 * Status and results of a deep research job.
 */
export interface DeepResearchStatus {
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  finalAnalysis: string;
  json: Record<string, unknown> | null;
  activities: ResearchActivity[];
  sources: ResearchSource[];
  currentDepth: number;
  maxDepth: number;
  totalUrls: number;
  error: string | null;
  apiVersion: FirecrawlApiVersion;
  warnings: string[];
}

/**
 * Legacy-compatible deep research client.
 */
export interface FirecrawlResearchApi {
  startDeepResearch(
    payload: Record<string, unknown>,
  ): Promise<WrappedResponse<{ id: string; apiVersion: FirecrawlApiVersion }>>;
  getDeepResearchStatus(id: string): Promise<WrappedResponse<DeepResearchStatus>>;
}

/**
 * Status and results of an LLMs.txt generation job.
 */
export interface LlmsTxtStatus {
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  llmstxt: string;
  llmsfulltxt: string;
  apiVersion: FirecrawlApiVersion;
  warnings: string[];
}

/**
 * Legacy-compatible LLMs.txt generation client.
 */
export interface FirecrawlLlmsTxtApi {
  generateLlmsTxt(
    payload: Record<string, unknown>,
  ): Promise<WrappedResponse<{ id: string; apiVersion: FirecrawlApiVersion }>>;
  getLlmsTxtStatus(id: string): Promise<WrappedResponse<LlmsTxtStatus>>;
}

/**
 * Collection of all Firecrawl adapters exposed to Vue.
 */
export interface FirecrawlApiClients {
  billing: FirecrawlBillingApi;
  batchScraping: FirecrawlBatchScrapingApi;
  crawling: FirecrawlCrawlingApi;
  llmsTxt: FirecrawlLlmsTxtApi;
  mapping: FirecrawlMappingApi;
  research: FirecrawlResearchApi;
  scraping: FirecrawlScrapingApi;
  search: FirecrawlSearchApi;
  team: FirecrawlTeamApi;
}

/**
 * Firecrawl error response body (`{ success: false, error, code?, details? }`).
 */
interface FirecrawlErrorBody {
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

/**
 * Convert a failed request into a {@link FirecrawlApiError}.
 *
 * The HTTP status, the API error code and the details from the body are kept
 * so callers can react to a 401 or a 404 without parsing the message.
 *
 * @param error - The error thrown by a request.
 * @param fallback - The default error message.
 * @returns A typed error, or the original error when it did not come from Axios.
 */
function formatApiError(error: unknown, fallback: string): Error {
  if (error instanceof AxiosError) {
    const body =
      error.response?.data && typeof error.response.data === 'object'
        ? (error.response.data as FirecrawlErrorBody)
        : undefined;
    return new FirecrawlApiError(body?.error || body?.message || error.message || fallback, {
      status: error.response?.status,
      code: body?.code,
      details: body?.details,
      network: !error.response,
      cause: error,
    });
  }

  return error instanceof Error ? error : new Error(fallback);
}

/**
 * Build a configured Axios instance for Firecrawl v2 requests.
 *
 * @param apiKey - The Firecrawl API key.
 * @param baseUrl - The Firecrawl API root URL.
 * @returns A configured Axios instance.
 */
function createHttpClient(apiKey: string, baseUrl: string): AxiosInstance {
  return axios.create({
    baseURL: normalizeFirecrawlBaseUrl(baseUrl),
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });
}

/**
 * Firecrawl API versions this adapter can target, in order of preference.
 */
const API_VERSION_PREFERENCE = ['v2', 'v1'] as const;

/**
 * A Firecrawl API version prefix used to build request paths.
 */
export type FirecrawlApiVersion = (typeof API_VERSION_PREFERENCE)[number];

/**
 * Features whose endpoints are not served by every Firecrawl deployment.
 *
 * Deep research and LLMs.txt generation are legacy `/v1` endpoints: the
 * official v2 OpenAPI spec does not define them, and Firecrawl deprecated both
 * and removes them from its cloud API on 2026-12-10 (see
 * `src/config/deprecations.ts`). `/v2` is still tried first, since a
 * deployment answering there is preferred, and a 404 falls back to `/v1`.
 * Every other endpoint this adapter uses exists under `/v2`.
 */
type VersionedFeature = 'deep-research' | 'llmstxt';

/**
 * Records, per feature, which API version the connected instance answers on.
 *
 * This is a correctness requirement, not only an optimization: a job started
 * against one version must be polled on that same version.
 */
type FeatureVersionCache = Map<VersionedFeature, FirecrawlApiVersion>;

/**
 * Tell whether an error is an HTTP 404, meaning the endpoint is not exposed.
 *
 * @param error - The error thrown by an Axios request.
 * @returns True when the response status is 404.
 */
function isEndpointMissing(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

/**
 * Run a request against the first API version the instance actually serves.
 *
 * The resolved version is cached for the lifetime of the client so later calls
 * skip the probe, and so status polls reach the version that started the job.
 *
 * @param cache - The per-client feature version cache.
 * @param feature - The feature whose endpoint availability varies.
 * @param send - Callback issuing the request for a given API version.
 * @returns The result of the first successful attempt.
 * @throws The original error when it is not a missing-endpoint 404, or the
 * last 404 when no candidate version is served.
 */
async function requestWithVersionFallback<T>(
  cache: FeatureVersionCache,
  feature: VersionedFeature,
  send: (version: FirecrawlApiVersion) => Promise<T>,
): Promise<T> {
  const resolvedVersion = cache.get(feature);

  if (resolvedVersion) {
    return send(resolvedVersion);
  }

  let lastError: unknown;

  for (const version of API_VERSION_PREFERENCE) {
    try {
      const result = await send(version);

      cache.set(feature, version);

      if (version !== API_VERSION_PREFERENCE[0]) {
        // Surface the downgrade: self-hosted installs land here on every run.
        console.warn(
          `[firecrawl] "${feature}" is not exposed under /${API_VERSION_PREFERENCE[0]}; ` +
            `falling back to /${version} (self-hosted install).`,
        );
      }

      return result;
    } catch (error) {
      if (!isEndpointMissing(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError;
}

/**
 * Convert a v2 document into the structure expected by the historical UI code.
 *
 * @param document - The Firecrawl v2 document.
 * @returns A normalized document with legacy aliases.
 */
function toLegacyDocument(document: Document): Record<string, unknown> {
  const sourceUrl =
    (typeof document.metadata?.sourceURL === 'string' && document.metadata.sourceURL) ||
    (typeof document.metadata?.url === 'string' && document.metadata.url) ||
    undefined;

  return {
    ...document,
    url: sourceUrl,
    llm_extraction: document.json,
  };
}

/**
 * Normalize a search result so the UI can render it consistently.
 *
 * @param result - A search result object from Firecrawl.
 * @returns A plain object safe to display in Vue templates.
 */
function toPlainSearchResult(result: Record<string, unknown>): Record<string, unknown> {
  return { ...result };
}

/**
 * Convert search results to the flat structure used by the current search view.
 *
 * @param result - A Firecrawl search result or scraped document.
 * @returns A normalized result row.
 */
function toLegacySearchResult(result: Record<string, unknown>): Record<string, unknown> {
  if (
    'markdown' in result ||
    'html' in result ||
    'rawHtml' in result ||
    'metadata' in result ||
    'summary' in result
  ) {
    const legacyDocument = toLegacyDocument(result as Document);
    const metadata =
      typeof legacyDocument.metadata === 'object' && legacyDocument.metadata !== null
        ? (legacyDocument.metadata as Record<string, unknown>)
        : {};

    return {
      ...legacyDocument,
      title:
        (metadata.title as string | undefined) || (legacyDocument.url as string | undefined) || '',
      url: (legacyDocument.url as string | undefined) || '',
      description: (metadata.description as string | undefined) || '',
    };
  }

  return result;
}

/**
 * Whether a value is a plain JSON object.
 *
 * @param value - The value to check.
 * @returns `true` for a non-null, non-array object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whether a value is one of a fixed list of strings.
 *
 * @param value - The value to check.
 * @param allowed - The accepted values.
 * @returns `true` when `value` is in `allowed`.
 */
function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/**
 * Keep a list only when every entry is a string.
 *
 * @param value - The value to check.
 * @returns The list, or `undefined` when it is not an array of strings.
 */
function toStringList(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? value
    : undefined;
}

/**
 * Keep the string-valued entries of an object, as the spec types HTTP headers.
 *
 * @param value - The value to convert.
 * @returns The string entries, or `undefined` when `value` is not an object.
 */
function toStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/**
 * Formats the adapter sends as a plain string. `satisfies` limits the list to
 * the plain forms the spec allows; specConformance.test.ts checks it lists
 * every one of them, so a format added by a spec refresh is not dropped.
 */
export const PLAIN_FORMATS = [
  'markdown',
  'summary',
  'html',
  'rawHtml',
  'rawBase64',
  'links',
  'images',
  'screenshot',
  'json',
  'changeTracking',
  'branding',
  'product',
  'menu',
  'audio',
  'video',
] as const satisfies ReadonlyArray<Extract<V2FormatEntry, string>>;

/** Change-tracking modes of the v2 `changeTracking` format. */
const CHANGE_TRACKING_MODES = ['git-diff', 'json'] as const satisfies ReadonlyArray<
  NonNullable<Extract<V2FormatEntry, { type: 'changeTracking' }>['modes']>[number]
>;

/** Attribute selectors of the v2 `attributes` format. */
type AttributeSelector = Extract<V2FormatEntry, { type: 'attributes' }>['selectors'][number];

/**
 * Keep the well-formed entries of an `attributes` selector list.
 *
 * @param value - The selector list from the legacy payload.
 * @returns The `{ selector, attribute }` entries, or `undefined` when `value` is not a list.
 */
function toAttributeSelectors(value: unknown): AttributeSelector[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.flatMap((entry): AttributeSelector[] =>
    isRecord(entry) && typeof entry.selector === 'string' && typeof entry.attribute === 'string'
      ? [{ selector: entry.selector, attribute: entry.attribute }]
      : [],
  );
}

/**
 * Convert legacy format strings and option blocks to the v2 format structure.
 *
 * @param formats - The format list from the legacy payload.
 * @param payload - The original payload used to enrich JSON and change-tracking formats.
 * @returns A v2-compatible formats array.
 */
function toV2Formats(
  formats: unknown,
  payload: Record<string, unknown>,
): V2FormatEntry[] | undefined {
  if (!Array.isArray(formats) || formats.length === 0) {
    return undefined;
  }

  const extractOptions = isRecord(payload.extract) ? payload.extract : undefined;
  const jsonOptions = isRecord(payload.jsonOptions) ? payload.jsonOptions : undefined;
  const changeTrackingOptions = isRecord(payload.changeTrackingOptions)
    ? payload.changeTrackingOptions
    : undefined;
  const attributesOptions = isRecord(payload.attributesOptions)
    ? payload.attributesOptions
    : undefined;

  return formats.flatMap((format): V2FormatEntry[] => {
    if (format === 'screenshot@fullPage') {
      return [{ type: 'screenshot', fullPage: true }];
    }

    if (format === 'json') {
      const prompt =
        (typeof extractOptions?.prompt === 'string' && extractOptions.prompt) ||
        (typeof jsonOptions?.prompt === 'string' && jsonOptions.prompt) ||
        undefined;
      const schema =
        (isRecord(extractOptions?.schema) ? extractOptions.schema : undefined) ||
        (isRecord(jsonOptions?.schema) ? jsonOptions.schema : undefined);

      return [
        {
          type: 'json',
          ...(prompt ? { prompt } : {}),
          ...(schema ? { schema } : {}),
        },
      ];
    }

    if (format === 'changeTracking') {
      return [
        {
          type: 'changeTracking',
          modes: Array.isArray(changeTrackingOptions?.modes)
            ? changeTrackingOptions.modes.filter((mode) => isOneOf(mode, CHANGE_TRACKING_MODES))
            : ['git-diff'],
          ...(typeof changeTrackingOptions?.prompt === 'string' && changeTrackingOptions.prompt
            ? { prompt: changeTrackingOptions.prompt }
            : {}),
          ...(isRecord(changeTrackingOptions?.schema)
            ? { schema: changeTrackingOptions.schema }
            : {}),
        },
      ];
    }

    if (format === 'attributes') {
      const selectors = toAttributeSelectors(attributesOptions?.selectors);
      return selectors ? [{ type: 'attributes', selectors }] : [];
    }

    return isOneOf(format, PLAIN_FORMATS) ? [format] : [];
  });
}

/**
 * Proxy modes the adapter sends. The published v2 enum lists `basic`,
 * `enhanced` and `auto`; `stealth`, offered by the scrape and crawl forms, is
 * missing from it but still accepted by the server (checked on the self-hosted
 * instance), so it is passed through rather than silently rewritten.
 */
type AdapterProxy = NonNullable<V2ScrapeOptions['proxy']> | 'stealth';

/** Every proxy mode the adapter forwards. */
const PROXY_MODES = [
  'basic',
  'enhanced',
  'auto',
  'stealth',
] as const satisfies ReadonlyArray<AdapterProxy>;

/**
 * Convert the legacy location (a country code or a `{ country, languages }`
 * object) to the v2 location object.
 *
 * @param value - The legacy location.
 * @returns The v2 location, or `undefined` when none is set.
 */
function toV2Location(value: unknown): V2ScrapeOptions['location'] {
  if (typeof value === 'string') {
    return value ? { country: value } : undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const languages = toStringList(value.languages);
  return {
    ...(typeof value.country === 'string' ? { country: value.country } : {}),
    ...(languages ? { languages } : {}),
  };
}

/** Browser action types offered by the scrape form, checked against the v2 spec. */
const ACTION_TYPES = [
  'wait',
  'screenshot',
  'click',
  'write',
  'press',
  'scroll',
  'scrape',
  'executeJavascript',
] as const satisfies ReadonlyArray<V2Action['type']>;

/** Scroll directions of the v2 `scroll` action. */
const SCROLL_DIRECTIONS = ['up', 'down'] as const satisfies ReadonlyArray<
  NonNullable<Extract<V2Action, { type: 'scroll' }>['direction']>
>;

/**
 * A non-empty string, or `undefined`.
 *
 * @param value - The value to check.
 * @returns The string when it is non-empty.
 */
function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * A finite number, or `undefined`.
 *
 * @param value - The value to check.
 * @returns The number when it is finite.
 */
function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Build one v2 browser action from an action editor row.
 *
 * Each variant is rebuilt field by field, so fields left over from another
 * action type are not sent, and an action missing a required field, or with a
 * field of the wrong type, is dropped. A `wait` row with both fields set waits
 * for the duration, matching the first variant of the spec.
 *
 * @param value - The legacy action row.
 * @returns The action, or `undefined` when it does not match the spec.
 */
function toV2Action(value: unknown): V2Action | undefined {
  if (!isRecord(value) || !isOneOf(value.type, ACTION_TYPES)) {
    return undefined;
  }
  switch (value.type) {
    case 'wait': {
      const milliseconds = finiteNumber(value.milliseconds);
      if (milliseconds !== undefined) {
        return { type: 'wait', milliseconds };
      }
      const selector = nonEmptyString(value.selector);
      return selector ? { type: 'wait', selector } : undefined;
    }
    case 'screenshot': {
      const quality = finiteNumber(value.quality);
      const viewport = isRecord(value.viewport) ? value.viewport : undefined;
      const width = finiteNumber(viewport?.width);
      const height = finiteNumber(viewport?.height);
      return {
        type: 'screenshot',
        ...(typeof value.fullPage === 'boolean' ? { fullPage: value.fullPage } : {}),
        ...(quality !== undefined ? { quality } : {}),
        ...(width !== undefined && height !== undefined ? { viewport: { width, height } } : {}),
      };
    }
    case 'click': {
      const selector = nonEmptyString(value.selector);
      if (!selector) {
        return undefined;
      }
      return {
        type: 'click',
        selector,
        ...(typeof value.all === 'boolean' ? { all: value.all } : {}),
      };
    }
    case 'write':
      return typeof value.text === 'string' ? { type: 'write', text: value.text } : undefined;
    case 'press': {
      const key = nonEmptyString(value.key);
      return key ? { type: 'press', key } : undefined;
    }
    case 'scroll': {
      if (value.direction !== undefined && !isOneOf(value.direction, SCROLL_DIRECTIONS)) {
        return undefined;
      }
      const selector = nonEmptyString(value.selector);
      return {
        type: 'scroll',
        ...(value.direction !== undefined ? { direction: value.direction } : {}),
        ...(selector ? { selector } : {}),
      };
    }
    case 'scrape':
      return { type: 'scrape' };
    case 'executeJavascript': {
      const script = nonEmptyString(value.script);
      return script ? { type: 'executeJavascript', script } : undefined;
    }
  }
}

/**
 * Convert the action editor rows to v2 browser actions, dropping the rows
 * that do not match the spec.
 *
 * @param value - The legacy action list.
 * @returns The actions, or `undefined` when `value` is not a list.
 */
function toV2Actions(value: unknown): V2Action[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map(toV2Action).filter((action): action is V2Action => action !== undefined);
}

/** Webhook events of `POST /v2/crawl`. */
const WEBHOOK_EVENTS = ['completed', 'page', 'failed', 'started'] as const satisfies ReadonlyArray<
  NonNullable<V2CrawlWebhook['events']>[number]
>;

/**
 * Convert the crawl form's webhook block to the v2 webhook object.
 *
 * @param value - The legacy webhook block.
 * @returns The webhook, or `undefined` when it has no URL.
 */
function toV2Webhook(value: unknown): V2CrawlWebhook | undefined {
  if (!isRecord(value) || typeof value.url !== 'string' || !value.url) {
    return undefined;
  }
  const headers = toStringRecord(value.headers);
  const events = Array.isArray(value.events)
    ? value.events.filter((event) => isOneOf(event, WEBHOOK_EVENTS))
    : undefined;
  return {
    url: value.url,
    ...(headers ? { headers } : {}),
    ...(isRecord(value.metadata) ? { metadata: value.metadata } : {}),
    ...(events && events.length > 0 ? { events } : {}),
  };
}

/** Search sources the adapter accepts, checked against the v2 spec. */
const SEARCH_SOURCES = ['web', 'images', 'news'] as const satisfies ReadonlyArray<
  Extract<V2SearchSource, string>
>;

/**
 * Keep the search sources the v2 spec knows, in plain string or object form.
 *
 * @param value - The source list from the search form.
 * @returns The sources, or `undefined` when `value` is not a list.
 */
function toV2SearchSources(value: unknown): V2SearchSource[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.flatMap((entry): V2SearchSource[] => {
    if (isOneOf(entry, SEARCH_SOURCES)) {
      return [entry];
    }
    if (!isRecord(entry)) {
      return [];
    }
    if (entry.type === 'web') {
      return [
        {
          type: 'web',
          ...(typeof entry.tbs === 'string' ? { tbs: entry.tbs } : {}),
          ...(typeof entry.location === 'string' ? { location: entry.location } : {}),
        },
      ];
    }
    return entry.type === 'images' || entry.type === 'news' ? [{ type: entry.type }] : [];
  });
}

/**
 * Scrape option keys the adapter may send. `satisfies` checks each one against
 * the v2 spec, so a spec refresh that drops a field fails the type check.
 */
export const SCRAPE_OPTION_KEYS = [
  'formats',
  'includeTags',
  'excludeTags',
  'onlyMainContent',
  'onlyCleanContent',
  'timeout',
  'waitFor',
  'mobile',
  'actions',
  'location',
  'skipTlsVerification',
  'removeBase64Images',
  'blockAds',
  'proxy',
  'maxAge',
  'minAge',
  'storeInCache',
  'lockdown',
  'redactPII',
  'headers',
  'parsers',
] as const satisfies ReadonlyArray<keyof V2ScrapeOptions>;

/**
 * `POST /v2/scrape` body keys the adapter may send: the scrape options plus
 * the request-level fields.
 */
export const SCRAPE_REQUEST_KEYS = [
  'url',
  ...SCRAPE_OPTION_KEYS,
  'zeroDataRetention',
] as const satisfies ReadonlyArray<keyof V2ScrapeRequest>;

/** `POST /v2/crawl` body keys the adapter may send, checked against the v2 spec. */
export const CRAWL_REQUEST_KEYS = [
  'url',
  'excludePaths',
  'includePaths',
  'maxDiscoveryDepth',
  'sitemap',
  'ignoreQueryParameters',
  'limit',
  'allowExternalLinks',
  'allowSubdomains',
  'crawlEntireDomain',
  'delay',
  'maxConcurrency',
  'webhook',
  'scrapeOptions',
] as const satisfies ReadonlyArray<keyof V2CrawlRequest>;

/** `POST /v2/search` body keys the adapter may send, checked against the v2 spec. */
export const SEARCH_REQUEST_KEYS = [
  'query',
  'sources',
  'limit',
  'tbs',
  'location',
  'timeout',
  'scrapeOptions',
] as const satisfies ReadonlyArray<keyof V2SearchRequest>;

/**
 * `POST /v2/search` body as built by the adapter, with the value types of the
 * v2 spec; sources use the plain string form the spec's description allows.
 */
export type SearchRequestBody = Partial<
  Omit<Pick<V2SearchRequest, (typeof SEARCH_REQUEST_KEYS)[number]>, 'sources' | 'scrapeOptions'>
> & {
  sources?: V2SearchSource[];
  scrapeOptions?: ScrapeRequestOptions;
};

/**
 * Scrape options as built by the adapter: the value types of the v2 spec, with
 * two documented exceptions: format entries may use the plain string form the
 * spec's description allows, and the proxy may be `stealth` (see `AdapterProxy`).
 */
export type ScrapeRequestOptions = Partial<
  Omit<Pick<V2ScrapeRequest, (typeof SCRAPE_REQUEST_KEYS)[number]>, 'url' | 'formats' | 'proxy'>
> & {
  formats?: V2FormatEntry[];
  proxy?: AdapterProxy;
};

/**
 * Convert the legacy scrape payload into v2 scrape options.
 *
 * @param payload - The raw legacy payload.
 * @returns The target URL and v2 scrape options.
 */
function toScrapeRequest(payload: Record<string, unknown>): {
  url: string;
  options: ScrapeRequestOptions;
} {
  const url = typeof payload.url === 'string' ? payload.url : '';
  const formats = toV2Formats(payload.formats, payload);
  const location = toV2Location(payload.location);
  const includeTags = toStringList(payload.includeTags);
  const excludeTags = toStringList(payload.excludeTags);
  const actions = toV2Actions(payload.actions);
  const headers = toStringRecord(payload.headers);

  const options: ScrapeRequestOptions = {
    ...(formats ? { formats } : {}),
    ...(includeTags ? { includeTags } : {}),
    ...(excludeTags ? { excludeTags } : {}),
    ...(typeof payload.onlyMainContent === 'boolean'
      ? { onlyMainContent: payload.onlyMainContent }
      : {}),
    ...(typeof payload.onlyCleanContent === 'boolean'
      ? { onlyCleanContent: payload.onlyCleanContent }
      : {}),
    ...(typeof payload.timeout === 'number' ? { timeout: payload.timeout } : {}),
    ...(typeof payload.waitFor === 'number' ? { waitFor: payload.waitFor } : {}),
    ...(typeof payload.mobile === 'boolean' ? { mobile: payload.mobile } : {}),
    ...(actions ? { actions } : {}),
    ...(location ? { location } : {}),
    ...(typeof payload.skipTlsVerification === 'boolean'
      ? { skipTlsVerification: payload.skipTlsVerification }
      : {}),
    ...(typeof payload.removeBase64Images === 'boolean'
      ? { removeBase64Images: payload.removeBase64Images }
      : {}),
    ...(typeof payload.blockAds === 'boolean' ? { blockAds: payload.blockAds } : {}),
    ...(isOneOf(payload.proxy, PROXY_MODES) ? { proxy: payload.proxy } : {}),
    ...(typeof payload.maxAge === 'number' ? { maxAge: payload.maxAge } : {}),
    ...(typeof payload.minAge === 'number' ? { minAge: payload.minAge } : {}),
    ...(typeof payload.storeInCache === 'boolean' ? { storeInCache: payload.storeInCache } : {}),
    ...(typeof payload.lockdown === 'boolean' ? { lockdown: payload.lockdown } : {}),
    ...(typeof payload.redactPII === 'boolean' ? { redactPII: payload.redactPII } : {}),
    ...(typeof payload.zeroDataRetention === 'boolean'
      ? { zeroDataRetention: payload.zeroDataRetention }
      : {}),
    ...(headers ? { headers } : {}),
  };

  // v2 parses PDFs and images by default and turns off every parser missing
  // from an explicit list, so only the opt-out is sent: an empty list returns
  // PDFs as base64.
  if (payload.parsePDF === false) {
    options.parsers = [];
  }

  return { url, options };
}

/** Crawl options as built by the adapter, with the value types of the v2 spec. */
export type CrawlRequestOptions = Partial<
  Omit<Pick<V2CrawlRequest, (typeof CRAWL_REQUEST_KEYS)[number]>, 'url' | 'scrapeOptions'>
> & {
  scrapeOptions?: ScrapeRequestOptions;
};

/**
 * Convert the crawl payload from the old UI to the v2 crawl options.
 *
 * @param payload - The crawl payload built by the view.
 * @returns The target URL and v2 crawl options.
 */
function toCrawlRequest(payload: Record<string, unknown>): {
  url: string;
  options: CrawlRequestOptions;
} {
  const url = typeof payload.url === 'string' ? payload.url : '';
  const scrapeOptions = isRecord(payload.scrapeOptions) ? payload.scrapeOptions : undefined;
  const excludePaths = toStringList(payload.excludePaths);
  const includePaths = toStringList(payload.includePaths);
  const webhook = toV2Webhook(payload.webhook);

  const options: CrawlRequestOptions = {
    ...(excludePaths ? { excludePaths } : {}),
    ...(includePaths ? { includePaths } : {}),
    ...(typeof payload.maxDiscoveryDepth === 'number'
      ? { maxDiscoveryDepth: payload.maxDiscoveryDepth }
      : typeof payload.maxDepth === 'number'
        ? { maxDiscoveryDepth: payload.maxDepth }
        : {}),
    ...(payload.sitemap === 'skip' || payload.sitemap === 'include' || payload.sitemap === 'only'
      ? { sitemap: payload.sitemap }
      : payload.ignoreSitemap === true
        ? { sitemap: 'skip' }
        : {}),
    ...(typeof payload.ignoreQueryParameters === 'boolean'
      ? { ignoreQueryParameters: payload.ignoreQueryParameters }
      : {}),
    ...(typeof payload.limit === 'number' ? { limit: payload.limit } : {}),
    ...(typeof payload.allowExternalLinks === 'boolean'
      ? { allowExternalLinks: payload.allowExternalLinks }
      : {}),
    ...(typeof payload.allowSubdomains === 'boolean'
      ? { allowSubdomains: payload.allowSubdomains }
      : {}),
    ...(typeof payload.crawlEntireDomain === 'boolean'
      ? { crawlEntireDomain: payload.crawlEntireDomain }
      : {}),
    ...(typeof payload.delay === 'number' ? { delay: payload.delay } : {}),
    ...(typeof payload.maxConcurrency === 'number'
      ? { maxConcurrency: payload.maxConcurrency }
      : {}),
    ...(webhook ? { webhook } : {}),
  };

  if (scrapeOptions) {
    const { options: normalizedScrapeOptions } = toScrapeRequest({
      url,
      ...scrapeOptions,
      jsonOptions: scrapeOptions.jsonOptions,
      changeTrackingOptions: scrapeOptions.changeTrackingOptions,
      attributesOptions: scrapeOptions.attributesOptions,
    });
    options.scrapeOptions = normalizedScrapeOptions;
  }

  return { url, options };
}

/**
 * Raw `GET /v2/crawl/{id}` response.
 */
type RawCrawlStatus = Omit<V2CrawlStatus, 'data'> & RawJobPage;

/**
 * Raw `GET /v2/batch/scrape/{id}` response.
 */
type RawBatchStatus = Omit<V2BatchScrapeStatus, 'data'> & RawJobPage;

/** Job statuses the UI knows how to display. */
const JOB_STATUSES: ReadonlyArray<CrawlJob['status']> = [
  'scraping',
  'completed',
  'failed',
  'cancelled',
];

/**
 * Narrow the free-form `status` string of the spec to a status the UI knows.
 *
 * The spec types the crawl and batch `status` as a plain string. An absent or
 * unknown value is reported as still running, so the UI keeps polling instead
 * of mistaking it for a terminal state.
 *
 * @param status - The raw status from the API.
 * @returns A known job status.
 */
export function toJobStatus(status: string | undefined): CrawlJob['status'] {
  return JOB_STATUSES.find((known) => known === status) ?? 'scraping';
}

function toCrawlStatus(raw: RawCrawlStatus, documents: Document[]): LegacyCrawlStatusResponse {
  return {
    status: toJobStatus(raw.status),
    completed: raw.completed ?? 0,
    total: raw.total ?? 0,
    next: raw.next ?? null,
    data: documents.map(toLegacyDocument),
  };
}

function toBatchStatus(raw: RawBatchStatus, documents: Document[]): BatchScrapeStatusResponse {
  return {
    status: toJobStatus(raw.status),
    completed: raw.completed ?? 0,
    total: raw.total ?? 0,
    creditsUsed: raw.creditsUsed ?? 0,
    next: raw.next ?? null,
    data: documents.map(toLegacyDocument),
  };
}

/**
 * Read the job ID and status URL from a crawl or batch scrape start response.
 *
 * @param raw - The start response.
 * @returns The job ID and its status URL.
 * @throws Error when the API answered without a job ID, which leaves nothing to poll.
 */
export function toJobStarted(raw: V2CrawlStarted | V2BatchScrapeStarted): {
  id: string;
  url: string;
} {
  if (!raw.id) {
    throw new Error('The API did not return a job ID');
  }
  return { id: raw.id, url: raw.url ?? '' };
}

/**
 * Upper bound on result pages fetched for one job, as a guard against a
 * server that keeps answering with a `next` link.
 */
export const MAX_RESULT_PAGES = 1000;

/**
 * Turn a `next` link returned by the API into a path on the configured client.
 *
 * The request is always rebuilt from the job path the adapter already knows
 * plus the query string of `next` (e.g. `?skip=10`), and sent through the
 * authenticated client. The API key therefore only ever goes to the configured
 * API URL, even when `next` names another host (a proxy-unaware self-hosted
 * deployment, or a hostile response).
 *
 * @param next - The `next` URL from a status response.
 * @param jobPath - The job's status path, e.g. `/v2/crawl/<id>`.
 * @returns The relative path to request.
 * @throws Error when `next` does not point at the same job.
 */
export function toNextPagePath(next: string, jobPath: string): string {
  let parsed: URL;
  try {
    parsed = new URL(next, 'http://relative.invalid');
  } catch {
    throw new Error(`Invalid pagination URL: ${next}`);
  }
  if (!parsed.pathname.replace(/\/+$/, '').endsWith(jobPath)) {
    throw new Error(`Unexpected pagination URL: ${next}`);
  }
  return `${jobPath}${parsed.search}`;
}

/**
 * A raw status page of a crawl or batch scrape job.
 */
interface RawJobPage {
  next?: string | null;
  data?: Document[];
}

/**
 * Follow the `next` links of a job status response and gather every document.
 *
 * Paging stops when `next` is absent or a page brings no documents: a job
 * that is still running, failed or was cancelled keeps returning `next`, so
 * its absence alone cannot end the loop.
 *
 * @param http - The authenticated client bound to the configured API URL.
 * @param jobPath - The job's status path, e.g. `/v2/crawl/<id>`.
 * @param first - The first status page, already fetched.
 * @returns Every document of the job, in page order.
 */
async function collectResultPages(
  http: AxiosInstance,
  jobPath: string,
  first: RawJobPage,
): Promise<Document[]> {
  const documents = [...(first.data ?? [])];
  let next = first.next ?? null;
  let lastCount = first.data?.length ?? 0;
  let pages = 1;

  while (next && lastCount > 0) {
    if (pages >= MAX_RESULT_PAGES) {
      throw new Error(`Stopped after ${MAX_RESULT_PAGES} result pages`);
    }
    const response = await http.get<RawJobPage>(toNextPagePath(next, jobPath));
    const data = response.data.data ?? [];
    documents.push(...data);
    lastCount = data.length;
    next = response.data.next ?? null;
    pages += 1;
  }

  return documents;
}

/**
 * Build a Firecrawl adapter collection for the current configuration.
 *
 * @param apiKey - The Firecrawl API key.
 * @param baseUrl - The Firecrawl API root URL.
 * @returns A set of legacy-compatible client adapters.
 */
export function createFirecrawlApiClients(apiKey: string, baseUrl: string): FirecrawlApiClients {
  const http = createHttpClient(apiKey, baseUrl);
  const featureVersions: FeatureVersionCache = new Map();

  return {
    billing: {
      async getCreditUsage() {
        try {
          const response = await http.get<V2CreditUsageResponse>('/v2/team/credit-usage');

          return { data: toCreditUsage(response.data.data) };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch credit usage');
        }
      },
      async getTokenUsage() {
        try {
          const response = await http.get<V2TokenUsageResponse>('/v2/team/token-usage');

          return { data: toTokenUsage(response.data.data) };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch token usage');
        }
      },
    },
    team: {
      async getQueueStatus() {
        try {
          const response = await http.get<QueueStatus>('/v2/team/queue-status');

          return { data: response.data };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch queue status');
        }
      },
    },
    scraping: {
      async scrapeAndExtractFromUrl(payload) {
        try {
          const { url, options } = toScrapeRequest(payload);
          const response = await http.post<{ success?: boolean; data?: Document }>('/v2/scrape', {
            url,
            ...options,
          });

          return {
            data: {
              success: response.data.success ?? false,
              data: toLegacyDocument(response.data.data ?? {}),
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Scrape request failed');
        }
      },
    },
    crawling: {
      async crawlUrls(payload) {
        try {
          const { url, options } = toCrawlRequest(payload);
          const response = await http.post<V2CrawlStarted>('/v2/crawl', {
            url,
            ...options,
          });

          return { data: toJobStarted(response.data) };
        } catch (error) {
          throw formatApiError(error, 'Crawl request failed');
        }
      },
      async getCrawlStatus(id) {
        try {
          const response = await http.get<RawCrawlStatus>(`/v2/crawl/${id}`);
          return { data: toCrawlStatus(response.data, response.data.data ?? []) };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch crawl status');
        }
      },
      async getCrawlResults(id) {
        try {
          const jobPath = `/v2/crawl/${id}`;
          const response = await http.get<RawCrawlStatus>(jobPath);
          const documents = await collectResultPages(http, jobPath, response.data);
          return { data: { ...toCrawlStatus(response.data, documents), next: null } };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch crawl results');
        }
      },
      async cancelCrawl(id) {
        try {
          const response = await http.delete<{ success?: boolean; status?: string }>(
            `/v2/crawl/${id}`,
          );

          return {
            data: { status: response.data.status ?? 'cancelled' },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to cancel crawl');
        }
      },
      async getCrawlErrors(id) {
        try {
          const response = await http.get<V2CrawlErrors>(`/v2/crawl/${id}/errors`);

          return {
            data: {
              errors: response.data.errors ?? [],
              robotsBlocked: response.data.robotsBlocked ?? [],
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch crawl errors');
        }
      },
      async getActiveCrawls() {
        try {
          const response = await http.get<{ success?: boolean; crawls?: ActiveCrawl[] }>(
            '/v2/crawl/active',
          );

          return {
            data: { crawls: response.data.crawls ?? [] },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch active crawls');
        }
      },
    },
    batchScraping: {
      async batchScrape(payload) {
        try {
          const urls = Array.isArray(payload.urls)
            ? (payload.urls as unknown[]).filter((url): url is string => typeof url === 'string')
            : [];
          // Reuse the single-scrape option mapping to keep batch options in sync.
          const { options } = toScrapeRequest({ url: '', ...payload });
          const response = await http.post<V2BatchScrapeStarted>('/v2/batch/scrape', {
            urls,
            ...options,
            ...(typeof payload.webhook === 'object' && payload.webhook !== null
              ? { webhook: payload.webhook }
              : {}),
          });

          return { data: toJobStarted(response.data) };
        } catch (error) {
          throw formatApiError(error, 'Batch scrape request failed');
        }
      },
      async getBatchScrapeStatus(id) {
        try {
          const response = await http.get<RawBatchStatus>(`/v2/batch/scrape/${id}`);
          return { data: toBatchStatus(response.data, response.data.data ?? []) };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch batch scrape status');
        }
      },
      async getBatchScrapeResults(id) {
        try {
          const jobPath = `/v2/batch/scrape/${id}`;
          const response = await http.get<RawBatchStatus>(jobPath);
          const documents = await collectResultPages(http, jobPath, response.data);
          return { data: { ...toBatchStatus(response.data, documents), next: null } };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch batch scrape results');
        }
      },
      async cancelBatchScrape(id) {
        try {
          const response = await http.delete<{ success?: boolean; message?: string }>(
            `/v2/batch/scrape/${id}`,
          );

          return {
            data: { message: response.data.message ?? 'Batch scrape job cancelled.' },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to cancel batch scrape');
        }
      },
      async getBatchScrapeErrors(id) {
        try {
          const response = await http.get<V2CrawlErrors>(`/v2/batch/scrape/${id}/errors`);

          return {
            data: {
              errors: response.data.errors ?? [],
              robotsBlocked: response.data.robotsBlocked ?? [],
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch batch scrape errors');
        }
      },
    },
    research: {
      async startDeepResearch(payload) {
        try {
          return await requestWithVersionFallback(
            featureVersions,
            'deep-research',
            async (version) => {
              const response = await http.post<{ success: boolean; id: string }>(
                `/${version}/deep-research`,
                payload,
              );

              return {
                data: { id: response.data.id, apiVersion: version },
              };
            },
          );
        } catch (error) {
          throw formatApiError(error, 'Failed to start deep research');
        }
      },
      async getDeepResearchStatus(id) {
        try {
          return await requestWithVersionFallback(
            featureVersions,
            'deep-research',
            async (version) => {
              type DeepResearchFields = {
                status?: DeepResearchStatus['status'];
                finalAnalysis?: string;
                json?: Record<string, unknown> | null;
                activities?: ResearchActivity[];
                sources?: ResearchSource[];
                currentDepth?: number;
                maxDepth?: number;
                totalUrls?: number;
                error?: string;
              };

              const response = await http.get<
                DeepResearchFields & {
                  success?: boolean;
                  warnings?: string[];
                  data?: DeepResearchFields;
                }
              >(`/${version}/deep-research/${id}`);

              const body = response.data;
              // v2 nests every job field under `data`. The deprecated v1
              // endpoint returns most of them at the top level and nests only
              // activities and sources, so read from both, nested first.
              const data: DeepResearchFields = { ...body, ...(body.data ?? {}) };

              return {
                data: {
                  status: data.status ?? 'processing',
                  finalAnalysis: data.finalAnalysis ?? '',
                  json: data.json ?? null,
                  activities: data.activities ?? [],
                  sources: data.sources ?? [],
                  currentDepth: data.currentDepth ?? 0,
                  maxDepth: data.maxDepth ?? 0,
                  totalUrls: data.totalUrls ?? 0,
                  error: data.error ?? null,
                  apiVersion: version,
                  warnings: body.warnings ?? [],
                },
              };
            },
          );
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch deep research status');
        }
      },
    },
    llmsTxt: {
      async generateLlmsTxt(payload) {
        try {
          return await requestWithVersionFallback(featureVersions, 'llmstxt', async (version) => {
            const response = await http.post<{ success: boolean; id: string }>(
              `/${version}/llmstxt`,
              payload,
            );

            return {
              data: { id: response.data.id, apiVersion: version },
            };
          });
        } catch (error) {
          throw formatApiError(error, 'Failed to start LLMs.txt generation');
        }
      },
      async getLlmsTxtStatus(id) {
        try {
          return await requestWithVersionFallback(featureVersions, 'llmstxt', async (version) => {
            const response = await http.get<{
              success?: boolean;
              status?: LlmsTxtStatus['status'];
              warnings?: string[];
              data?: { llmstxt?: string; llmsfulltxt?: string };
            }>(`/${version}/llmstxt/${id}`);

            const data = response.data.data ?? {};

            return {
              data: {
                status: response.data.status ?? 'processing',
                llmstxt: data.llmstxt ?? '',
                llmsfulltxt: data.llmsfulltxt ?? '',
                apiVersion: version,
                warnings: response.data.warnings ?? [],
              },
            };
          });
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch LLMs.txt status');
        }
      },
    },
    mapping: {
      async mapUrls(payload) {
        try {
          const mapRequest: V2MapRequest = {
            url: String(payload.url ?? ''),
            ...(typeof payload.search === 'string' && payload.search
              ? { search: payload.search }
              : {}),
            ...(payload.sitemap === 'skip' ||
            payload.sitemap === 'include' ||
            payload.sitemap === 'only'
              ? { sitemap: payload.sitemap }
              : payload.sitemapOnly === true
                ? { sitemap: 'only' }
                : payload.ignoreSitemap === true
                  ? { sitemap: 'skip' }
                  : {}),
            ...(typeof payload.includeSubdomains === 'boolean'
              ? { includeSubdomains: payload.includeSubdomains }
              : {}),
            ...(typeof payload.ignoreQueryParameters === 'boolean'
              ? { ignoreQueryParameters: payload.ignoreQueryParameters }
              : {}),
            ...(typeof payload.limit === 'number' ? { limit: payload.limit } : {}),
            ...(typeof payload.timeout === 'number' ? { timeout: payload.timeout } : {}),
          };
          // Older servers answered with plain URL strings instead of link objects.
          const response = await http.post<{
            links?: Array<string | NonNullable<V2MapResponse['links']>[number]>;
          }>('/v2/map', mapRequest);

          return { data: { links: normalizeMapLinks(response.data.links) } };
        } catch (error) {
          throw formatApiError(error, 'Map request failed');
        }
      },
    },
    search: {
      async search(payload) {
        try {
          const sources = toV2SearchSources(payload.sources);
          const searchPayload: SearchRequestBody = {
            query: String(payload.query ?? ''),
            ...(sources ? { sources } : {}),
            ...(typeof payload.limit === 'number' ? { limit: payload.limit } : {}),
            ...(typeof payload.tbs === 'string' && payload.tbs ? { tbs: payload.tbs } : {}),
            ...(typeof payload.location === 'string' && payload.location
              ? { location: payload.location }
              : {}),
            ...(typeof payload.timeout === 'number' ? { timeout: payload.timeout } : {}),
          };

          if (isRecord(payload.scrapeOptions)) {
            searchPayload.scrapeOptions = toScrapeRequest({
              url: 'https://example.com',
              ...payload.scrapeOptions,
            }).options;
          }

          const response = await http.post<{
            success: boolean;
            data?: {
              web?: Array<Record<string, unknown>>;
              news?: Array<Record<string, unknown>>;
              images?: Array<Record<string, unknown>>;
            };
          }>('/v2/search', searchPayload);

          return {
            data: {
              web: (response.data.data?.web ?? []).map(toLegacySearchResult),
              news: (response.data.data?.news ?? []).map(toPlainSearchResult),
              images: (response.data.data?.images ?? []).map(toPlainSearchResult),
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Search request failed');
        }
      },
    },
  };
}
