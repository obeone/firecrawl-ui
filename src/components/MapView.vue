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

      <button type="submit" class="primary-button" :disabled="loading">Find URLs</button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>
    <LoadingSpinner v-if="loading" class="status" />
    <Toast
      v-if="toastMessage"
      :message="toastMessage"
      :type="toastType"
      @dismiss="toastMessage = ''"
    />

    <div v-if="urls.length" class="results">
      <h3>Found URLs</h3>
      <ul>
        <li v-for="(url, index) in urls" :key="index">{{ url }}</li>
      </ul>
      <button class="download-button" @click="downloadJson">Download JSON</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';
import Toast from './Toast.vue';
import type { MappingApi, MapUrlsRequest } from '@/api-client';

/**
 * MapView Component
 *
 * This component allows users to map URLs starting from a specified base URL.
 * It provides various options for mapping, including search queries, sitemap handling,
 * and limits on the number of links to retrieve.
 */

/**
 * Injects the API instance provided by the API plugin.
 * This instance is expected to contain a `mapping` property for URL mapping operations.
 * @type {{ mapping?: MappingApi } | undefined}
 */
const api = inject('api') as { mapping?: MappingApi } | undefined;
if (!api?.mapping) {
  throw new Error(
    'Mapping API is not available. Ensure the API plugin is correctly configured and provides the mapping service.',
  );
}

/**
 * Reactive variable for the base URL entered by the user.
 * @type {Ref<string>}
 */
const baseUrl = ref('');

/**
 * Reactive variable for the optional search query used when mapping URLs.
 * @type {Ref<string>}
 */
const search = ref('');

/**
 * Reactive variable to control whether the website sitemap should be ignored during crawling.
 * Defaults to `true`.
 * @type {Ref<boolean>}
 */
const ignoreSitemap = ref(true);

/**
 * Reactive variable to control whether only links found in the website sitemap should be returned.
 * Defaults to `false`.
 * @type {Ref<boolean>}
 */
const sitemapOnly = ref(false);

/**
 * Reactive variable to control whether subdomains of the website should be included in the mapping.
 * Defaults to `false`.
 * @type {Ref<boolean>}
 */
const includeSubdomains = ref(false);

/**
 * Reactive variable for the maximum number of links to return.
 * Defaults to `5000`.
 * @type {Ref<number>}
 */
const limit = ref(5000);

/**
 * Reactive variable for the request timeout in milliseconds.
 * Can be `null` if no timeout is specified.
 * @type {Ref<number | null>}
 */
const timeout = ref<number | null>(null);

/**
 * Reactive variable to store the list of URLs returned by the API.
 * @type {Ref<string[]>}
 */
const urls = ref<string[]>([]);

/**
 * Reactive variable indicating whether an API request is currently in progress.
 * @type {Ref<boolean>}
 */
const loading = ref(false);

/**
 * Reactive variable to hold any error message received from the API call.
 * @type {Ref<string>}
 */
const error = ref('');
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

/**
 * Display a toast notification.
 *
 * @param message - Message to display.
 * @param type - Type of notification.
 * @returns void
 */
function showToast(message: string, type: 'success' | 'error'): void {
  toastMessage.value = message;
  toastType.value = type;
}

/**
 * Handles the form submission event.
 * Constructs the payload for the `mapUrls` API request based on user input,
 * then calls the API to fetch mapped URLs. Manages loading and error states.
 * @returns {Promise<void>} A promise that resolves when the API call is complete.
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
    showToast('URLs retrieved successfully', 'success');
  } catch (err: any) {
    // Cast err to any to access message property safely
    error.value = err?.message || 'Failed to map URLs. Please check the URL and try again.';
    showToast(error.value, 'error');
    urls.value = [];
  } finally {
    loading.value = false;
  }
}

/**
 * Initiates the download of the found URLs as a JSON file.
 * Creates a Blob from the `urls` array and triggers a download via a temporary anchor element.
 * The temporary link element is appended to the document body and then removed after the click
 * to ensure compatibility across different browsers and to clean up the DOM.
 * The Object URL is also revoked to free up resources.
 * @returns {void}
 */
function downloadJson(): void {
  const blob = new Blob([JSON.stringify(urls.value, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'urls.json';
  document.body.appendChild(link); // Append to body to ensure it's clickable in all browsers
  link.click();
  document.body.removeChild(link); // Clean up the temporary element
  URL.revokeObjectURL(link.href); // Release the object URL
}
</script>

<style scoped>
/* Styles for the main container of the MapView component */
.map-view {
  max-width: 600px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}

/* Styles for the form that contains mapping options */
.map-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Styles for individual form groups (label + input) */
.form-group {
  display: flex;
  flex-direction: column;
}

/* Styles for form labels */
label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

/* Styles for URL input and textarea elements */
input[type='url'],
textarea {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #aaa;
  border-radius: 4px;
}

/* Styles for all buttons within the component */
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

/* Hover state for buttons */
button:hover {
  background-color: #005fa3;
}

/* Styles for the results section */
.results {
  margin-top: 1.5rem;
}

/* Styles for the unordered list within the results section */
.results ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

/* Specific styles for checkbox form groups to align items horizontally */
.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

/* Styles for displaying error messages */
.error {
  color: #d9534f; /* A shade of red for errors */
  margin-top: 0.5rem;
}

/* Styles for displaying status messages (e.g., loading) */
.status {
  margin-top: 0.5rem;
}

/* Styles for the download JSON button */
.download-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  margin-top: 0;
  background-color: #007bff; /* A shade of blue */
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* Hover state for the download button */
.download-button:hover {
  background-color: #0056b3; /* Darker shade of blue on hover */
}
</style>
