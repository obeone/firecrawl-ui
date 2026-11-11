import axios, { AxiosError, type AxiosInstance } from 'axios';

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
 * Shared metadata structure returned by Firecrawl documents.
 */
interface DocumentMetadata {
  title?: string;
  description?: string;
  url?: string;
  sourceURL?: string;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * Minimal Firecrawl v2 document representation used by the UI.
 */
interface Document {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  json?: unknown;
  summary?: string;
  metadata?: DocumentMetadata;
  links?: string[];
  images?: string[];
  screenshot?: string;
  attributes?: Array<{
    selector: string;
    attribute: string;
    values: string[];
  }>;
  changeTracking?: Record<string, unknown>;
  branding?: Record<string, unknown>;
  warning?: string;
}

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
 * Minimal Firecrawl extract response representation used by the UI.
 */
export interface FirecrawlExtractResponse {
  success?: boolean;
  id?: string;
  status?: 'processing' | 'completed' | 'failed' | 'cancelled';
  data?: unknown;
  error?: string;
  warning?: string;
  sources?: Record<string, unknown>;
  /** URLs from the request that the API rejected as invalid (malformed or disallowed). */
  invalidURLs?: string[] | null;
  /** ISO timestamp after which the job result is no longer retrievable. */
  expiresAt?: string;
  /** Number of LLM tokens consumed while extracting structured data. */
  tokensUsed?: number;
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
export interface CrawlError {
  id?: string;
  timestamp?: string | null;
  url?: string;
  error?: string;
}

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
 * Legacy-compatible extraction client.
 */
export interface FirecrawlExtractionApi {
  extractData(payload: Record<string, unknown>): Promise<WrappedResponse<FirecrawlExtractResponse>>;
  getExtractStatus(id: string): Promise<WrappedResponse<FirecrawlExtractResponse>>;
}

/**
 * Legacy-compatible mapping client.
 */
export interface FirecrawlMappingApi {
  mapUrls(payload: Record<string, unknown>): Promise<WrappedResponse<{ links: string[] }>>;
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
  status: 'processing' | 'completed' | 'failed';
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
  status: 'processing' | 'completed' | 'failed';
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
  extraction: FirecrawlExtractionApi;
  llmsTxt: FirecrawlLlmsTxtApi;
  mapping: FirecrawlMappingApi;
  research: FirecrawlResearchApi;
  scraping: FirecrawlScrapingApi;
  search: FirecrawlSearchApi;
}

/**
 * Convert an Axios error to a readable message.
 *
 * @param error - The Axios error thrown by a request.
 * @param fallback - The default error message.
 * @returns A user-facing error message.
 */
function formatApiError(error: unknown, fallback: string): Error {
  if (error instanceof AxiosError) {
    const responseMessage =
      (error.response?.data as { error?: string; message?: string } | undefined)?.error ||
      (error.response?.data as { error?: string; message?: string } | undefined)?.message;
    return new Error(responseMessage || error.message || fallback);
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
 * Firecrawl Cloud exposes deep research and LLMs.txt generation under `/v2`;
 * self-hosted installs only serve them under `/v1` and answer `/v2` with a
 * 404. Every other endpoint this adapter uses exists under `/v2` on both.
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
 * Pause execution for a small amount of time while polling long-running jobs.
 *
 * @param milliseconds - The delay duration in milliseconds.
 * @returns A promise resolved after the delay.
 */
function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
 * Convert legacy format strings and option blocks to the v2 format structure.
 *
 * @param formats - The format list from the legacy payload.
 * @param payload - The original payload used to enrich JSON and change-tracking formats.
 * @returns A v2-compatible formats array.
 */
function toV2Formats(
  formats: unknown,
  payload: Record<string, unknown>,
): Array<string | Record<string, unknown>> | undefined {
  if (!Array.isArray(formats) || formats.length === 0) {
    return undefined;
  }

  const extractOptions =
    typeof payload.extract === 'object' && payload.extract !== null
      ? (payload.extract as Record<string, unknown>)
      : undefined;
  const jsonOptions =
    typeof payload.jsonOptions === 'object' && payload.jsonOptions !== null
      ? (payload.jsonOptions as Record<string, unknown>)
      : undefined;
  const changeTrackingOptions =
    typeof payload.changeTrackingOptions === 'object' && payload.changeTrackingOptions !== null
      ? (payload.changeTrackingOptions as Record<string, unknown>)
      : undefined;
  const attributesOptions =
    typeof payload.attributesOptions === 'object' && payload.attributesOptions !== null
      ? (payload.attributesOptions as Record<string, unknown>)
      : undefined;

  return formats.flatMap((format): Array<string | Record<string, unknown>> => {
    if (format === 'screenshot@fullPage') {
      return [{ type: 'screenshot', fullPage: true }];
    }

    if (format === 'json') {
      const prompt =
        (typeof extractOptions?.prompt === 'string' && extractOptions.prompt) ||
        (typeof jsonOptions?.prompt === 'string' && jsonOptions.prompt) ||
        undefined;
      const schema =
        (typeof extractOptions?.schema === 'object' && extractOptions.schema !== null
          ? extractOptions.schema
          : undefined) ||
        (typeof jsonOptions?.schema === 'object' && jsonOptions.schema !== null
          ? jsonOptions.schema
          : undefined);

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
            ? changeTrackingOptions.modes
            : ['git-diff'],
          ...(typeof changeTrackingOptions?.prompt === 'string' && changeTrackingOptions.prompt
            ? { prompt: changeTrackingOptions.prompt }
            : {}),
          ...(typeof changeTrackingOptions?.schema === 'object' &&
          changeTrackingOptions.schema !== null
            ? { schema: changeTrackingOptions.schema }
            : {}),
        },
      ];
    }

    if (format === 'attributes') {
      return Array.isArray(attributesOptions?.selectors)
        ? [
            {
              type: 'attributes',
              selectors: attributesOptions.selectors,
            },
          ]
        : [];
    }

    return typeof format === 'string' ? [format] : [];
  });
}

/**
 * Convert the legacy scrape payload into v2 scrape options.
 *
 * @param payload - The raw legacy payload.
 * @returns The target URL and v2 scrape options.
 */
function toScrapeRequest(payload: Record<string, unknown>): {
  url: string;
  options: Record<string, unknown>;
} {
  const url = typeof payload.url === 'string' ? payload.url : '';
  const formats = toV2Formats(payload.formats, payload);
  const location =
    typeof payload.location === 'object' && payload.location !== null
      ? payload.location
      : typeof payload.location === 'string' && payload.location
        ? { country: payload.location }
        : undefined;

  const options: Record<string, unknown> = {
    ...(formats ? { formats } : {}),
    ...(Array.isArray(payload.includeTags) ? { includeTags: payload.includeTags } : {}),
    ...(Array.isArray(payload.excludeTags) ? { excludeTags: payload.excludeTags } : {}),
    ...(typeof payload.onlyMainContent === 'boolean'
      ? { onlyMainContent: payload.onlyMainContent }
      : {}),
    ...(typeof payload.onlyCleanContent === 'boolean'
      ? { onlyCleanContent: payload.onlyCleanContent }
      : {}),
    ...(typeof payload.timeout === 'number' ? { timeout: payload.timeout } : {}),
    ...(typeof payload.waitFor === 'number' ? { waitFor: payload.waitFor } : {}),
    ...(typeof payload.mobile === 'boolean' ? { mobile: payload.mobile } : {}),
    ...(Array.isArray(payload.actions) ? { actions: payload.actions } : {}),
    ...(location ? { location } : {}),
    ...(typeof payload.skipTlsVerification === 'boolean'
      ? { skipTlsVerification: payload.skipTlsVerification }
      : {}),
    ...(typeof payload.removeBase64Images === 'boolean'
      ? { removeBase64Images: payload.removeBase64Images }
      : {}),
    ...(typeof payload.blockAds === 'boolean' ? { blockAds: payload.blockAds } : {}),
    ...(typeof payload.proxy === 'string' && payload.proxy ? { proxy: payload.proxy } : {}),
    ...(typeof payload.maxAge === 'number' ? { maxAge: payload.maxAge } : {}),
    ...(typeof payload.minAge === 'number' ? { minAge: payload.minAge } : {}),
    ...(typeof payload.storeInCache === 'boolean' ? { storeInCache: payload.storeInCache } : {}),
    ...(typeof payload.lockdown === 'boolean' ? { lockdown: payload.lockdown } : {}),
    ...(typeof payload.redactPII === 'boolean' ? { redactPII: payload.redactPII } : {}),
    ...(typeof payload.zeroDataRetention === 'boolean'
      ? { zeroDataRetention: payload.zeroDataRetention }
      : {}),
    ...(typeof payload.headers === 'object' && payload.headers !== null
      ? { headers: payload.headers }
      : {}),
  };

  if (payload.parsePDF === true) {
    options.parsers = [{ type: 'pdf', mode: 'auto' }];
  }

  return { url, options };
}

/**
 * Convert the crawl payload from the old UI to the v2 crawl options.
 *
 * @param payload - The crawl payload built by the view.
 * @returns The target URL and v2 crawl options.
 */
function toCrawlRequest(payload: Record<string, unknown>): {
  url: string;
  options: Record<string, unknown>;
} {
  const url = typeof payload.url === 'string' ? payload.url : '';
  const scrapeOptions =
    typeof payload.scrapeOptions === 'object' && payload.scrapeOptions !== null
      ? (payload.scrapeOptions as Record<string, unknown>)
      : undefined;

  const options: Record<string, unknown> = {
    ...(Array.isArray(payload.excludePaths) ? { excludePaths: payload.excludePaths } : {}),
    ...(Array.isArray(payload.includePaths) ? { includePaths: payload.includePaths } : {}),
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
    ...(typeof payload.delay === 'number' ? { delay: payload.delay } : {}),
    ...(typeof payload.maxConcurrency === 'number'
      ? { maxConcurrency: payload.maxConcurrency }
      : {}),
    ...(typeof payload.webhook === 'object' && payload.webhook !== null
      ? { webhook: payload.webhook }
      : {}),
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
 * Poll the extract endpoint until the job is complete.
 *
 * @param http - The configured Axios client.
 * @param initialResponse - The first extract response.
 * @returns The final extract response.
 */
async function waitForExtract(
  http: AxiosInstance,
  initialResponse: FirecrawlExtractResponse,
): Promise<FirecrawlExtractResponse> {
  // When the API answers synchronously the data is already present and there is
  // no job to poll. Otherwise the async POST only returns { success, id } with
  // no `status` field on v2, so a missing status still means "keep polling".
  if (!initialResponse.id || initialResponse.data !== undefined) {
    return initialResponse;
  }

  // Terminal job states: stop polling as soon as one of these is reached.
  const terminalStatuses = new Set(['completed', 'failed', 'cancelled']);
  // Bound the loop (~2 minutes at 1s interval) so a job that never settles
  // cannot hang the UI indefinitely.
  const maxAttempts = 120;

  let response = initialResponse;
  let attempts = 0;

  while (!terminalStatuses.has(response.status ?? '') && attempts < maxAttempts) {
    await sleep(1000);
    const pollResponse = await http.get<FirecrawlExtractResponse>(
      `/v2/extract/${initialResponse.id}`,
    );
    response = pollResponse.data;
    attempts += 1;
  }

  return response;
}

/**
 * Raw `GET /v2/crawl/{id}` response.
 */
interface RawCrawlStatus extends RawJobPage {
  success?: boolean;
  status: CrawlJob['status'];
  completed?: number;
  total?: number;
}

/**
 * Raw `GET /v2/batch/scrape/{id}` response.
 */
interface RawBatchStatus extends RawJobPage {
  status?: CrawlJob['status'];
  completed?: number;
  total?: number;
  creditsUsed?: number;
}

function toCrawlStatus(raw: RawCrawlStatus, documents: Document[]): LegacyCrawlStatusResponse {
  return {
    status: raw.status,
    completed: raw.completed ?? 0,
    total: raw.total ?? 0,
    next: raw.next ?? null,
    data: documents.map(toLegacyDocument),
  };
}

function toBatchStatus(raw: RawBatchStatus, documents: Document[]): BatchScrapeStatusResponse {
  return {
    status: raw.status ?? 'scraping',
    completed: raw.completed ?? 0,
    total: raw.total ?? 0,
    creditsUsed: raw.creditsUsed ?? 0,
    next: raw.next ?? null,
    data: documents.map(toLegacyDocument),
  };
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
          const response = await http.get<{ success?: boolean; data?: RawUsage }>(
            '/v2/team/credit-usage',
          );

          return { data: toCreditUsage(response.data.data) };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch credit usage');
        }
      },
      async getTokenUsage() {
        try {
          const response = await http.get<{ success?: boolean; data?: RawUsage }>(
            '/v2/team/token-usage',
          );

          return { data: toTokenUsage(response.data.data) };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch token usage');
        }
      },
    },
    scraping: {
      async scrapeAndExtractFromUrl(payload) {
        try {
          const { url, options } = toScrapeRequest(payload);
          const response = await http.post<{ success: boolean; data: Document }>('/v2/scrape', {
            url,
            ...options,
          });

          return {
            data: {
              success: response.data.success,
              data: toLegacyDocument(response.data.data),
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
          const response = await http.post<{ success: boolean; id: string; url: string }>(
            '/v2/crawl',
            {
              url,
              ...options,
            },
          );

          return {
            data: {
              id: response.data.id,
              url: response.data.url,
            },
          };
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
          const response = await http.get<{
            errors?: CrawlError[];
            robotsBlocked?: string[];
          }>(`/v2/crawl/${id}/errors`);

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
          const response = await http.post<{ success: boolean; id: string; url: string }>(
            '/v2/batch/scrape',
            {
              urls,
              ...options,
              ...(typeof payload.webhook === 'object' && payload.webhook !== null
                ? { webhook: payload.webhook }
                : {}),
            },
          );

          return {
            data: {
              id: response.data.id,
              url: response.data.url,
            },
          };
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
          const response = await http.get<{
            errors?: CrawlError[];
            robotsBlocked?: string[];
          }>(`/v2/batch/scrape/${id}/errors`);

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
    extraction: {
      async extractData(payload) {
        try {
          const response = await http.post<FirecrawlExtractResponse>('/v2/extract', payload);
          const finalResponse = await waitForExtract(http, response.data);

          return {
            data: finalResponse,
          };
        } catch (error) {
          throw formatApiError(error, 'Extract request failed');
        }
      },
      async getExtractStatus(id) {
        try {
          const response = await http.get<FirecrawlExtractResponse>(`/v2/extract/${id}`);

          return {
            data: response.data,
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch extract status');
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
          const response = await http.post<{
            success: boolean;
            links?: Array<string | { url: string }>;
          }>('/v2/map', {
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
          });

          return {
            data: {
              links: (response.data.links ?? []).map((entry) =>
                typeof entry === 'string' ? entry : entry.url,
              ),
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Map request failed');
        }
      },
    },
    search: {
      async search(payload) {
        try {
          const searchPayload: Record<string, unknown> = {
            query: String(payload.query ?? ''),
            ...(Array.isArray(payload.sources) ? { sources: payload.sources } : {}),
            ...(typeof payload.limit === 'number' ? { limit: payload.limit } : {}),
            ...(typeof payload.tbs === 'string' && payload.tbs ? { tbs: payload.tbs } : {}),
            ...(typeof payload.location === 'string' && payload.location
              ? { location: payload.location }
              : {}),
            ...(typeof payload.timeout === 'number' ? { timeout: payload.timeout } : {}),
          };

          if (typeof payload.scrapeOptions === 'object' && payload.scrapeOptions !== null) {
            searchPayload.scrapeOptions = toScrapeRequest({
              url: 'https://example.com',
              ...(payload.scrapeOptions as Record<string, unknown>),
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
