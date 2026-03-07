import { ref } from 'vue';
import { getApiVersion, type ApiVersion } from '@/config/api.js';

const apiVersionRef = ref<ApiVersion>(getApiVersion());

/**
 * Retrieve a reactive reference to the currently selected API version.
 *
 * @returns Reactive reference to the API version.
 */
export function useApiVersion() {
  return apiVersionRef;
}

/**
 * Update the reactive API version reference when configuration changes.
 *
 * @param version - Newly selected API version.
 */
export function setApiVersionState(version: ApiVersion): void {
  apiVersionRef.value = version;
}
