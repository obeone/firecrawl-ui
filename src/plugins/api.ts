import type { App } from 'vue';
import {
  BillingApi,
  CrawlingApi,
  ExtractionApi,
  MappingApi,
  ScrapingApi,
  SearchApi,
} from '../api-client/index.js';
import apiConfig from '../config/api.js';

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

const apiPlugin = {
  install(app: App): void {
    const apis: FirecrawlApiClients = {
      billing: new BillingApi(apiConfig),
      crawling: new CrawlingApi(apiConfig),
      extraction: new ExtractionApi(apiConfig),
      mapping: new MappingApi(apiConfig),
      scraping: new ScrapingApi(apiConfig),
      search: new SearchApi(apiConfig),
    };
    app.provide('api', apis);
    app.config.globalProperties.$api = apis;
  },
};

export default apiPlugin;
