import type { App } from 'vue';
import {
  BillingApi,
  CrawlingApi,
  ExtractionApi,
  MappingApi,
  ScrapingApi,
  SearchApi,
} from '../api-client/index.js';
import apiConfig, { getApiConfig, updateApiConfig } from '../config/api.js';

/**
 * Vue plugin responsible for registering and providing various Firecrawl API clients
 * to the Vue application instance.
 *
 * This plugin makes API clients accessible globally via `app.config.globalProperties.$api`
 * and through dependency injection via `app.provide('api', apis)`.
 *
 * @param app - The Vue application instance to which API clients will be registered.
 */
interface FirecrawlApiClients {
  billing: BillingApi;
  crawling: CrawlingApi;
  extraction: ExtractionApi;
  mapping: MappingApi;
  scraping: ScrapingApi;
  search: SearchApi;
}

let appInstance: App | null = null;
const apiClients: FirecrawlApiClients = {
  billing: new BillingApi(apiConfig),
  crawling: new CrawlingApi(apiConfig),
  extraction: new ExtractionApi(apiConfig),
  mapping: new MappingApi(apiConfig),
  scraping: new ScrapingApi(apiConfig),
  search: new SearchApi(apiConfig),
};

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
 */
export function refreshApiClients(baseUrl?: string, apiKey?: string): void {
  updateApiConfig(baseUrl, apiKey);
  apiClients.billing = new BillingApi(getApiConfig());
  apiClients.crawling = new CrawlingApi(getApiConfig());
  apiClients.extraction = new ExtractionApi(getApiConfig());
  apiClients.mapping = new MappingApi(getApiConfig());
  apiClients.scraping = new ScrapingApi(getApiConfig());
  apiClients.search = new SearchApi(getApiConfig());

  if (appInstance) {
    appInstance.config.globalProperties.$api = apiClients;
  }
}

export default apiPlugin;
