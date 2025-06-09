import type { AxiosInstance, AxiosResponse, RawAxiosRequestConfig } from 'axios';
import type { Configuration } from './configuration.js';
import { BaseAPI } from './base.js';

/**
 * Defines the structure for a search request payload.
 * This interface specifies the parameters that can be sent to the search endpoint.
 */
export interface SearchRequest {
  /** The search query string. */
  query: string;
  /** Optional limit for the number of search results. */
  limit?: number;
  /** Optional time-based search filter (e.g., "qdr:year"). */
  tbs?: string;
  /** Optional language for the search results (e.g., "en", "fr"). */
  lang?: string;
  /** Optional country for the search results (e.g., "US", "FR"). */
  country?: string;
  /** Optional geographical location for the search. */
  location?: string;
  /** Optional timeout for the search operation in milliseconds. */
  timeout?: number;
  /** Optional scraping options for the search results. */
  scrapeOptions?: {
    /** Optional array of formats to scrape (e.g., "markdown", "html"). */
    formats?: string[];
  };
}

/**
 * Defines the structure for a single search result.
 * This interface describes the data returned for each item found by the search.
 */
export interface SearchResult {
  /** The title of the search result. */
  title: string;
  /** Optional description or snippet of the search result. */
  description?: string;
  /** The URL of the search result. */
  url: string;
  /** Optional markdown content of the scraped page. */
  markdown?: string | null;
  /** Optional HTML content of the scraped page. */
  html?: string | null;
  /** Optional raw HTML content of the scraped page. */
  rawHtml?: string | null;
  /** Optional array of links found on the scraped page. */
  links?: string[];
  /** Optional base64 encoded screenshot of the page. */
  screenshot?: string | null;
  /** Optional metadata extracted from the scraped page. */
  metadata?: {
    /** Optional title from the page metadata. */
    title?: string;
    /** Optional description from the page metadata. */
    description?: string;
    /** Optional source URL from the page metadata. */
    sourceURL?: string;
    /** Optional HTTP status code of the page. */
    statusCode?: number;
    /** Optional error message if scraping failed. */
    error?: string | null;
  };
}

/**
 * Defines the structure for the overall search API response.
 * This interface encapsulates the success status, data, and any warnings.
 */
export interface SearchResponse {
  /** Indicates if the search operation was successful. */
  success: boolean;
  /** An array of search results. */
  data: SearchResult[];
  /** Optional warning message if any issues occurred during the search. */
  warning?: string | null;
}

/**
 * API client for interacting with the /search endpoint of the FireCrawl API.
 * Provides methods to perform search operations and retrieve results.
 */
export class SearchApi extends BaseAPI {
  /**
   * Creates an instance of SearchApi.
   * @param configuration - Optional API configuration.
   * @param basePath - Optional base path for the API.
   * @param axios - Optional Axios instance to use for requests.
   */
  constructor(configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    super(configuration, basePath, axios);
  }

  /**
   * Perform a search and optionally scrape the results.
   * @param payload - Parameters for the search endpoint.
   * @param options - Optional Axios request configuration.
   * @returns A Promise that resolves to an AxiosResponse containing the SearchResponse.
   */
  public search(
    payload: SearchRequest,
    options?: RawAxiosRequestConfig,
  ): Promise<AxiosResponse<SearchResponse>> {
    const url = `${this.basePath}/search`;
    return this.axios.post<SearchResponse>(url, payload, options);
  }
}
