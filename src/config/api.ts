import { Configuration } from '../api-client/configuration.js';

/**
 * Returns the base URL for the Firecrawl API
 * @returns {string} The base URL from local storage, environment variables, or default
 */
const getBaseUrl = () => {
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
const getApiKey = () => {
  // Retrieves the API key from local storage or environment variables
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

export default apiConfig;
