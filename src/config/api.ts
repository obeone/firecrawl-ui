import { Configuration } from "../api-client/configuration.js";

/**
 * Returns the base URL for the Firecrawl API
 * @returns {string} The base URL from local storage, environment variables, or default
 */
const getBaseUrl = () => {
  return (
    localStorage.getItem("firecrawl_base_url") ||
    import.meta.env.VITE_FIRECRAWL_API_BASE_URL ||
    "https://api.firecrawl.dev/v1"
  );
};

/**
 * Returns the API key for the Firecrawl API
 * @returns {string} The API key from local storage, environment variables, or empty string
 */
const getApiKey = () => {
  // Retrieves the API key from local storage or environment variables
  return (
    localStorage.getItem("firecrawl_api_key") ||
    import.meta.env.VITE_FIRECRAWL_API_KEY ||
    ""
  );
};

// Create the API configuration
const apiConfig = new Configuration({
  basePath: getBaseUrl(),
  apiKey: getApiKey,
  baseOptions: {
    headers: {
      "Content-Type": "application/json",
    },
  },
});

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
