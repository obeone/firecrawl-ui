import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { App } from 'vue';
import {
  BillingApi,
  CrawlingApi,
  ExtractionApi,
  MappingApi,
  ScrapingApi,
  SearchApi,
} from '../api-client/index.js';
import {
  CrawlingApiV2,
  ExtractionApiV2,
  MappingApiV2,
  ScrapingApiV2,
  SearchApiV2,
} from '../api-client-v2/index.js';
import apiConfig, {
  getApiConfig,
  getApiKey,
  getApiVersion,
  getBaseUrl,
  updateApiConfig,
  type ApiVersion,
} from '../config/api.js';
import { setApiVersionState } from '@/stores/apiVersion.js';

/**
 * Combined client interface exposed through Vue injection.
 */
export interface FirecrawlApiClients {
  version: ApiVersion;
  billing?: BillingApi;
  crawling: CrawlingApi | CrawlingApiV2;
  extraction: ExtractionApi | ExtractionApiV2;
  mapping: MappingApi | MappingApiV2;
  scraping: ScrapingApi | ScrapingApiV2;
  search: SearchApi | SearchApiV2;
}

let appInstance: App | null = null;
const apiClients: FirecrawlApiClients = {
  version: getApiVersion(),
  billing: undefined,
  crawling: new CrawlingApi(apiConfig),
  extraction: new ExtractionApi(apiConfig),
  mapping: new MappingApi(apiConfig),
  scraping: new ScrapingApi(apiConfig),
  search: new SearchApi(apiConfig),
};

assignClients(apiClients, apiClients.version);
setApiVersionState(apiClients.version);

/**
 * Create an Axios instance configured for the Firecrawl API.
 *
 * @param baseUrl - API base URL.
 * @param apiKey - Optional API key to include in the Authorization header.
 * @returns Configured Axios instance.
 */
function createAxiosInstance(baseUrl: string, apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  });
}

/**
 * Assign concrete API clients based on the selected API version.
 *
 * @param target - Mutable reference to the clients container.
 * @param version - Active API version.
 */
function assignClients(target: FirecrawlApiClients, version: ApiVersion): void {
  if (version === 'v1') {
    target.version = 'v1';
    target.billing = new BillingApi(getApiConfig());
    target.crawling = new CrawlingApi(getApiConfig());
    target.extraction = new ExtractionApi(getApiConfig());
    target.mapping = new MappingApi(getApiConfig());
    target.scraping = new ScrapingApi(getApiConfig());
    target.search = new SearchApi(getApiConfig());
    return;
  }

  const baseUrl = getBaseUrl(version);
  const apiKey = getApiKey();
  const httpClient = createAxiosInstance(baseUrl, apiKey);

  target.version = 'v2';
  target.billing = undefined;
  target.crawling = new CrawlingApiV2(httpClient);
  target.extraction = new ExtractionApiV2(httpClient);
  target.mapping = new MappingApiV2(httpClient);
  target.scraping = new ScrapingApiV2(httpClient);
  target.search = new SearchApiV2(httpClient);
}

const apiPlugin = {
  install(app: App): void {
    appInstance = app;
    app.provide('api', apiClients);
    app.config.globalProperties.$api = apiClients;
  },
};

/**
 * Reinitialize API clients with updated configuration.
 *
 * @param baseUrl - Optional new base URL.
 * @param apiKey - Optional new API key.
 * @param version - Optional API version override.
 */
export function refreshApiClients(baseUrl?: string, apiKey?: string, version?: ApiVersion): void {
  updateApiConfig(baseUrl, apiKey, version);
  const resolvedVersion = getApiVersion();
  assignClients(apiClients, resolvedVersion);
  setApiVersionState(resolvedVersion);

  if (appInstance) {
    appInstance.config.globalProperties.$api = apiClients;
  }
}

export default apiPlugin;
