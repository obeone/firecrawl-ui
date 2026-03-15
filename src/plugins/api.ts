import type { App } from 'vue';
import apiConfig, { getApiConfig, updateApiConfig } from '../config/api.js';
import { createFirecrawlApiClients, type FirecrawlApiClients } from '../services/firecrawl.js';

/**
 * Vue plugin responsible for registering and providing various Firecrawl API clients
 * to the Vue application instance.
 *
 * This plugin makes API clients accessible globally via `app.config.globalProperties.$api`
 * and through dependency injection via `app.provide('api', apis)`.
 *
 * @param app - The Vue application instance to which API clients will be registered.
 */
let appInstance: App | null = null;
const apiClients: FirecrawlApiClients = createFirecrawlApiClients(
  apiConfig.apiKey,
  apiConfig.basePath,
);

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
  const config = getApiConfig();
  Object.assign(apiClients, createFirecrawlApiClients(config.apiKey, config.basePath));

  if (appInstance) {
    appInstance.provide('api', apiClients);
    appInstance.config.globalProperties.$api = apiClients;
  }
}

export default apiPlugin;
