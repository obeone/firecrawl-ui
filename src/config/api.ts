import { Configuration } from '../api-client/configuration.js';

export type ApiVersion = 'v1' | 'v2';

const API_KEY_STORAGE_KEY = 'firecrawl_api_key';
const BASE_URL_STORAGE_KEY = 'firecrawl_base_url';
const API_VERSION_STORAGE_KEY = 'firecrawl_api_version';

const DEFAULT_BASE_URLS: Record<ApiVersion, string> = {
  v1: 'https://api.firecrawl.dev/v1',
  v2: 'https://api.firecrawl.dev/v2',
};

const isBrowser = typeof window !== 'undefined';

/**
 * Read a value from local storage when running in a browser context.
 *
 * @param key - Storage key to read.
 * @returns The stored value or null when unavailable.
 */
function readStorage(key: string): string | null {
  if (!isBrowser) {
    return null;
  }
  return localStorage.getItem(key);
}

/**
 * Persist a value in local storage when running in a browser context.
 *
 * @param key - Storage key to update.
 * @param value - Value to persist.
 */
function writeStorage(key: string, value: string): void {
  if (!isBrowser) {
    return;
  }
  localStorage.setItem(key, value);
}

/**
 * Remove a value from local storage when running in a browser context.
 *
 * @param key - Storage key to remove.
 */
function deleteStorage(key: string): void {
  if (!isBrowser) {
    return;
  }
  localStorage.removeItem(key);
}

/**
 * Retrieve the currently selected API version.
 *
 * The order of precedence is:
 * 1. Value stored in local storage.
 * 2. Value provided through the Vite environment variable `VITE_FIRECRAWL_API_VERSION`.
 * 3. Default to version `v1`.
 *
 * @returns The resolved API version.
 */
export const getApiVersion = (): ApiVersion => {
  const stored = readStorage(API_VERSION_STORAGE_KEY);
  if (stored === 'v2') {
    return 'v2';
  }
  const envVersion = import.meta.env.VITE_FIRECRAWL_API_VERSION;
  if (envVersion === 'v2') {
    return 'v2';
  }
  return 'v1';
};

/**
 * Retrieve the default base URL for a given API version.
 *
 * @param version - Target API version. Defaults to the active version.
 * @returns The default base URL associated with the version.
 */
export const getDefaultBaseUrl = (version: ApiVersion = getApiVersion()): string => {
  return DEFAULT_BASE_URLS[version];
};

/**
 * Resolve the base URL using an explicit override, stored value or defaults.
 *
 * @param version - Target API version.
 * @param override - Optional URL override supplied at runtime.
 * @returns The resolved base URL.
 */
function resolveBaseUrl(version: ApiVersion, override?: string): string {
  if (typeof override === 'string') {
    const trimmed = override.trim();
    if (trimmed) {
      writeStorage(BASE_URL_STORAGE_KEY, trimmed);
      return trimmed;
    }
    deleteStorage(BASE_URL_STORAGE_KEY);
  }

  const stored = readStorage(BASE_URL_STORAGE_KEY);
  if (stored && stored.trim()) {
    return stored.trim();
  }

  const envUrl = import.meta.env.VITE_FIRECRAWL_API_BASE_URL;
  if (typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim();
  }

  return getDefaultBaseUrl(version);
}

/**
 * Retrieve the base URL for the active API version.
 *
 * @param version - Optional API version override.
 * @returns The resolved base URL.
 */
export const getBaseUrl = (version: ApiVersion = getApiVersion()): string => {
  return resolveBaseUrl(version);
};

/**
 * Retrieve the persisted API key.
 *
 * @returns The stored API key or an empty string when not configured.
 */
export const getApiKey = (): string => {
  const stored = readStorage(API_KEY_STORAGE_KEY);
  if (stored != null) {
    return stored;
  }
  const envKey = import.meta.env.VITE_FIRECRAWL_API_KEY;
  return typeof envKey === 'string' ? envKey : '';
};

/**
 * Build the default Axios base options used by the OpenAPI client.
 *
 * @param apiKey - API key to use when building the Authorization header.
 * @returns An options object containing default headers.
 */
function createBaseOptions(apiKey?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return { headers };
}

const apiConfig = new Configuration({
  basePath: getBaseUrl(),
  apiKey: getApiKey,
  baseOptions: createBaseOptions(getApiKey()),
});

/**
 * Update the API configuration used by generated and custom clients.
 *
 * @param baseUrl - Optional new base URL override.
 * @param apiKeyValue - Optional new API key to persist.
 * @param version - Optional API version selection.
 */
export function updateApiConfig(
  baseUrl?: string,
  apiKeyValue?: string,
  version?: ApiVersion,
): void {
  const targetVersion = version ?? getApiVersion();
  if (version) {
    writeStorage(API_VERSION_STORAGE_KEY, version);
  }

  const resolvedBaseUrl = resolveBaseUrl(targetVersion, baseUrl);
  apiConfig.basePath = resolvedBaseUrl;

  if (typeof apiKeyValue === 'string') {
    writeStorage(API_KEY_STORAGE_KEY, apiKeyValue);
  }

  const resolvedKey = getApiKey();
  apiConfig.apiKey = getApiKey;
  apiConfig.baseOptions = createBaseOptions(resolvedKey);
}

/**
 * Retrieve the singleton API configuration instance.
 *
 * @returns The current API configuration.
 */
export function getApiConfig(): Configuration {
  return apiConfig;
}

export default apiConfig;
