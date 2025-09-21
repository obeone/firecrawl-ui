/**
 * Shared API type definitions supporting both Firecrawl API versions.
 *
 * These types model the payloads and responses described in the
 * `/openapi_v2.yaml` specification while keeping backward compatibility
 * with the existing v1 client.
 */
export type ApiVersion = 'v1' | 'v2';

/**
 * Request payload accepted by the Firecrawl API v2 `/scrape` endpoint.
 */
export interface ScrapeRequestV2 {
  url: string;
  pageOptions?: {
    screenshot?: boolean;
    onlyMainContent?: boolean;
    includeHtml?: boolean;
    waitFor?: number;
    headers?: Record<string, string>;
  };
  extractorOptions?: {
    mode?: 'llm-extraction';
    extractionPrompt?: string;
    extractionSchema?: Record<string, unknown>;
  };
  scraperOptions?: {
    useUnstructured?: boolean;
  };
}

/**
 * Response payload returned by the Firecrawl API v2 `/scrape` endpoint.
 */
export interface ScrapeResponseV2 {
  success?: boolean;
  data?: {
    content?: string;
    markdown?: string;
    html?: string;
    metadata?: Record<string, unknown>;
    screenshotUrl?: string;
  };
  metadata?: {
    sourceURL?: string;
  };
}

/**
 * Request payload accepted by the Firecrawl API v2 `/crawl` endpoint.
 */
export interface CrawlRequestV2 {
  url: string;
  crawlerOptions?: {
    includes?: string[];
    excludes?: string[];
    maxDepth?: number;
    maxPages?: number;
    returnOnlyUrls?: boolean;
  };
  pageOptions?: {
    onlyMainContent?: boolean;
    includeHtml?: boolean;
    screenshot?: boolean;
  };
  webhook?: {
    url: string;
    secret?: string;
  };
}

/**
 * Response returned when initiating a crawl job through the v2 API.
 */
export interface CrawlResponseV2 {
  jobId: string;
}

/**
 * Status payload returned by the Firecrawl API v2 `/crawl/status/{jobId}` endpoint.
 */
export interface CrawlStatusResponseV2 {
  status?: 'crawling' | 'completed' | 'failed';
  total?: number;
  progress?: number;
  data?: Array<ScrapeResponseV2['data']>;
}

/**
 * Response payload when cancelling a crawl job using the v2 API.
 */
export interface CancelCrawlResponseV2 {
  status?: string;
}

/**
 * Request body for the Firecrawl API v2 `/search` endpoint.
 */
export interface SearchRequestV2 {
  query: string;
  searchOptions?: {
    provider?: 'google' | 'serper' | 'searchapi' | 'searxng';
    region?: string;
    maxResults?: number;
  };
}

/**
 * Representation of a single search result from the v2 API.
 */
export interface SearchResultV2 {
  title?: string;
  url?: string;
  description?: string;
  content?: string;
}

/**
 * Request payload for the Firecrawl API v2 `/extract` endpoint.
 */
export interface ExtractRequestV2 {
  html?: string;
  markdown?: string;
  extractorOptions: {
    extractionSchema: Record<string, unknown>;
    extractionPrompt?: string;
    mode?: 'llm-extraction';
  };
}

/**
 * Response payload produced by the Firecrawl API v2 `/extract` endpoint.
 */
export interface ExtractResponseV2 {
  success?: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Request payload for the Firecrawl API v2 `/map` endpoint.
 */
export interface MapRequestV2 {
  url: string;
}

/**
 * Response payload for the Firecrawl API v2 `/map` endpoint.
 */
export type MapResponseV2 = string[];
