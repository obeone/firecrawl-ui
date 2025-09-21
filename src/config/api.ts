import { Configuration } from '../api-client/configuration.js';
import type { ApiVersion } from '../types/api.js';

const BASE_URL_STORAGE_KEY = 'firecrawl_base_url';
const API_KEY_STORAGE_KEY = 'firecrawl_api_key';
const API_VERSION_STORAGE_KEY = 'firecrawl_api_version';
const DEFAULT_BASE_URLS: Record<ApiVersion, string> = {
  v1: 'https://api.firecrawl.dev/v1',
  v2: 'https://api.firecrawl.dev/v2',
};
const DEFAULT_VERSION: ApiVersion = 'v1';

/**
 * Resolve the API version persisted in local storage or provided by the environment.
 *
 * @returns {ApiVersion} The effective API version.
 */
export function getApiVersion(): ApiVersion {
  const storedVersion = localStorage.getItem(API_VERSION_STORAGE_KEY);
  if (storedVersion === 'v2') {
    return 'v2';
  }
  if (storedVersion === 'v1') {
    return 'v1';
  }
  const envVersion = import.meta.env.VITE_FIRECRAWL_API_VERSION;
  return envVersion === 'v2' ? 'v2' : DEFAULT_VERSION;
}

/**
 * Retrieve the current API key from local storage or environment variables.
 *
 * @returns {string} The API key string or an empty string when not configured.
 */
const getApiKey = (): string => {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || import.meta.env.VITE_FIRECRAWL_API_KEY || '';
};

/**
 * Compute the preferred base URL, falling back to the default value for the given version.
 *
 * @param candidate - Optional URL candidate to evaluate.
 * @param version - The API version used to select the default base URL.
 * @returns {string} The resolved base URL string.
 */
function resolveBaseUrl(candidate: string | null | undefined, version: ApiVersion): string {
  const trimmed = (candidate || '').trim();
  if (!trimmed) {
    return DEFAULT_BASE_URLS[version];
  }
  return trimmed;
}

/**
 * Provide the currently configured base URL.
 *
 * @returns {string} The active base URL string.
 */
export function getCurrentBaseUrl(): string {
  const version = getApiVersion();
  const stored = localStorage.getItem(BASE_URL_STORAGE_KEY);
  if (stored && stored.trim().length > 0) {
    return stored.trim();
  }
  const envBaseUrl = import.meta.env.VITE_FIRECRAWL_API_BASE_URL;
  if (envBaseUrl && `${envBaseUrl}`.trim().length > 0) {
    return `${envBaseUrl}`.trim();
  }
  return DEFAULT_BASE_URLS[version];
}

/**
 * Expose the default base URL per API version. Useful for UI placeholders.
 *
 * @param version - The API version to retrieve the default URL for.
 * @returns {string} The default base URL string associated with the provided version.
 */
export function getDefaultBaseUrl(version: ApiVersion): string {
  return DEFAULT_BASE_URLS[version];
}

const initialVersion = getApiVersion();
const apiConfig = new Configuration({
  basePath: resolveBaseUrl(getCurrentBaseUrl(), initialVersion),
  apiKey: getApiKey,
  baseOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// Dynamically add the Authorization header if an API key is available.
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
 * @param apiVersionValue - Optional API version selection.
 */
export function updateApiConfig(
  baseUrl?: string,
  apiKeyValue?: string,
  apiVersionValue?: ApiVersion,
): void {
  const previousVersion = getApiVersion();
  if (typeof apiVersionValue === 'string') {
    localStorage.setItem(API_VERSION_STORAGE_KEY, apiVersionValue);
  }
  const activeVersion = apiVersionValue ?? previousVersion;

  if (typeof baseUrl === 'string') {
    localStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);
  }
  if (typeof apiKeyValue === 'string') {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyValue);
    apiConfig.apiKey = apiKeyValue;
  }

  const storedBaseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY);
  const shouldSwapDefault =
    !baseUrl &&
    apiVersionValue !== undefined &&
    (!storedBaseUrl || storedBaseUrl === DEFAULT_BASE_URLS[previousVersion]);
  if (shouldSwapDefault) {
    localStorage.setItem(BASE_URL_STORAGE_KEY, DEFAULT_BASE_URLS[activeVersion]);
  }
  const refreshedBaseUrl = localStorage.getItem(BASE_URL_STORAGE_KEY);
  apiConfig.basePath = resolveBaseUrl(refreshedBaseUrl, activeVersion);

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
