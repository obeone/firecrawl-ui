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
  scrapeAndExtractFromUrl(payload: Record<string, unknown>): Promise<WrappedResponse<LegacyScrapeResponse>>;
}

/**
 * Legacy-compatible crawling client.
 */
export interface FirecrawlCrawlingApi {
  crawlUrls(payload: Record<string, unknown>): Promise<WrappedResponse<{ id: string; url: string }>>;
  getCrawlStatus(id: string): Promise<WrappedResponse<LegacyCrawlStatusResponse>>;
}

/**
 * Legacy-compatible extraction client.
 */
export interface FirecrawlExtractionApi {
  extractData(payload: Record<string, unknown>): Promise<WrappedResponse<FirecrawlExtractResponse>>;
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
 * Collection of all Firecrawl adapters exposed to Vue.
 */
export interface FirecrawlApiClients {
  crawling: FirecrawlCrawlingApi;
  extraction: FirecrawlExtractionApi;
  mapping: FirecrawlMappingApi;
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
      title: (metadata.title as string | undefined) || (legacyDocument.url as string | undefined) || '',
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
function toV2Formats(formats: unknown, payload: Record<string, unknown>): Array<string | Record<string, unknown>> | undefined {
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
function toScrapeRequest(payload: Record<string, unknown>): { url: string; options: Record<string, unknown> } {
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
function toCrawlRequest(payload: Record<string, unknown>): { url: string; options: Record<string, unknown> } {
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
          const response = await http.post<{ success: boolean; id: string; url: string }>('/v2/crawl', {
            url,
            ...options,
          });

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
    },
    mapping: {
      async mapUrls(payload) {
        try {
          const response = await http.post<{
            success: boolean;
            links?: Array<string | { url: string }>;
          }>('/v2/map', {
            url: String(payload.url ?? ''),
            ...(typeof payload.search === 'string' && payload.search ? { search: payload.search } : {}),
            ...(payload.sitemap === 'skip' || payload.sitemap === 'include' || payload.sitemap === 'only'
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
