import type { App } from 'vue';
import {
  CrawlingApi,
  ExtractionApi,
  MappingApi,
  ScrapingApi,
  SearchApi,
} from '../api-client/index.js';
import apiConfig, { getApiConfig, getApiVersion, updateApiConfig } from '../config/api.js';
import { createApiClientsV2 } from '@/api-client-v2/index.js';
import type { ApiVersion } from '@/types/api.js';
import { syncApiVersion } from '@/stores/apiVersion.js';

type CrawlingClient = CrawlingApi | ReturnType<typeof createApiClientsV2>['crawling'];
type ExtractionClient = ExtractionApi | ReturnType<typeof createApiClientsV2>['extraction'];
type MappingClient = MappingApi | ReturnType<typeof createApiClientsV2>['mapping'];
type ScrapingClient = ScrapingApi | ReturnType<typeof createApiClientsV2>['scraping'];
type SearchClient = SearchApi | ReturnType<typeof createApiClientsV2>['search'];

/**
 * Vue plugin responsible for registering and providing various Firecrawl API clients
 * to the Vue application instance.
 *
 * This plugin makes API clients accessible globally via `app.config.globalProperties.$api`
 * and through dependency injection via `app.provide('api', apis)`.
 *
 * @param app - The Vue application instance to which API clients will be registered.
 */
export interface FirecrawlApiClients {
  version: ApiVersion;
  crawling: CrawlingClient;
  extraction: ExtractionClient;
  mapping: MappingClient;
  scraping: ScrapingClient;
  search: SearchClient;
}

let appInstance: App | null = null;
const apiClients: FirecrawlApiClients = {
  version: getApiVersion(),
  crawling: new CrawlingApi(apiConfig),
  extraction: new ExtractionApi(apiConfig),
  mapping: new MappingApi(apiConfig),
  scraping: new ScrapingApi(apiConfig),
  search: new SearchApi(apiConfig),
};

/**
 * Replace the current API client implementations to match the selected API version.
 *
 * @param version - The API version to align with.
 */
function assignClientsForVersion(version: ApiVersion): void {
  const configuration = getApiConfig();
  if (version === 'v2') {
    const v2Clients = createApiClientsV2(configuration);
    apiClients.crawling = v2Clients.crawling;
    apiClients.extraction = v2Clients.extraction;
    apiClients.mapping = v2Clients.mapping;
    apiClients.scraping = v2Clients.scraping;
    apiClients.search = v2Clients.search;
  } else {
    apiClients.crawling = new CrawlingApi(configuration);
    apiClients.extraction = new ExtractionApi(configuration);
    apiClients.mapping = new MappingApi(configuration);
    apiClients.scraping = new ScrapingApi(configuration);
    apiClients.search = new SearchApi(configuration);
  }
  apiClients.version = version;
  syncApiVersion(version);
}

assignClientsForVersion(apiClients.version);

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
 * @param apiVersion - Optional API version selection.
 */
export function refreshApiClients(
  baseUrl?: string,
  apiKey?: string,
  apiVersion?: ApiVersion,
): void {
  updateApiConfig(baseUrl, apiKey, apiVersion);
  assignClientsForVersion(getApiVersion());

  if (appInstance) {
    appInstance.config.globalProperties.$api = apiClients;
  }
}

export default apiPlugin;
