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
}

/**
 * Legacy-compatible deep research client.
 */
export interface FirecrawlResearchApi {
  startDeepResearch(payload: Record<string, unknown>): Promise<WrappedResponse<{ id: string }>>;
  getDeepResearchStatus(id: string): Promise<WrappedResponse<DeepResearchStatus>>;
}

/**
 * Status and results of an LLMs.txt generation job.
 */
export interface LlmsTxtStatus {
  status: 'processing' | 'completed' | 'failed';
  llmstxt: string;
  llmsfulltxt: string;
}

/**
 * Legacy-compatible LLMs.txt generation client.
 */
export interface FirecrawlLlmsTxtApi {
  generateLlmsTxt(payload: Record<string, unknown>): Promise<WrappedResponse<{ id: string }>>;
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
    ...(typeof payload.storeInCache === 'boolean' ? { storeInCache: payload.storeInCache } : {}),
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
  if (!initialResponse.id || !initialResponse.status || initialResponse.status !== 'processing') {
    return initialResponse;
  }

  let response = initialResponse;

  while (response.status === 'processing' && response.id) {
    await sleep(1000);
    const pollResponse = await http.get<FirecrawlExtractResponse>(`/v2/extract/${response.id}`);
    response = pollResponse.data;
  }

  return response;
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

  return {
    billing: {
      async getCreditUsage() {
        try {
          const response = await http.get<{
            success?: boolean;
            data?: {
              remaining_credits?: number;
              plan_credits?: number;
              billing_period_start?: string | null;
              billing_period_end?: string | null;
            };
          }>('/v2/team/credit-usage');

          const data = response.data.data ?? {};

          return {
            data: {
              remainingCredits:
                typeof data.remaining_credits === 'number' ? data.remaining_credits : null,
              planCredits: typeof data.plan_credits === 'number' ? data.plan_credits : null,
              billingPeriodStart: data.billing_period_start ?? null,
              billingPeriodEnd: data.billing_period_end ?? null,
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch credit usage');
        }
      },
      async getTokenUsage() {
        try {
          const response = await http.get<{
            success?: boolean;
            data?: { remaining_tokens?: number };
          }>('/v2/team/token-usage');

          const data = response.data.data ?? {};

          return {
            data: {
              remainingTokens:
                typeof data.remaining_tokens === 'number' ? data.remaining_tokens : null,
            },
          };
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
          const response = await http.get<{
            success: boolean;
            status: CrawlJob['status'];
            completed?: number;
            total?: number;
            next?: string | null;
            data?: Document[];
          }>(`/v2/crawl/${id}`);

          return {
            data: {
              status: response.data.status,
              completed: response.data.completed ?? 0,
              total: response.data.total ?? 0,
              next: response.data.next ?? null,
              data: (response.data.data ?? []).map(toLegacyDocument),
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch crawl status');
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
          const response = await http.get<{
            status?: CrawlJob['status'];
            completed?: number;
            total?: number;
            creditsUsed?: number;
            next?: string | null;
            data?: Document[];
          }>(`/v2/batch/scrape/${id}`);

          return {
            data: {
              status: response.data.status ?? 'scraping',
              completed: response.data.completed ?? 0,
              total: response.data.total ?? 0,
              creditsUsed: response.data.creditsUsed ?? 0,
              next: response.data.next ?? null,
              data: (response.data.data ?? []).map(toLegacyDocument),
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch batch scrape status');
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
          const response = await http.post<{ success: boolean; id: string }>(
            '/v2/deep-research',
            payload,
          );

          return {
            data: { id: response.data.id },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to start deep research');
        }
      },
      async getDeepResearchStatus(id) {
        try {
          const response = await http.get<{
            success?: boolean;
            data?: {
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
          }>(`/v2/deep-research/${id}`);

          const data = response.data.data ?? {};

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
            },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to fetch deep research status');
        }
      },
    },
    llmsTxt: {
      async generateLlmsTxt(payload) {
        try {
          const response = await http.post<{ success: boolean; id: string }>(
            '/v2/llmstxt',
            payload,
          );

          return {
            data: { id: response.data.id },
          };
        } catch (error) {
          throw formatApiError(error, 'Failed to start LLMs.txt generation');
        }
      },
      async getLlmsTxtStatus(id) {
        try {
          const response = await http.get<{
            success?: boolean;
            status?: LlmsTxtStatus['status'];
            data?: { llmstxt?: string; llmsfulltxt?: string };
          }>(`/v2/llmstxt/${id}`);

          const data = response.data.data ?? {};

          return {
            data: {
              status: response.data.status ?? 'processing',
              llmstxt: data.llmstxt ?? '',
              llmsfulltxt: data.llmsfulltxt ?? '',
            },
          };
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
