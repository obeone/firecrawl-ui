<template>
  <div class="page-container map-view">
    <h2>Sitemap (API v2)</h2>
    <form @submit.prevent="handleSubmit" class="map-form">
      <div class="form-group">
        <label for="mapUrl">Base URL:</label>
        <input id="mapUrl" v-model="url" type="url" placeholder="https://example.com" required />
      </div>
      <button type="submit" class="primary-button" :disabled="loading">Fetch Sitemap</button>
    </form>

    <div v-if="error" class="status error">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
    </div>

    <div v-if="loading" class="status loading">
      <div class="spinner"></div>
      <span>Loading sitemap…</span>
    </div>

    <div v-if="links.length" class="results">
      <div class="result-header">
        <h3>Found URLs</h3>
        <button class="secondary-button" @click="downloadJson">Download JSON</button>
      </div>
      <ul>
        <li v-for="(link, index) in links" :key="index">{{ link }}</li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { postV2 } from '@/api/v2Client';

export default defineComponent({
  name: 'MapViewV2',
  setup() {
    const url = ref('');
    const loading = ref(false);
    const error = ref('');
    const links = ref<string[]>([]);

    /**
     * Sends the sitemap request to the API and stores the resulting links.
     *
     * @returns {Promise<void>} Resolves once the request completes.
     */
    const handleSubmit = async (): Promise<void> => {
      loading.value = true;
      error.value = '';
      links.value = [];
      try {
        const response = await postV2<string[]>('map', { url: url.value });
        links.value = response.data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch sitemap.';
      } finally {
        loading.value = false;
      }
    };

    /**
     * Downloads the discovered URLs as a JSON file.
     */
    const downloadJson = (): void => {
      const blob = new Blob([JSON.stringify(links.value, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'sitemap-v2.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    return {
      url,
      loading,
      error,
      links,
      handleSubmit,
      downloadJson,
    };
  },
});
</script>

<style scoped>
@import '@/assets/main.css';

.map-view {
  max-width: 600px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.map-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.results {
  margin-top: 1.5rem;
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
</style>
