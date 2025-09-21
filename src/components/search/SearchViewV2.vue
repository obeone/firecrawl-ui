<template>
  <div class="page-container">
    <form class="search-form" @submit.prevent="handleSearch">
      <div class="form-group">
        <label for="query">Query</label>
        <input id="query" v-model="query" type="text" placeholder="What is Firecrawl?" required />
      </div>
      <div class="grid">
        <div class="form-group">
          <label for="provider">Provider</label>
          <select id="provider" v-model="options.provider">
            <option value="google">Google</option>
            <option value="serper">Serper</option>
            <option value="searchapi">SearchAPI</option>
            <option value="searxng">SearxNG</option>
          </select>
        </div>
        <div class="form-group">
          <label for="region">Region (optional)</label>
          <input id="region" v-model="options.region" type="text" placeholder="us-east" />
        </div>
        <div class="form-group">
          <label for="maxResults">Max results</label>
          <input id="maxResults" v-model.number="options.maxResults" type="number" min="1" />
        </div>
      </div>
      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Searching…' : 'Search' }}
      </button>
    </form>

    <div v-if="error" class="status error">{{ error }}</div>

    <section v-if="results.length" class="results">
      <h2>Results</h2>
      <ul>
        <li v-for="(item, index) in results" :key="index" class="result-item">
          <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer">{{
            item.title || item.url
          }}</a>
          <span v-else>{{ item.title || 'Result' }}</span>
          <p v-if="item.description">{{ item.description }}</p>
          <pre v-if="item.content">{{ item.content }}</pre>
        </li>
      </ul>
      <button class="secondary-button" type="button" @click="downloadResults">Download JSON</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { inject, reactive, ref } from 'vue';
import type { AxiosResponse } from 'axios';
import type { FirecrawlApiClients } from '@/plugins/api';
import type { SearchRequestV2, SearchResultV2 } from '@/types/api.js';

interface SearchOptionsState {
  provider: NonNullable<SearchRequestV2['searchOptions']>['provider'];
  region: string;
  maxResults: number;
}

const api = inject('api') as FirecrawlApiClients | undefined;
if (!api?.search) {
  throw new Error('Search API client is not available.');
}

const query = ref('');
const options = reactive<SearchOptionsState>({
  provider: 'google',
  region: '',
  maxResults: 10,
});

const loading = ref(false);
const error = ref('');
const results = ref<SearchResultV2[]>([]);

/**
 * Trigger the search request using the v2 API contract.
 */
async function handleSearch(): Promise<void> {
  error.value = '';
  results.value = [];

  const payload: SearchRequestV2 = {
    query: query.value,
    searchOptions: {
      provider: options.provider,
      ...(options.region ? { region: options.region } : {}),
      ...(options.maxResults ? { maxResults: options.maxResults } : {}),
    },
  };

  try {
    loading.value = true;
    const response = (await api.search.search(payload)) as AxiosResponse<SearchResultV2[]>;
    results.value = response.data ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Search request failed.';
  } finally {
    loading.value = false;
  }
}

/**
 * Download search results as a JSON file.
 */
function downloadResults(): void {
  const blob = new Blob([JSON.stringify({ query: query.value, results: results.value }, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'search-results.json';
  link.click();
  URL.revokeObjectURL(link.href);
}
</script>

<style scoped>
.page-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem 1rem;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.primary-button,
.secondary-button {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button {
  background-color: #2563eb;
  color: #fff;
}

.secondary-button {
  background-color: #0f172a;
  color: #fff;
  margin-top: 1rem;
}

.status.error {
  color: #b91c1c;
}

.results ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.result-item a {
  color: #2563eb;
  font-weight: 600;
  text-decoration: none;
}

.result-item pre {
  background-color: #0f172a;
  color: #f8fafc;
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
  margin-top: 0.5rem;
}
</style>
