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
          <a :href="result.link" target="_blank" rel="noopener noreferrer">{{ result.title }}</a>
          <div v-if="options.includeMetadata" class="metadata">
            <small>{{ result.metadata }}</small>
          </div>
          <button
            v-if="options.extractContent"
            @click="extractContent(result)"
            class="extract-button"
          >
            Extract Content
          </button>
          <div v-if="result.showContent && result.extractedContent" class="extracted-content">
            <h3>Extracted Content</h3>
            <p>{{ result.extractedContent }}</p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

function getBaseUrl() {
  return (
    localStorage.getItem('firecrawl_base_url') ||
    import.meta.env.VITE_FIRECRAWL_API_BASE_URL ||
    'https://api.firecrawl.dev/v1'
  )
}

function getApiKey() {
  return (
    localStorage.getItem('firecrawl_api_key') ||
    import.meta.env.VITE_FIRECRAWL_API_KEY ||
    ''
  )
}

interface SearchResult {
  title: string
  link: string
  metadata?: string
  extractedContent?: string
  showContent?: boolean
}

const query = ref('')
const options = ref({
  includeMetadata: true,
  extractContent: false,
  maxResults: 10,
})

const results = ref<SearchResult[]>([])

/**
 * Simulate a search operation.
 * In a real app, this would call an API.
 */
async function onSearch() {
  // Clear previous results
  results.value = []

  const payload: any = {
    query: query.value,
    searchOptions: {
      limit: options.value.maxResults,
    },
    // Some deployments expect snake_case option names
    search_options: {
      limit: options.value.maxResults,
    },
  }

  if (options.value.extractContent) {
    payload.scrapeOptions = { formats: ['markdown'] }
    payload.scrape_options = { formats: ['markdown'] }
  }

  try {
    const response = await axios.post(`${getBaseUrl()}/search`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(getApiKey() && { Authorization: `Bearer ${getApiKey()}` }),
      },
    })

    if (response.data && response.data.success) {
      results.value = response.data.data.map((item: any) => ({
        title: item.title,
        link: item.url,
        metadata: item.description,
        extractedContent: item.markdown,
      }))
    } else {
      console.error('Search failed:', response.data)
    }
  } catch (e) {
    console.error('Search API error:', e)
  }
}

/**
 * Simulate content extraction from a result.
 * @param result The search result to extract content from.
 */
function extractContent(result: SearchResult) {
  result.showContent = !result.showContent
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
