<template>
  <div class="api-key-input">
    <h2>API Configuration</h2>
    <form @submit.prevent="saveApiConfig">
      <div class="form-group">
        <label for="apiVersion">Firecrawl API version:</label>
        <select id="apiVersion" v-model="selectedVersion">
          <option value="v1">Version 1</option>
          <option value="v2">Version 2</option>
        </select>
        <small>Select the API version matching your backend deployment.</small>
      </div>
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
        <label for="baseUrl">Firecrawl API base URL (optional):</label>
        <input id="baseUrl" v-model="baseUrl" type="text" :placeholder="placeholderUrl" />
        <small> Leave blank to use the default URL for the selected version. </small>
      </div>
      <button type="submit" class="primary-button">Save</button>
    </form>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="success" class="success-message">API configuration saved successfully!</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { refreshApiClients } from '@/plugins/api';
import { getDefaultBaseUrl, getApiVersion, type ApiVersion } from '@/config/api';
import { useApiVersion } from '@/stores/apiVersion';

/**
 * Component allowing users to configure and store the Firecrawl API key, version and base URL.
 * This component handles the persistence of these settings in local storage.
 *
 * @returns Component options for the API key input view.
 */
export default defineComponent({
  name: 'ApiKeyInput',
  setup() {
    const apiVersionState = useApiVersion();
    const selectedVersion = ref<ApiVersion>(apiVersionState.value ?? getApiVersion());
    const apiKey = ref(localStorage.getItem('firecrawl_api_key') || '');
    const baseUrl = ref(localStorage.getItem('firecrawl_base_url') || '');
    const error = ref('');
    const success = ref(false);

    const placeholderUrl = computed(() => getDefaultBaseUrl(selectedVersion.value));

    onMounted(() => {
      if (!apiKey.value) {
        error.value = 'Please configure your API key to continue';
      }
    });

    const saveApiConfig = () => {
      try {
        if (!apiKey.value) {
          throw new Error('Please enter a valid API key');
        }

        localStorage.setItem('firecrawl_api_key', apiKey.value);
        if (baseUrl.value.trim()) {
          localStorage.setItem('firecrawl_base_url', baseUrl.value);
        } else {
          localStorage.removeItem('firecrawl_base_url');
        }

        success.value = true;
        error.value = '';
        setTimeout(() => (success.value = false), 3000);

        refreshApiClients(baseUrl.value, apiKey.value, selectedVersion.value);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Unknown error';
        success.value = false;
      }
    };

    return {
      apiKey,
      baseUrl,
      error,
      success,
      saveApiConfig,
      selectedVersion,
      placeholderUrl,
    };
  },
});
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

input,
select {
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
