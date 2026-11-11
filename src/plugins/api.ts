import { inject, type App, type InjectionKey } from 'vue';
import apiConfig, { getApiConfig, updateApiConfig } from '../config/api.js';
import { createFirecrawlApiClients, type FirecrawlApiClients } from '../services/firecrawl.js';

/**
 * Vue plugin responsible for registering and providing various Firecrawl API clients
 * to the Vue application instance.
 *
 * This plugin makes API clients accessible globally via `app.config.globalProperties.$api`
 * and through dependency injection via {@link useApi}.
 *
 * @param app - The Vue application instance to which API clients will be registered.
 */
let appInstance: App | null = null;

/**
 * Typed injection key for the Firecrawl API clients.
 */
export const firecrawlApiKey: InjectionKey<FirecrawlApiClients> = Symbol('firecrawl-api');
const apiClients: FirecrawlApiClients = createFirecrawlApiClients(
  apiConfig.apiKey,
  apiConfig.basePath,
);

const apiPlugin = {
  install(app: App): void {
    appInstance = app;
    app.provide(firecrawlApiKey, apiClients);
    app.config.globalProperties.$api = apiClients;
  },
};

/**
 * Return the Firecrawl API clients provided by {@link apiPlugin}.
 *
 * Must be called from a component `setup()` (or `<script setup>`).
 *
 * @returns The shared Firecrawl API clients.
 * @throws Error when the API plugin was not installed on the application.
 */
export function useApi(): FirecrawlApiClients {
  const api = inject(firecrawlApiKey);
  if (!api) {
    throw new Error('Firecrawl API is not available. Ensure the API plugin is installed.');
  }
  return api;
}

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
    appInstance.provide(firecrawlApiKey, apiClients);
    appInstance.config.globalProperties.$api = apiClients;
  }
}

export default apiPlugin;
