import { Configuration } from '../api-client/configuration.js';
import { getStoredApiVersion, setStoredApiVersion, type ApiVersion } from './apiVersion.js';

const BASE_URL_STORAGE_KEYS: Record<ApiVersion, string> = {
  v1: 'firecrawl_base_url_v1',
  v2: 'firecrawl_base_url_v2',
};
const LEGACY_BASE_URL_KEY = 'firecrawl_base_url';
const DEFAULT_BASE_URLS: Record<ApiVersion, string> = {
  v1: 'https://api.firecrawl.dev/v1',
  v2: 'https://api.firecrawl.dev/v2',
};
const API_KEY_STORAGE_KEY = 'firecrawl_api_key';

/**
 * Retrieves the base URL stored for the given API version.
 * Falls back to the legacy storage key when no version-specific value exists.
 *
 * @param {ApiVersion} version - The API version for which the base URL is requested.
 * @returns {string | null} The stored base URL or null if none is stored.
 */
function readStoredBaseUrl(version: ApiVersion): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  const versionSpecific = window.localStorage.getItem(BASE_URL_STORAGE_KEYS[version]);
  if (versionSpecific && versionSpecific.trim()) {
    return versionSpecific.trim();
  }
  const legacyValue = window.localStorage.getItem(LEGACY_BASE_URL_KEY);
  if (legacyValue && legacyValue.trim()) {
    return legacyValue.trim();
  }
  return null;
}

/**
 * Retrieves the base URL configured through environment variables.
 *
 * @param {ApiVersion} version - The API version for which the environment value should be read.
 * @returns {string | null} The environment base URL or null when not configured.
 */
function readEnvBaseUrl(version: ApiVersion): string | null {
  const env = import.meta.env as Record<string, string | undefined>;
  if (version === 'v2') {
    const envValue = env.VITE_FIRECRAWL_API_BASE_URL_V2 || env.VITE_FIRECRAWL_API_BASE_URL;
    return envValue && envValue.trim() ? envValue.trim() : null;
  }
  const envValue = env.VITE_FIRECRAWL_API_BASE_URL;
  return envValue && envValue.trim() ? envValue.trim() : null;
}

/**
 * Resolves the base URL for the provided API version following the priority:
 * stored value, environment variable, and finally the default URL.
 *
 * @param {ApiVersion} version - The API version whose base URL should be resolved.
 * @returns {string} The base URL to use for API calls.
 */
function resolveBaseUrl(version: ApiVersion): string {
  return readStoredBaseUrl(version) || readEnvBaseUrl(version) || DEFAULT_BASE_URLS[version];
}

/**
 * Retrieves the stored API key or falls back to the environment configuration.
 *
 * @returns {string} The API key to use for authenticated requests.
 */
const getApiKey = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey !== null) {
      return storedKey;
    }
  }
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_FIRECRAWL_API_KEY || '';
};

const apiConfig = new Configuration({
  basePath: resolveBaseUrl(getStoredApiVersion()),
  apiKey: getApiKey,
  baseOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

const initialKey = getApiKey();
if (initialKey) {
  apiConfig.baseOptions = {
    ...apiConfig.baseOptions,
    headers: {
      ...apiConfig.baseOptions?.headers,
      Authorization: `Bearer ${initialKey}`,
    },
  };
}

/**
 * Updates the API configuration at runtime.
 *
 * @param {string | undefined} baseUrl - Optional new base URL for the API.
 * @param {string | undefined} apiKeyValue - Optional new API key.
 * @param {ApiVersion | undefined} version - Optional API version to switch to.
 * @returns {void}
 */
export function updateApiConfig(
  baseUrl?: string,
  apiKeyValue?: string,
  version?: ApiVersion,
): void {
  const activeVersion = version ?? getStoredApiVersion();
  if (version) {
    setStoredApiVersion(version);
  }

  if (typeof baseUrl === 'string' && typeof window !== 'undefined' && window.localStorage) {
    const trimmedUrl = baseUrl.trim();
    if (trimmedUrl) {
      window.localStorage.setItem(BASE_URL_STORAGE_KEYS[activeVersion], trimmedUrl);
    } else {
      window.localStorage.removeItem(BASE_URL_STORAGE_KEYS[activeVersion]);
    }
    window.localStorage.removeItem(LEGACY_BASE_URL_KEY);
  }

  if (typeof apiKeyValue === 'string' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyValue);
    apiConfig.apiKey = apiKeyValue;
  }

  const resolvedUrl = resolveBaseUrl(activeVersion);
  apiConfig.basePath = resolvedUrl;

  const key = typeof apiKeyValue === 'string' ? apiKeyValue : getApiKey();
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
 * @returns {Configuration} The active API configuration.
 */
export function getApiConfig(): Configuration {
  return apiConfig;
}

/**
 * Retrieves the base URL for a specific API version.
 *
 * @param {ApiVersion} version - The version whose base URL should be returned.
 * @returns {string} The resolved base URL.
 */
export function getBaseUrlForVersion(version: ApiVersion): string {
  return resolveBaseUrl(version);
}

/**
 * Retrieves the base URL for the currently active API version.
 *
 * @returns {string} The base URL configured for the active version.
 */
export function getBaseUrl(): string {
  return resolveBaseUrl(getStoredApiVersion());
}

/**
 * Provides the default base URL for the provided API version.
 *
 * @param {ApiVersion} version - The API version whose default URL is required.
 * @returns {string} The default base URL for the version.
 */
export function getDefaultBaseUrl(version: ApiVersion): string {
  return DEFAULT_BASE_URLS[version];
}

export default apiConfig;
