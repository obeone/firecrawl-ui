import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type { Configuration } from '@/api-client/configuration.js';
import type {
  CancelCrawlResponseV2,
  CrawlRequestV2,
  CrawlResponseV2,
  CrawlStatusResponseV2,
  ExtractRequestV2,
  ExtractResponseV2,
  MapRequestV2,
  MapResponseV2,
  ScrapeRequestV2,
  ScrapeResponseV2,
  SearchRequestV2,
  SearchResultV2,
} from '@/types/api.js';

/**
 * Build a dedicated Axios instance configured with the provided API configuration.
 *
 * @param configuration - The shared API configuration.
 * @returns An Axios instance ready to communicate with the v2 API.
 */
function createAxiosInstance(configuration: Configuration): AxiosInstance {
  const baseUrl = (configuration.basePath || configuration.baseUrl || '').replace(/\/$/, '');
  const baseHeaders = configuration.baseOptions?.headers ?? {};
  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      ...baseHeaders,
    },
  });
}

/**
 * Client for scraping endpoints exposed by the Firecrawl API v2.
 */
export class ScrapingApiV2 {
  private readonly http: AxiosInstance;

  constructor(configuration: Configuration) {
    this.http = createAxiosInstance(configuration);
  }

  /**
   * Trigger a scrape request following the v2 contract.
   *
   * @param payload - Parameters describing the scraping job.
   * @returns Axios promise resolving with the scrape response payload.
   */
  public scrapeAndExtractFromUrl(
    payload: ScrapeRequestV2,
  ): Promise<AxiosResponse<ScrapeResponseV2>> {
    return this.http.post('/scrape', payload);
  }
}

/**
 * Client handling crawl operations for the Firecrawl API v2.
 */
export class CrawlingApiV2 {
  private readonly http: AxiosInstance;

  constructor(configuration: Configuration) {
    this.http = createAxiosInstance(configuration);
  }

  /**
   * Start a crawl job and retrieve the job identifier.
   *
   * @param payload - Crawl parameters matching the v2 specification.
   * @returns Axios promise containing the crawl job response.
   */
  public crawlUrls(payload: CrawlRequestV2): Promise<AxiosResponse<CrawlResponseV2>> {
    return this.http.post('/crawl', payload);
  }

  /**
   * Retrieve the status of a previously started crawl job.
   *
   * @param jobId - Identifier of the crawl job.
   * @returns Axios promise resolving with the crawl status payload.
   */
  public getCrawlStatus(jobId: string): Promise<AxiosResponse<CrawlStatusResponseV2>> {
    return this.http.get(`/crawl/status/${jobId}`);
  }

  /**
   * Cancel a running crawl job.
   *
   * @param jobId - Identifier of the crawl job to cancel.
   * @returns Axios promise containing the cancellation response.
   */
  public cancelCrawl(jobId: string): Promise<AxiosResponse<CancelCrawlResponseV2>> {
    return this.http.post('/crawl/cancel', { jobId });
  }
}

/**
 * Client for data extraction utilities using the Firecrawl API v2.
 */
export class ExtractionApiV2 {
  private readonly http: AxiosInstance;

  constructor(configuration: Configuration) {
    this.http = createAxiosInstance(configuration);
  }

  /**
   * Extract structured data from raw HTML or Markdown content.
   *
   * @param payload - Extraction parameters compliant with the v2 contract.
   * @returns Axios promise resolving with the extraction response payload.
   */
  public extractData(payload: ExtractRequestV2): Promise<AxiosResponse<ExtractResponseV2>> {
    return this.http.post('/extract', payload);
  }
}

/**
 * Client for sitemap and mapping utilities in the Firecrawl API v2.
 */
export class MappingApiV2 {
  private readonly http: AxiosInstance;

  constructor(configuration: Configuration) {
    this.http = createAxiosInstance(configuration);
  }

  /**
   * Retrieve sitemap URLs for a given website.
   *
   * @param payload - Mapping request body containing the URL to inspect.
   * @returns Axios promise resolving with a list of discovered URLs.
   */
  public mapUrls(payload: MapRequestV2): Promise<AxiosResponse<MapResponseV2>> {
    return this.http.post('/map', payload);
  }
}

/**
 * Client performing search operations with the Firecrawl API v2.
 */
export class SearchApiV2 {
  private readonly http: AxiosInstance;

  constructor(configuration: Configuration) {
    this.http = createAxiosInstance(configuration);
  }

  /**
   * Execute a search query using the selected provider.
   *
   * @param payload - Search parameters following the v2 schema.
   * @returns Axios promise resolving with the search results array.
   */
  public search(payload: SearchRequestV2): Promise<AxiosResponse<SearchResultV2[]>> {
    return this.http.post('/search', payload);
  }
}

/**
 * Collection of v2 API clients used throughout the UI.
 */
export interface FirecrawlApiClientsV2 {
  crawling: CrawlingApiV2;
  extraction: ExtractionApiV2;
  mapping: MappingApiV2;
  scraping: ScrapingApiV2;
  search: SearchApiV2;
}

/**
 * Factory creating a bundle of v2 clients using a shared configuration instance.
 *
 * @param configuration - Shared API configuration containing authentication and base URL.
 * @returns Instantiated client bundle ready for dependency injection.
 */
export function createApiClientsV2(configuration: Configuration): FirecrawlApiClientsV2 {
  return {
    crawling: new CrawlingApiV2(configuration),
    extraction: new ExtractionApiV2(configuration),
    mapping: new MappingApiV2(configuration),
    scraping: new ScrapingApiV2(configuration),
    search: new SearchApiV2(configuration),
  };
}
