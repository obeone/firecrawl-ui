import { ref, type Ref } from 'vue';

export type ApiVersion = 'v1' | 'v2';

const STORAGE_KEY = 'firecrawl_api_version';
const DEFAULT_VERSION: ApiVersion = 'v1';

/**
 * Reads the stored API version from local storage.
 *
 * @returns {ApiVersion} The stored API version or the default when unavailable.
 */
function readStoredVersion(): ApiVersion {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_VERSION;
  }
  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  return storedValue === 'v2' ? 'v2' : DEFAULT_VERSION;
}

const versionRef: Ref<ApiVersion> = ref<ApiVersion>(readStoredVersion());

/**
 * Retrieves the currently stored API version.
 *
 * @returns {ApiVersion} The active API version.
 */
export function getStoredApiVersion(): ApiVersion {
  return versionRef.value;
}

/**
 * Persists the API version in local storage and updates the shared reference.
 *
 * @param {ApiVersion} version - The API version to persist.
 * @returns {void}
 */
export function setStoredApiVersion(version: ApiVersion): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY, version);
  }
  versionRef.value = version;
}

/**
 * Provides reactive accessors for the API version value.
 *
 * @returns {{ apiVersion: Ref<ApiVersion>; setApiVersion: (version: ApiVersion) => void }}
 *   The reactive reference and the setter function.
 */
export function useApiVersion(): {
  apiVersion: Ref<ApiVersion>;
  setApiVersion: (version: ApiVersion) => void;
} {
  return {
    apiVersion: versionRef,
    setApiVersion: setStoredApiVersion,
  };
}
