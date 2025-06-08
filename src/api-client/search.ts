import type { AxiosInstance, AxiosResponse, RawAxiosRequestConfig } from 'axios'
import type { Configuration } from './configuration.js'
import { BaseAPI } from './base.js'

export interface SearchRequest {
  query: string
  limit?: number
  tbs?: string
  lang?: string
  country?: string
  location?: string
  timeout?: number
  scrapeOptions?: {
    formats?: string[]
  }
}

export interface SearchResult {
  title: string
  description?: string
  url: string
  markdown?: string | null
  html?: string | null
  rawHtml?: string | null
  links?: string[]
  screenshot?: string | null
  metadata?: {
    title?: string
    description?: string
    sourceURL?: string
    statusCode?: number
    error?: string | null
  }
}

export interface SearchResponse {
  success: boolean
  data: SearchResult[]
  warning?: string | null
}

/**
 * Minimal API client for the /search endpoint.
 */
export class SearchApi extends BaseAPI {
  constructor(configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    super(configuration, basePath, axios)
  }

  /**
   * Perform a search and optionally scrape the results.
   * @param payload - Parameters for the search endpoint
   * @param options - Optional axios request configuration
   * @returns Axios promise resolving to the API response
   */
  public search(payload: SearchRequest, options?: RawAxiosRequestConfig): Promise<AxiosResponse<SearchResponse>> {
    const url = `${this.basePath}/search`
    return this.axios.post<SearchResponse>(url, payload, options)
  }
}
