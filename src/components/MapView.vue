<template>
  <div class="page-container map-view">
    <h2>MapView Component</h2>
    <form @submit.prevent="handleSubmit" class="map-form">
      <div class="form-group">
        <label for="baseUrl">Base URL:</label>
        <input id="baseUrl" v-model="baseUrl" type="url" placeholder="Enter base URL" required />
      </div>

      <div class="form-group">
        <label for="search">Search Query:</label>
        <input id="search" v-model="search" type="text" placeholder="Optional search terms" />
      </div>

      <div class="form-group checkbox">
        <label> <input type="checkbox" v-model="ignoreSitemap" /> Ignore Sitemap </label>
      </div>

      <div class="form-group checkbox">
        <label> <input type="checkbox" v-model="sitemapOnly" /> Sitemap Only </label>
      </div>

      <div class="form-group checkbox">
        <label> <input type="checkbox" v-model="includeSubdomains" /> Include Subdomains </label>
      </div>

      <div class="form-group">
        <label for="limit">Limit:</label>
        <input id="limit" v-model.number="limit" type="number" min="1" max="30000" />
      </div>

      <div class="form-group">
        <label for="timeout">Timeout (ms):</label>
        <input id="timeout" v-model.number="timeout" type="number" min="0" />
      </div>

      <button type="submit" class="primary-button">Find URLs</button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="status">Loading...</div>

    <div v-if="urls.length" class="results">
      <h3>Found URLs</h3>
      <ul>
        <li v-for="(url, index) in urls" :key="index">{{ url }}</li>
      </ul>
      <button class="primary-button" @click="downloadJson">Download JSON</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import type { MappingApi, MapUrlsRequest } from '@/api-client';

/**
 * MapView lets users map URLs starting from a base URL.
 * The component exposes common mapping options such as search
 * query, sitemap handling and link limits.
 */

/**
 * Access the Mapping API instance provided by the api plugin.
 */
const api = inject('api') as { mapping?: MappingApi } | undefined;
if (!api?.mapping) {
  throw new Error('Mapping API is not available');
}

/** Base URL entered by the user. */
const baseUrl = ref('');
/** Search query used when mapping URLs. */
const search = ref('');
/** Ignore the website sitemap when crawling. */
const ignoreSitemap = ref(true);
/** Only return links found in the website sitemap. */
const sitemapOnly = ref(false);
/** Include subdomains of the website. */
const includeSubdomains = ref(false);
/** Maximum number of links to return. */
const limit = ref(5000);
/** Request timeout in milliseconds. */
const timeout = ref<number | null>(null);
/** List of URLs returned by the API. */
const urls = ref<string[]>([]);
/** Indicates whether the API request is in progress. */
const loading = ref(false);
/** Holds any error message from the API call. */
const error = ref('');

/**
 * Handle form submission and fetch mapped URLs from the API.
 */
async function handleSubmit(): Promise<void> {
  const payload: MapUrlsRequest = {
    url: baseUrl.value,
    search: search.value || undefined,
    ignoreSitemap: ignoreSitemap.value,
    sitemapOnly: sitemapOnly.value,
    includeSubdomains: includeSubdomains.value,
    limit: limit.value || undefined,
    timeout: timeout.value ?? undefined,
  };

  loading.value = true;
  error.value = '';
  try {
    const response = await api.mapping.mapUrls(payload);
    urls.value = response.data.links ?? [];
  } catch (err: any) {
    error.value = err?.message || 'Failed to map URLs';
    urls.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * Download the found URLs as a JSON file
 */
function downloadJson(): void {
  const blob = new Blob([JSON.stringify(urls.value, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'urls.json';
  link.click();
  URL.revokeObjectURL(link.href);
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

.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.error {
  color: #d9534f;
  margin-top: 0.5rem;
}

.status {
  margin-top: 0.5rem;
}
</style>
