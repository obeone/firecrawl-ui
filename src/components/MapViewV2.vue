<template>
  <div class="page-container map-view">
    <h2>Sitemap Lookup (API v2)</h2>
    <form @submit.prevent="handleSubmit" class="map-form">
      <div class="form-group">
        <label for="baseUrl">Base URL:</label>
        <input id="baseUrl" v-model="baseUrl" type="url" placeholder="Enter base URL" required />
      </div>
      <button type="submit" class="primary-button">Fetch sitemap</button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="status">Loading...</div>

    <div v-if="urls.length" class="results">
      <h3>Found URLs</h3>
      <ul>
        <li v-for="(url, index) in urls" :key="index">{{ url }}</li>
      </ul>
      <button class="secondary-button" @click="downloadJson">Download JSON</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import type { FirecrawlApiClients } from '@/plugins/api';
import type { MappingApiV2, MapRequestV2 } from '@/api-client-v2/index.js';

const clients = inject('api') as FirecrawlApiClients | undefined;
if (!clients || clients.version !== 'v2') {
  throw new Error('Mapping API v2 is not available.');
}
const mappingApi = clients.mapping as MappingApiV2;

const baseUrl = ref('');
const urls = ref<string[]>([]);
const loading = ref(false);
const error = ref('');

/**
 * Submit the sitemap request to the v2 endpoint.
 */
const handleSubmit = async (): Promise<void> => {
  const payload: MapRequestV2 = { url: baseUrl.value };

  loading.value = true;
  error.value = '';
  urls.value = [];
  try {
    const response = await mappingApi.getSitemap(payload);
    urls.value = response.data ?? [];
  } catch (err: any) {
    error.value = err?.message || 'Failed to fetch sitemap.';
  } finally {
    loading.value = false;
  }
};

/**
 * Download the sitemap data as a JSON file.
 */
const downloadJson = (): void => {
  if (!urls.value.length) {
    return;
  }
  const blob = new Blob([JSON.stringify(urls.value, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sitemap.json';
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
.map-view {
  max-width: 600px;
  margin: 1rem auto;
  padding: 1rem;
}

.map-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

input {
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

.error {
  color: #cc0000;
  margin-top: 1rem;
}

.results {
  margin-top: 1rem;
}
</style>
