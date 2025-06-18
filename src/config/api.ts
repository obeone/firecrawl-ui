import { Configuration } from '../api-client/configuration.js';

/**
 * Returns the base URL for the Firecrawl API.
 *
 * @returns {string} The base URL from local storage, environment variables or a
 *   default value.
 */
const getBaseUrl = (): string => {
  return (
    localStorage.getItem('firecrawl_base_url') ||
    import.meta.env.VITE_FIRECRAWL_API_BASE_URL ||
    'https://api.firecrawl.dev/v1'
  );
};

/**
 * Returns the API key for the Firecrawl API
 * @returns {string} The API key from local storage, environment variables, or empty string
 */
const getApiKey = (): string => {
  return localStorage.getItem('firecrawl_api_key') || import.meta.env.VITE_FIRECRAWL_API_KEY || '';
};

// Initializes the API configuration with base URL, API key, and default headers.
const apiConfig = new Configuration({
  basePath: getBaseUrl(),
  apiKey: getApiKey,
  baseOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// Dynamically adds the Authorization header if an API key is available.
// This ensures that authenticated requests are properly handled.

// Dynamically add the Authorization header if an API key is available
const apiKey = getApiKey();
if (apiKey) {
  apiConfig.baseOptions = {
    ...apiConfig.baseOptions,
    headers: {
      ...apiConfig.baseOptions?.headers,
      Authorization: `Bearer ${apiKey}`,
    },
  };
}

/**
 * Updates the API configuration at runtime.
 *
 * @param baseUrl - Optional new base URL for the API.
 * @param apiKeyValue - Optional new API key.
 */
export function updateApiConfig(baseUrl?: string, apiKeyValue?: string): void {
  if (typeof baseUrl === 'string') {
    localStorage.setItem('firecrawl_base_url', baseUrl);
    apiConfig.basePath = baseUrl || 'https://api.firecrawl.dev/v1';
  }
  if (typeof apiKeyValue === 'string') {
    localStorage.setItem('firecrawl_api_key', apiKeyValue);
    apiConfig.apiKey = apiKeyValue;
  }

  const key = apiKeyValue ?? getApiKey();
  apiConfig.baseOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
  };
}

/**
 * Retrieve the current API configuration instance.
 *
 * @returns The active API configuration.
 */
export function getApiConfig(): Configuration {
  return apiConfig;
}

export default apiConfig;
