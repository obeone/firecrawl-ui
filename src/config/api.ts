import { normalizeFirecrawlBaseUrl } from '../services/firecrawl.js';

/**
 * Returns the base URL for the Firecrawl API.
 *
 * @returns {string} The base URL from local storage, environment variables or a
 *   default value.
 */
const getBaseUrl = (): string => {
  return normalizeFirecrawlBaseUrl(
    localStorage.getItem('firecrawl_base_url') ||
      import.meta.env.VITE_FIRECRAWL_API_BASE_URL ||
      'https://api.firecrawl.dev',
  );
};

/**
 * Returns the API key for the Firecrawl API
 * @returns {string} The API key from local storage, environment variables, or empty string
 */
const getApiKey = (): string => {
  return localStorage.getItem('firecrawl_api_key') || import.meta.env.VITE_FIRECRAWL_API_KEY || '';
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
    apiConfig.basePath = normalizeFirecrawlBaseUrl(baseUrl || 'https://api.firecrawl.dev');
  }
  if (typeof apiKeyValue === 'string') {
    localStorage.setItem('firecrawl_api_key', apiKeyValue);
    apiConfig.apiKey = apiKeyValue;
  }
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
