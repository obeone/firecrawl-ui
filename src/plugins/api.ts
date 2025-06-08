import type { App } from "vue";
import {
  BillingApi,
  CrawlingApi,
  ExtractionApi,
  MappingApi,
  ScrapingApi,
  SearchApi,
} from "../api-client/index.js";
import apiConfig from "../config/api.js";

const apiPlugin = {
  install(app: App) {
    const apis = {
      billing: new BillingApi(apiConfig),
      crawling: new CrawlingApi(apiConfig),
      extraction: new ExtractionApi(apiConfig),
      mapping: new MappingApi(apiConfig),
      scraping: new ScrapingApi(apiConfig),
      search: new SearchApi(apiConfig),
    };
    app.provide("api", apis);
    app.config.globalProperties.$api = apis;
  },
};

export default apiPlugin;
