<template>
  <div class="page-container map-view">
    <h2>Website Map (API v2)</h2>
    <form @submit.prevent="handleSubmit" class="map-form">
      <div class="form-group">
        <label for="baseUrl">URL</label>
        <input
          id="baseUrl"
          v-model="baseUrl"
          type="url"
          placeholder="https://example.com"
          required
        />
      </div>
      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Loading…' : 'Fetch sitemap' }}
      </button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="results.length" class="results">
      <h3>Discovered URLs</h3>
      <ul>
        <li v-for="(item, index) in results" :key="index">{{ item }}</li>
      </ul>
      <button class="secondary-button" type="button" @click="downloadResults">Download JSON</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from 'vue';
import type { AxiosResponse } from 'axios';
import type { FirecrawlApiClients } from '@/plugins/api';
import type { MapRequestV2, MapResponseV2 } from '@/types/api.js';

const api = inject('api') as FirecrawlApiClients | undefined;
if (!api?.mapping) {
  throw new Error('Mapping API client is not available.');
}

const baseUrl = ref('');
const loading = ref(false);
const error = ref('');
const results = ref<MapResponseV2>([]);

/**
 * Persist the fetched sitemap as a JSON file.
 */
function downloadResults(): void {
  const blob = new Blob([JSON.stringify(results.value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'sitemap.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Submit the sitemap request to the API.
 */
async function handleSubmit(): Promise<void> {
  error.value = '';
  results.value = [];

  const payload: MapRequestV2 = {
    url: baseUrl.value,
  };

  try {
    loading.value = true;
    const response = (await api.mapping.mapUrls(payload)) as AxiosResponse<MapResponseV2>;
    results.value = response.data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to retrieve sitemap.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.map-view {
  max-width: 520px;
  margin: 1rem auto;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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
}

.error {
  color: #b91c1c;
}

.results ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.results li {
  padding: 0.25rem 0;
  border-bottom: 1px solid #e5e7eb;
}
</style>
