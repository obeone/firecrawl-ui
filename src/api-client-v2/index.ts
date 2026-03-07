import type { AxiosInstance, AxiosResponse } from 'axios';

export type ScraperModeV2 = 'llm-extraction';

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
    mode?: ScraperModeV2;
    extractionPrompt?: string;
    extractionSchema?: Record<string, unknown>;
  };
  scraperOptions?: {
    useUnstructured?: boolean;
  };
}

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
    url?: string;
    secret?: string;
  };
}

export interface CrawlJobResponseV2 {
  jobId: string;
}

export interface CrawlStatusResponseV2 {
  status?: 'crawling' | 'completed' | 'failed';
  total?: number;
  progress?: number;
  data?: ScrapeResponseV2[];
}

export interface CancelCrawlResponseV2 {
  status?: string;
}

export interface SearchRequestV2 {
  query: string;
  searchOptions?: {
    provider?: 'google' | 'serper' | 'searchapi' | 'searxng';
    region?: string;
    maxResults?: number;
  };
}

export interface SearchResultV2 {
  title?: string;
  url?: string;
  description?: string;
  content?: string;
}

export interface MapRequestV2 {
  url: string;
}

export interface ExtractRequestV2 {
  html?: string;
  markdown?: string;
  extractorOptions: {
    extractionSchema: Record<string, unknown>;
    extractionPrompt?: string;
    mode?: ScraperModeV2;
  };
}

export interface ExtractResponseV2 {
  success?: boolean;
  data?: Record<string, unknown>;
}

/**
 * Axios-based client implementing Firecrawl v2 scraping operations.
 */
export class ScrapingApiV2 {
  private readonly http: AxiosInstance;

  /**
   * Create a new scraping client.
   *
   * @param http - Preconfigured Axios instance.
   */
  constructor(http: AxiosInstance) {
    this.http = http;
  }

  /**
   * Scrape a single URL using the v2 endpoint.
   *
   * @param payload - Scrape request payload.
   * @returns Axios response containing the scrape result.
   */
  public scrape(payload: ScrapeRequestV2): Promise<AxiosResponse<ScrapeResponseV2>> {
    return this.http.post<ScrapeResponseV2>('/scrape', payload);
  }
}

/**
 * Axios-based client implementing Firecrawl v2 crawling operations.
 */
export class CrawlingApiV2 {
  private readonly http: AxiosInstance;

  /**
   * Create a new crawling client.
   *
   * @param http - Preconfigured Axios instance.
   */
  constructor(http: AxiosInstance) {
    this.http = http;
  }

  /**
   * Start a crawl job using the v2 API.
   *
   * @param payload - Crawl configuration payload.
   * @returns Axios response containing the created job identifier.
   */
  public startCrawl(payload: CrawlRequestV2): Promise<AxiosResponse<CrawlJobResponseV2>> {
    return this.http.post<CrawlJobResponseV2>('/crawl', payload);
  }

  /**
   * Retrieve the status of a crawl job.
   *
   * @param jobId - Crawl job identifier.
   * @returns Axios response describing the crawl progress.
   */
  public getCrawlStatus(jobId: string): Promise<AxiosResponse<CrawlStatusResponseV2>> {
    return this.http.get<CrawlStatusResponseV2>(`/crawl/status/${jobId}`);
  }

  /**
   * Cancel an existing crawl job.
   *
   * @param jobId - Crawl job identifier.
   * @returns Axios response confirming the cancellation.
   */
  public cancelCrawl(jobId: string): Promise<AxiosResponse<CancelCrawlResponseV2>> {
    return this.http.post<CancelCrawlResponseV2>('/crawl/cancel', { jobId });
  }
}

/**
 * Axios-based client implementing Firecrawl v2 search operations.
 */
export class SearchApiV2 {
  private readonly http: AxiosInstance;

  /**
   * Create a new search client.
   *
   * @param http - Preconfigured Axios instance.
   */
  constructor(http: AxiosInstance) {
    this.http = http;
  }

  /**
   * Execute a search query via the v2 API.
   *
   * @param payload - Search configuration payload.
   * @returns Axios response containing an array of results.
   */
  public search(payload: SearchRequestV2): Promise<AxiosResponse<SearchResultV2[]>> {
    return this.http.post<SearchResultV2[]>('/search', payload);
  }
}

/**
 * Axios-based client implementing Firecrawl v2 sitemap retrieval.
 */
export class MappingApiV2 {
  private readonly http: AxiosInstance;

  /**
   * Create a new mapping client.
   *
   * @param http - Preconfigured Axios instance.
   */
  constructor(http: AxiosInstance) {
    this.http = http;
  }

  /**
   * Retrieve sitemap data for a given URL.
   *
   * @param payload - Map request payload.
   * @returns Axios response containing the sitemap URLs.
   */
  public getSitemap(payload: MapRequestV2): Promise<AxiosResponse<string[]>> {
    return this.http.post<string[]>('/map', payload);
  }
}

/**
 * Axios-based client implementing Firecrawl v2 extraction operations.
 */
export class ExtractionApiV2 {
  private readonly http: AxiosInstance;

  /**
   * Create a new extraction client.
   *
   * @param http - Preconfigured Axios instance.
   */
  constructor(http: AxiosInstance) {
    this.http = http;
  }

  /**
   * Extract structured data from raw HTML or Markdown content.
   *
   * @param payload - Extraction payload matching the v2 schema.
   * @returns Axios response containing the extraction result.
   */
  public extract(payload: ExtractRequestV2): Promise<AxiosResponse<ExtractResponseV2>> {
    return this.http.post<ExtractResponseV2>('/extract', payload);
  }
}
