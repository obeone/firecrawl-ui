import { normalizeFirecrawlBaseUrl } from '../services/firecrawl.js';

/**
 * Returns the base URL for the Firecrawl API.
 *
 * @returns {string} The base URL from local storage, environment variables or a
 *   default value.
 */
const getBaseUrl = (): string => resolveBaseUrl(localStorage.getItem('firecrawl_base_url'));

/**
 * Resolve the base URL to use when the stored value may be empty.
 *
 * @param stored - The value saved in the settings form, possibly empty.
 * @returns The stored value, else the build-time URL, else Firecrawl Cloud.
 */
export function resolveBaseUrl(stored: string | null | undefined): string {
  return normalizeFirecrawlBaseUrl(
    stored?.trim() || import.meta.env.VITE_FIRECRAWL_API_BASE_URL || 'https://api.firecrawl.dev',
  );
}

/**
 * Return the API key baked into the bundle at build time.
 *
 * @returns The value of `VITE_FIRECRAWL_API_KEY`, or an empty string.
 */
export function getBuildTimeApiKey(): string {
  return import.meta.env.VITE_FIRECRAWL_API_KEY || '';
}

/**
 * Returns the API key for the Firecrawl API
 * @returns {string} The API key from local storage, environment variables, or empty string
 */
const getApiKey = (): string => {
  return localStorage.getItem('firecrawl_api_key') || getBuildTimeApiKey();
};

/**
 * Runtime API configuration used by the Firecrawl v2 adapter layer.
 */
const apiConfig = {
  basePath: getBaseUrl(),
  apiKey: getApiKey(),
};

/**
 * Updates the API configuration at runtime.
 *
 * @param baseUrl - Optional new base URL for the API.
 * @param apiKeyValue - Optional new API key.
 */
export function updateApiConfig(baseUrl?: string, apiKeyValue?: string): void {
  if (typeof baseUrl === 'string') {
    localStorage.setItem('firecrawl_base_url', baseUrl);
    apiConfig.basePath = resolveBaseUrl(baseUrl);
  }
  if (typeof apiKeyValue === 'string') {
    if (apiKeyValue.trim()) {
      localStorage.setItem('firecrawl_api_key', apiKeyValue.trim());
      apiConfig.apiKey = apiKeyValue.trim();
    } else {
      forgetApiKey();
    }
  }
}

/**
 * Remove the API key saved in this browser.
 *
 * The key baked in at build time, if any, cannot be removed from here and
 * becomes the active key again.
 *
 * @returns True when a build-time key is still in use afterwards.
 */
export function forgetApiKey(): boolean {
  localStorage.removeItem('firecrawl_api_key');
  apiConfig.apiKey = getBuildTimeApiKey();
  return Boolean(apiConfig.apiKey);
}

/**
 * Retrieve the current API configuration instance.
 *
 * @returns The active API configuration.
 */
export function getApiConfig(): typeof apiConfig {
  return apiConfig;
}

export default apiConfig;
