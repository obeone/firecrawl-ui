<template>
  <div class="page-container search-view">
    <form @submit.prevent="onSearch" class="scrape-config-form">
      <div class="form-group">
        <label for="query">Search Query:</label>
        <input id="query" v-model="query" type="text" placeholder="Enter search terms" required />
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Search Options</legend>
        <div class="grid-layout">
          <div class="form-group">
            <label for="provider">Provider:</label>
            <select id="provider" v-model="options.provider">
              <option value="google">Google</option>
              <option value="serper">Serper</option>
              <option value="searchapi">SearchAPI</option>
              <option value="searxng">SearxNG</option>
            </select>
          </div>
          <div class="form-group">
            <label for="region">Region:</label>
            <input id="region" v-model="options.region" type="text" placeholder="us-east-1" />
          </div>
          <div class="form-group">
            <label for="maxResults">Max Results:</label>
            <input
              id="maxResults"
              v-model.number="options.maxResults"
              type="number"
              min="1"
              max="50"
            />
          </div>
        </div>
      </fieldset>

      <button type="submit" class="primary-button" :disabled="loading">Search</button>
      <span v-if="loading" class="status">Loading...</span>
      <span v-if="error" class="status error">{{ error }}</span>
    </form>

    <section v-if="results.length" class="results">
      <div class="result-header">
        <h2>Search Results</h2>
        <button class="secondary-button" @click="downloadResults">Download JSON</button>
      </div>
      <ul>
        <li v-for="(result, index) in results" :key="index" class="result-item">
          <a :href="result.url" target="_blank" rel="noopener noreferrer">{{ result.title }}</a>
          <p v-if="result.description">{{ result.description }}</p>
          <pre v-if="result.content">{{ result.content }}</pre>
        </li>
      </ul>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { postV2 } from '@/api/v2Client';

interface SearchOptionsV2 {
  provider: 'google' | 'serper' | 'searchapi' | 'searxng';
  region: string;
  maxResults: number;
}

interface SearchResultV2 {
  title: string;
  url: string;
  description?: string;
  content?: string;
}

export default defineComponent({
  name: 'SearchViewV2',
  setup() {
    const query = ref('');
    const options = ref<SearchOptionsV2>({
      provider: 'google',
      region: '',
      maxResults: 10,
    });
    const loading = ref(false);
    const error = ref('');
    const results = ref<SearchResultV2[]>([]);

    /**
     * Executes the search request using the configured options.
     *
     * @returns {Promise<void>} Resolves once the request completes.
     */
    const onSearch = async (): Promise<void> => {
      loading.value = true;
      error.value = '';
      results.value = [];

      const payload: Record<string, unknown> = {
        query: query.value,
        searchOptions: {
          provider: options.value.provider,
          ...(options.value.region.trim() ? { region: options.value.region.trim() } : {}),
          ...(options.value.maxResults ? { maxResults: options.value.maxResults } : {}),
        },
      };

      try {
        const response = await postV2<SearchResultV2[]>('search', payload);
        results.value = response.data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Search request failed.';
      } finally {
        loading.value = false;
      }
    };

    /**
     * Downloads the search results as a JSON file.
     */
    const downloadResults = (): void => {
      const blob = new Blob([JSON.stringify(results.value, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'search-results-v2.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    return {
      query,
      options,
      loading,
      error,
      results,
      onSearch,
      downloadResults,
    };
  },
});
</script>

<style scoped>
@import '@/assets/main.css';

.search-view {
  max-width: 800px;
  margin: 0 auto;
}

.options-fieldset {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.secondary-button {
  background-color: #f0f0f0;
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.secondary-button:hover {
  background-color: #e0e0e0;
}

.result-item {
  margin-bottom: 1rem;
}

.result-item pre {
  background-color: #f7f7f7;
  padding: 0.5rem;
  border-radius: 4px;
  white-space: pre-wrap;
}
</style>
