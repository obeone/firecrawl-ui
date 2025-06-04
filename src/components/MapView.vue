<template>
  <div class="map-view">
    <h2>Map Website URLs</h2>
    <router-link to="/map/history">View History</router-link>
    <form @submit.prevent="handleSubmit" class="map-form">
      <div class="form-group">
        <label for="baseUrl">Base URL:</label>
        <input id="baseUrl" v-model="form.url" type="url" required placeholder="https://example.com" />
      </div>

      <div class="form-group">
        <label for="query">Search Query (optional):</label>
        <input id="query" v-model="form.search" type="text" placeholder="keywords" />
      </div>

      <div class="grid-layout">
        <label><input type="checkbox" v-model="form.ignoreSitemap" /> Ignore Sitemap</label>
        <label><input type="checkbox" v-model="form.sitemapOnly" /> Sitemap Only</label>
        <label><input type="checkbox" v-model="form.includeSubdomains" /> Include Subdomains</label>
      </div>

      <div class="form-group">
        <label for="limit">Limit:</label>
        <input id="limit" v-model.number="form.limit" type="number" min="1" />
      </div>

      <div class="form-group">
        <label for="timeout">Timeout (ms):</label>
        <input id="timeout" v-model.number="form.timeout" type="number" min="0" />
      </div>

      <button type="submit">Map</button>
    </form>

    <div v-if="loading" class="status loading">
      <div class="spinner"></div>
      <span>Processing...</span>
    </div>

    <div v-if="error" class="status error">{{ error }}</div>

    <div v-if="urls.length" class="results">
      <h3>Found URLs</h3>
      <ul>
        <li v-for="(url, index) in urls" :key="index">{{ url }}</li>
      </ul>
      <button @click="downloadJson">Download JSON</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import type { MappingApi } from '../api-client'
import { useHistory } from '../composables/useHistory'

/**
 * MapView component logic
 * Uses MappingApi.mapUrls to retrieve URLs from a website
 */
const api = inject('api') as { mapping: MappingApi }
const { add } = useHistory('map')
const form = ref({
  url: '',
  search: '',
  ignoreSitemap: false,
  sitemapOnly: false,
  includeSubdomains: false,
  limit: undefined as number | undefined,
  timeout: undefined as number | undefined
})
const loading = ref(false)
const error = ref('')
const urls = ref<string[]>([])

/**
 * Handle form submission using the API
 */
async function handleSubmit() {
  try {
    loading.value = true
    error.value = ''
    urls.value = []
    const payload: any = {
      url: form.value.url,
      ...(form.value.search && { search: form.value.search }),
      ...(form.value.ignoreSitemap && { ignoreSitemap: true }),
      ...(form.value.sitemapOnly && { sitemapOnly: true }),
      ...(form.value.includeSubdomains && { includeSubdomains: true }),
      ...(form.value.limit && { limit: form.value.limit }),
      ...(form.value.timeout && { pageOptions: { timeout: form.value.timeout } })
    }
    const response = await api.mapping.mapUrls(payload)
    urls.value = response.data.data || []
    add({ id: Date.now().toString(), type: 'map', status: 'completed', createdAt: Date.now(), result: response.data })
  } catch (e: any) {
    error.value = e.message || 'Error'
  } finally {
    loading.value = false
  }
}

/**
 * Download the found URLs as a JSON file
 */
function downloadJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(urls.value, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'urls.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
</script>

<style scoped>
.map-view {
  max-width: 600px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}

.map-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

input[type='url'],
textarea {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #aaa;
  border-radius: 4px;
}

button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #005fa3;
}

.results {
  margin-top: 1.5rem;
}

.results ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
</style>
