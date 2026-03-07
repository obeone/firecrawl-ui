<template>
  <div class="api-key-input">
    <h2>API Configuration</h2>
    <form @submit.prevent="saveApiConfig">
      <div class="form-group">
        <label for="apiKey">Firecrawl API Key:</label>
        <input
          id="apiKey"
          v-model="apiKey"
          type="password"
          placeholder="Enter your API key"
          required
        />
        <small>
          You can get your API key on
          <a href="https://app.firecrawl.dev" target="_blank">the Firecrawl dashboard</a>
        </small>
      </div>
      <div class="form-group">
        <label for="apiVersion">Firecrawl API version:</label>
        <select id="apiVersion" v-model="selectedVersion">
          <option value="v1">v1</option>
          <option value="v2">v2</option>
        </select>
        <small>Select the API version that matches your backend deployment.</small>
      </div>
      <div class="form-group">
        <label for="baseUrl">Firecrawl API base URL (optional):</label>
        <input id="baseUrl" v-model="baseUrl" type="text" :placeholder="placeholder" />
        <small> Leave blank to use the default URL. </small>
      </div>
      <button type="submit" class="primary-button">Save</button>
    </form>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="success" class="success-message">API Key saved successfully!</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, computed } from 'vue';
import { refreshApiClients } from '@/plugins/api';
import { getBaseUrlForVersion, getDefaultBaseUrl } from '@/config/api';
import { useApiVersion, type ApiVersion } from '@/config/apiVersion';

/**
 * Component allowing users to configure and store the Firecrawl API key and base URL.
 * This component handles the persistence of these settings in local storage.
 *
 * @returns Component options for the API key input view.
 */

export default defineComponent({
  name: 'ApiKeyInput',
  setup() {
    const { apiVersion, setApiVersion } = useApiVersion();
    const apiKey = ref(readStoredApiKey());
    const selectedVersion = ref<ApiVersion>(apiVersion.value);
    const baseUrl = ref(getBaseUrlForVersion(selectedVersion.value));
    const error = ref('');
    const success = ref(false);

    const placeholder = computed(() => getDefaultBaseUrl(selectedVersion.value));

    // Automatically display if no key is configured
    onMounted(() => {
      if (!apiKey.value) {
        error.value = 'Please configure your API key to continue';
      }
    });

    watch(
      selectedVersion,
      (newVersion) => {
        baseUrl.value = getBaseUrlForVersion(newVersion);
      },
      { immediate: true },
    );

    const saveApiConfig = () => {
      try {
        if (!apiKey.value) {
          throw new Error('Please enter a valid API key');
        }

        setApiVersion(selectedVersion.value);

        success.value = true;
        error.value = '';
        setTimeout(() => (success.value = false), 3000);

        // Update API clients dynamically without reloading the page
        refreshApiClients(baseUrl.value, apiKey.value, selectedVersion.value);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error';
        success.value = false;
      }
    };

    return {
      apiKey,
      baseUrl,
      placeholder,
      error,
      success,
      selectedVersion,
      saveApiConfig,
    };
  },
});

/**
 * Reads the API key from local storage or environment variables.
 *
 * @returns {string} The stored API key or an empty string when unavailable.
 */
function readStoredApiKey(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedKey = window.localStorage.getItem('firecrawl_api_key');
    if (storedKey !== null) {
      return storedKey;
    }
  }
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_FIRECRAWL_API_KEY || '';
}
</script>

<style scoped>
.api-key-input {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #0066cc;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-message {
  color: #cc0000;
  margin-top: 10px;
}

.success-message {
  color: #00aa00;
  margin-top: 10px;
}

small {
  display: block;
  margin-top: 5px;
  font-size: 0.8em;
  color: #666;
}
</style>
