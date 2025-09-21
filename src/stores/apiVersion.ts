import { computed, ref } from 'vue';
import type { ApiVersion } from '@/types/api.js';
import { getApiVersion } from '@/config/api.js';

const apiVersionRef = ref<ApiVersion>(getApiVersion());

/**
 * Synchronize the reactive API version reference when configuration changes externally.
 *
 * @param version - The API version to apply.
 */
export function syncApiVersion(version: ApiVersion): void {
  apiVersionRef.value = version;
}

/**
 * Composable providing accessors for the active API version.
 *
 * @returns Helpers to read and update the stored API version.
 */
export function useApiVersion() {
  /**
   * Update the reactive version reference.
   *
   * @param version - The API version to persist locally.
   */
  const setApiVersion = (version: ApiVersion): void => {
    apiVersionRef.value = version;
  };

  return {
    apiVersion: computed(() => apiVersionRef.value),
    setApiVersion,
  };
}
