<template>
  <div class="search-view">
    <router-link to="/search/history">View History</router-link>
    <form @submit.prevent="onSearch" class="search-form">
      <label for="query">Search Query:</label>
      <input
        id="query"
        v-model="form.query"
        type="text"
        placeholder="Enter search terms"
        required
      />

      <fieldset class="advanced-options">
        <legend>Options</legend>
        <label>
          Limit:
          <input type="number" v-model.number="form.searchOptions.limit" min="1" max="50" />
        </label>
        <label>
          Language:
          <input type="text" v-model="form.searchOptions.language" placeholder="en" />
        </label>
        <label>
          Country:
          <input type="text" v-model="form.searchOptions.country" placeholder="US" />
        </label>
      </fieldset>

      <fieldset class="advanced-options">
        <legend>Scrape Formats</legend>
        <select v-model="form.scrapeOptions.formats" multiple>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="rawHtml">Raw HTML</option>
          <option value="links">Links</option>
          <option value="json">JSON</option>
        </select>
      </fieldset>

      <button type="submit">Search</button>
    </form>

    <div v-if="loading" class="status loading">
      <div class="spinner"></div>
      <span>Searching...</span>
    </div>

    <div v-if="error" class="status error">{{ error }}</div>

    <section v-if="results.length" class="results">
      <h2>Search Results</h2>
      <ul>
        <li v-for="(r, idx) in results" :key="idx" class="result-item">
          <a :href="r.url" target="_blank" rel="noopener noreferrer">{{ r.title }}</a>
          <p>{{ r.description }}</p>
        </li>
      </ul>
      <button @click="downloadJson">Download JSON</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import apiConfig from '../config/api'
import { useHistory } from '../composables/useHistory'

interface SearchOptions {
  limit?: number
  language?: string
  country?: string
}

interface SearchResult {
  url: string
  title: string
  description: string
}

const { add } = useHistory('search')

const form = ref({
  query: '',
  searchOptions: {
    limit: 10,
    language: '',
    country: ''
  } as SearchOptions,
  scrapeOptions: { formats: [] as string[] }
})

const results = ref<SearchResult[]>([])
const loading = ref(false)
const error = ref('')

async function onSearch() {
  try {
    loading.value = true
    error.value = ''
    results.value = []
    const payload: any = {
      query: form.value.query,
      searchOptions: { ...form.value.searchOptions },
      ...(form.value.scrapeOptions.formats.length && { scrapeOptions: { formats: form.value.scrapeOptions.formats } })
    }
    const { data } = await axios.post(`${apiConfig.basePath}/search`, payload, apiConfig.baseOptions)
    results.value = data.data || []
    add({ id: Date.now().toString(), type: 'search', status: 'completed', createdAt: Date.now(), result: data })
  } catch (e: any) {
    error.value = e.message || 'Error'
  } finally {
    loading.value = false
  }
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(results.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'search-results.json'
  a.click()
  URL.revokeObjectURL(url)
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
