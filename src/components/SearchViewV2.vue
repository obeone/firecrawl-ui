<template>
  <div class="page-container">
    <form @submit.prevent="onSearch" class="scrape-config-form">
      <div class="form-group">
        <label for="query">Search query:</label>
        <input id="query" v-model="query" type="text" placeholder="Enter search terms" required />
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Search options</legend>
        <div class="grid-layout">
          <div class="form-group">
            <label for="provider">Provider:</label>
            <select id="provider" v-model="options.provider">
              <option value="google">Google</option>
              <option value="serper">Serper</option>
              <option value="searchapi">SearchAPI</option>
              <option value="searxng">SearXNG</option>
            </select>
          </div>
          <div class="form-group">
            <label for="region">Region:</label>
            <input id="region" v-model="options.region" type="text" placeholder="us-east" />
          </div>
          <div class="form-group">
            <label for="maxResults">Max results:</label>
            <input
              id="maxResults"
              v-model.number="options.maxResults"
              type="number"
              min="1"
              max="20"
            />
          </div>
        </div>
      </fieldset>

      <button type="submit" class="primary-button">Search</button>
      <span v-if="loading" class="status">Loading...</span>
      <span v-if="error" class="status error">{{ error }}</span>
    </form>

    <section v-if="results.length" class="results">
      <h2>Search results</h2>
      <ul>
        <li v-for="(result, index) in results" :key="index" class="result-item">
          <a :href="result.url" target="_blank" rel="noopener noreferrer">{{ result.title }}</a>
          <p v-if="result.description">{{ result.description }}</p>
          <pre v-if="result.content" class="content">{{ result.content }}</pre>
        </li>
      </ul>
      <button class="secondary-button" @click="downloadResults">Download JSON</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { inject, reactive, ref } from 'vue';
import type { FirecrawlApiClients } from '@/plugins/api';
import type { SearchApiV2, SearchRequestV2, SearchResultV2 } from '@/api-client-v2/index.js';

const clients = inject('api') as FirecrawlApiClients | undefined;
if (!clients || clients.version !== 'v2') {
  throw new Error('Search API v2 is not available');
}
const searchApi = clients.search as SearchApiV2;

const query = ref('');
const options = reactive({
  provider: 'google',
  region: '',
  maxResults: 10,
});
const loading = ref(false);
const error = ref('');
const results = ref<SearchResultV2[]>([]);

/**
 * Execute the search using the v2 endpoint.
 */
const onSearch = async (): Promise<void> => {
  loading.value = true;
  error.value = '';
  results.value = [];

  const payload: SearchRequestV2 = {
    query: query.value,
    searchOptions: {
      provider: options.provider as SearchRequestV2['searchOptions']['provider'],
      ...(options.region.trim() ? { region: options.region.trim() } : {}),
      maxResults: options.maxResults,
    },
  };

  try {
    const response = await searchApi.search(payload);
    results.value = response.data ?? [];
  } catch (err: any) {
    error.value = err?.message || 'Search request failed';
  } finally {
    loading.value = false;
  }
};

/**
 * Download search results as a JSON file.
 */
const downloadResults = (): void => {
  if (!results.value.length) {
    return;
  }
  const blob = new Blob([JSON.stringify(results.value, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'search-results.json';
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
.page-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 12px;
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
  border: 1px solid #ccc;
  border-radius: 4px;
}

.primary-button {
  background-color: #0066cc;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.secondary-button {
  background-color: #f4f4f4;
  border: 1px solid #ccc;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.status {
  margin-left: 10px;
}

.status.error {
  color: #cc0000;
}

.results {
  margin-top: 20px;
}

.result-item {
  margin-bottom: 12px;
}

.result-item a {
  font-weight: bold;
  color: #0066cc;
  text-decoration: none;
}

.result-item a:hover {
  text-decoration: underline;
}

.content {
  background-color: #f7f7f7;
  padding: 8px;
  border-radius: 4px;
  white-space: pre-wrap;
}
</style>
