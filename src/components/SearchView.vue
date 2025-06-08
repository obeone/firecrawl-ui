<template>
  <div class="scrape-config-container">
    <form @submit.prevent="onSearch" class="scrape-config-form">
      <label for="query">Search Query:</label>
      <input
        id="query"
        v-model="query"
        type="text"
        placeholder="Enter search terms"
        required
      />

      <fieldset class="advanced-options">
        <legend>Advanced Options</legend>
        <label>
          <input type="checkbox" v-model="options.includeMetadata" />
          Include metadata in results
        </label>
        <label>
          <input type="checkbox" v-model="options.extractContent" />
          Enable content extraction
        </label>
        <label>
          Max results:
          <input
            type="number"
            v-model.number="options.maxResults"
            min="1"
            max="100"
          />
        </label>
      </fieldset>

      <button type="submit">Search</button>
    </form>

    <section v-if="results.length" class="results">
      <h2>Search Results</h2>
      <ul>
        <li v-for="(result, index) in results" :key="index" class="result-item">
          <a :href="result.url" target="_blank" rel="noopener noreferrer">{{ result.title }}</a>
          <div v-if="options.includeMetadata && result.metadata" class="metadata">
            <small>{{ result.metadata.title }}</small>
          </div>
          <div v-if="result.markdown" class="extracted-content">
            <h3>Extracted Content</h3>
            <p>{{ result.markdown }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import type { SearchApi, SearchRequest } from '@/api-client/search.js'

interface SearchResult {
  title: string
  url: string
  description?: string
  markdown?: string | null
  html?: string | null
  rawHtml?: string | null
  links?: string[]
  screenshot?: string | null
  metadata?: {
    title?: string
    description?: string
    sourceURL?: string
    statusCode?: number
    error?: string | null
  }
}

const api = inject('api') as { search?: SearchApi } | undefined
if (!api?.search) {
  throw new Error('Search API is not available')
}

const query = ref('')
const options = ref({
  includeMetadata: true,
  extractContent: false,
  maxResults: 5,
})

const loading = ref(false)
const error = ref('')
const results = ref<SearchResult[]>([])

/**
 * Send the search request to the API and populate results.
 */
async function onSearch() {
  results.value = []
  error.value = ''
  loading.value = true

  const payload: SearchRequest = {
    query: query.value,
    limit: options.value.maxResults,
    scrapeOptions: options.value.extractContent ? { formats: ['extract'] } : undefined
  }

  try {
    const response = await api.search.search(payload)
    results.value = (response.data.data || []) as unknown as SearchResult[]
  } catch (err: any) {
    error.value = err?.message || 'Search request failed'
  } finally {
    loading.value = false
  }
}

</script>

<style scoped>
.search-view {
  max-width: 600px;
  margin: 0 auto;
  font-family: Arial, sans-serif;
}

.search-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.advanced-options {
  border: 1px solid #ccc;
  padding: 0.5rem;
  margin-top: 0.5rem;
}

.results {
  border-top: 1px solid #ccc;
  padding-top: 1rem;
}

.result-item {
  margin-bottom: 1rem;
}

.metadata {
  color: #666;
  font-size: 0.85rem;
}

.extract-button {
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.extracted-content {
  background-color: #f9f9f9;
  border-left: 3px solid #007acc;
  padding: 0.5rem;
  margin-top: 0.5rem;
}
</style>
