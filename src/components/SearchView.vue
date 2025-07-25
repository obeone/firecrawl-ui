<template>
  <div class="page-container">
    <form @submit.prevent="onSearch" class="scrape-config-form">
      <label for="query">Search Query:</label>
      <input id="query" v-model="query" type="text" placeholder="Enter search terms" required />

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
          <input type="number" v-model.number="options.maxResults" min="1" max="100" />
        </label>
        <label>
          Language:
          <input type="text" v-model="options.lang" placeholder="en" />
        </label>
        <label>
          Country:
          <input type="text" v-model="options.country" placeholder="us" />
        </label>
        <label>
          Location:
          <input type="text" v-model="options.location" />
        </label>
        <label>
          Time range (tbs):
          <input type="text" v-model="options.tbs" />
        </label>
        <label>
          Timeout (ms):
          <input type="number" v-model.number="options.timeout" min="0" />
        </label>
      </fieldset>

      <button type="submit" class="primary-button">Search</button>
      <span v-if="loading" class="status">Loading...</span>
      <span v-if="error" class="status error">{{ error }}</span>
    </form>

    <section v-if="results.length" class="results">
      <h2>Search Results</h2>
      <ul>
        <li v-for="(result, index) in results" :key="index" class="result-item">
          <a :href="result.url" target="_blank" rel="noopener noreferrer">{{ result.title }}</a>
          <div v-if="options.includeMetadata && result.metadata" class="metadata">
            <small>{{ result.metadata.title }}</small>
          </div>
          <!-- Content extraction is available for download but not shown inline -->
        </li>
      </ul>
      <div class="download-section">
        <h3>Download Results</h3>
        <div class="download-buttons">
          <button
            v-for="fmt in activeFormats"
            :key="fmt"
            class="download-button"
            @click="handleDownload(fmt)"
          >
            Download {{ fmt }} Archive
          </button>
          <button class="download-button" @click="handleDownload('Full JSON')">
            Download Full JSON
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import type { SearchApi, SearchRequest } from '@/api-client/search.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';

/**
 * Defines the structure for a single search result item.
 */
interface SearchResult {
  title: string;
  url: string;
  description?: string;
  markdown?: string | null;
  html?: string | null;
  rawHtml?: string | null;
  links?: string[];
  screenshot?: string | null;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    statusCode?: number;
    error?: string | null;
  };
}

/**
 * Defines the structure for the search options.
 */
interface SearchOptions {
  includeMetadata: boolean;
  extractContent: boolean;
  maxResults: number;
  lang: string;
  country: string;
  location: string;
  tbs: string;
  timeout?: number;
}

/**
 * Injects the API client, specifically the search API.
 * Throws an error if the search API is not available.
 */
const api = inject('api') as { search?: SearchApi } | undefined;
if (!api?.search) {
  throw new Error('Search API is not available');
}

/**
 * Reactive reference for the search query input.
 */
const query = ref('');

/**
 * Reactive reference for the search options, initialized with default values.
 */
const options = ref<SearchOptions>({
  includeMetadata: true,
  extractContent: false,
  maxResults: 5,
  lang: 'en',
  country: 'us',
  location: '',
  tbs: '',
  timeout: undefined,
});

/**
 * Reactive flag indicating if a search request is in progress.
 */
const loading = ref(false);
/**
 * Reactive string to store any error messages from the search.
 */
const error = ref('');
/**
 * Reactive array to store the search results.
 */
const results = ref<SearchResult[]>([]);
/**
 * Reactive array to store the formats requested for content extraction.
 */
const requestedFormats = ref<string[]>([]);

/**
 * Computed property to determine the currently active download formats based on requested formats.
 */
const activeFormats = computed(() => requestedFormats.value);

/**
 * Execute the search with the current query and options.
 *
 * @returns Promise resolving when the request completes
 */
async function onSearch(): Promise<void> {
  results.value = [];
  error.value = '';
  loading.value = true;

  const payload: SearchRequest = {
    query: query.value,
    limit: options.value.maxResults,
    ...(options.value.tbs && { tbs: options.value.tbs }),
    ...(options.value.lang && { lang: options.value.lang }),
    ...(options.value.country && { country: options.value.country }),
    ...(options.value.location && { location: options.value.location }),
    ...(options.value.timeout && { timeout: options.value.timeout }),
    ...(options.value.extractContent && {
      scrapeOptions: { formats: ['markdown'] },
    }),
  };

  try {
    const response = await api.search.search(payload);
    requestedFormats.value = payload.scrapeOptions?.formats ?? [];
    results.value = (response.data.data || []).map(normalizeResult);
  } catch (err: any) {
    error.value = err?.message || 'Search request failed';
  } finally {
    loading.value = false;
  }
}

/**
 * Normalizes a search result item by fixing potential encoding issues in its string properties.
 * This ensures that displayed content is correctly rendered.
 *
 * @param item - The raw search result object received from the API.
 * @returns A new SearchResult object with string properties normalized.
 */
function normalizeResult(item: SearchResult): SearchResult {
  return {
    ...item,
    title: fixEncoding(item.title),
    description: fixEncoding(item.description),
    markdown: fixEncoding(item.markdown),
    html: fixEncoding(item.html),
    rawHtml: fixEncoding(item.rawHtml),
    metadata: item.metadata
      ? {
          ...item.metadata,
          title: fixEncoding(item.metadata.title),
          description: fixEncoding(item.metadata.description),
        }
      : undefined,
  };
}

/**
 * Attempts to fix potential character encoding issues in a given string,
 * specifically trying to convert from Latin-1 to UTF-8 if misencoded.
 * It handles null or undefined input gracefully.
 *
 * @param value - The string that might have encoding issues. Can be null or undefined.
 * @returns The decoded string if successful, or the original value if decoding fails or is not needed.
 *          Returns `undefined` if the input `value` is `null` or `undefined`.
 */
function fixEncoding(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  try {
    // Attempt to decode assuming it was originally UTF-8 but escaped as Latin-1
    const decoded = decodeURIComponent(escape(value));
    // Check for replacement character (U+FFFD) which indicates decoding failure
    if (!decoded.includes('\ufffd')) {
      return decoded;
    }
  } catch (e) {
    // Log or handle decoding errors if necessary, but for now, ignore and try next method
    console.warn('First decoding attempt failed:', e);
  }
  try {
    // Attempt to decode as UTF-8 from a byte array representation
    const bytes = Uint8Array.from([...value].map((c) => c.charCodeAt(0)));
    const decoded = new TextDecoder('utf-8').decode(bytes);
    if (!decoded.includes('\ufffd')) {
      return decoded;
    }
  } catch (e) {
    // Log or handle decoding errors if necessary, but for now, ignore
    console.warn('Second decoding attempt failed:', e);
  }
  // If all decoding attempts fail, return the original value
  return value;
}

/**
 * Sanitizes a URL to create a valid and readable filename.
 * It removes protocol prefixes, query parameters, hash fragments,
 * and replaces non-alphanumeric characters with underscores.
 *
 * @param url - The URL string to be sanitized.
 * @returns A sanitized string suitable for use as a filename. Returns 'result' if the sanitized name is empty.
 */
function sanitizeFilename(url: string): string {
  let name = url.replace(/^https?:\/\//, ''); // Remove http(s)://
  name = name.replace(/[?#].*$/, ''); // Remove query params and hash
  name = name.replace(/[^a-zA-Z0-9]+/g, '_'); // Replace non-alphanumeric with underscore
  return name || 'result'; // Ensure a non-empty filename
}

/**
 * Handles the download of search results in various formats (e.g., markdown, HTML, screenshots)
 * or as a full JSON export. Results are zipped if multiple files are generated.
 *
 * @param type - The desired format for download (e.g., 'markdown', 'html', 'screenshot', 'Full JSON').
 * @returns A Promise that resolves when the download process is complete.
 */
async function handleDownload(type: string): Promise<void> {
  if (!results.value.length) {
    // If no results are available, do nothing.
    return;
  }

  if (type === 'Full JSON') {
    // Handle full JSON download separately as it's a single file.
    const blob = new Blob([JSON.stringify(results.value, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, 'search-results.json');
    return;
  }

  const zip = new JSZip();
  const fetches: Promise<void>[] = []; // Array to hold promises for async operations like screenshot fetches.

  results.value.forEach((page, index) => {
    const base = sanitizeFilename(page.url || index.toString()); // Create a base filename from the URL or index.
    const prefix = (index + 1).toString().padStart(3, '0'); // Add a numerical prefix for ordering.

    // Add files to the zip archive based on the requested type.
    switch (type) {
      case 'markdown':
        if (page.markdown) {
          zip.file(`${prefix}-${base}.md`, page.markdown);
        }
        break;
      case 'html':
        if (page.html) {
          zip.file(`${prefix}-${base}.html`, page.html);
        }
        break;
      case 'rawHtml':
        if (page.rawHtml) {
          zip.file(`${prefix}-${base}.raw.html`, page.rawHtml);
        }
        break;
      case 'links':
        if (page.links && page.links.length) {
          zip.file(`${prefix}-${base}.txt`, page.links.join('\n'));
        }
        break;
      case 'screenshot':
      case 'screenshot@fullPage': // Both screenshot types are handled similarly for download.
        if (page.screenshot) {
          // Fetch screenshot as a blob and add to zip.
          const p = axios.get(page.screenshot, { responseType: 'blob' }).then((res) => {
            zip.file(`${prefix}-${base}.png`, res.data);
          });
          fetches.push(p); // Add the promise to the fetches array.
        }
        break;
      default:
        // Do nothing for unsupported types.
        break;
    }
  });

  // Wait for all asynchronous fetches (e.g., screenshots) to complete.
  await Promise.all(fetches);
  // Generate the zip file and trigger download.
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `search-${type}-archive.zip`);
}
</script>

<!-- Scoped styles for the SearchView component -->
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

.result-item a {
  color: #4fc08d;
  text-decoration: none;
}

.result-item a:hover {
  text-decoration: underline;
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

.status {
  margin-left: 0.5rem;
  font-size: 0.9rem;
}

.status.error {
  color: #a94442;
}

.download-section {
  margin-top: 20px;
}

.download-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.download-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  margin-top: 0;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.download-button:hover {
  background-color: #0056b3;
}
</style>
