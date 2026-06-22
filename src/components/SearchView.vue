<template>
  <PlaygroundLayout
    title="Search"
    subtitle="Search the web with Firecrawl"
    :tabs="[
      { key: 'results', label: 'Results' },
      { key: 'json', label: 'JSON' },
    ]"
    :running="loading"
    :error="error || null"
    :has-result="hasResult"
    :status="statusLabel"
    :status-type="statusType"
    :duration="durationMs"
    empty-hint="Enter a query and run a search to see results here."
  >
    <!-- REQUEST pane: form + submit button -->
    <template #request>
      <form @submit.prevent="onSearch" class="search-form">
        <label for="query" class="field-label">Search Query</label>
        <input
          id="query"
          v-model="query"
          type="text"
          class="field-input"
          placeholder="Enter search terms"
          required
        />

        <fieldset class="advanced-options">
          <legend class="options-legend">Advanced Options</legend>

          <div class="field-row">
            <span class="field-label">Sources</span>
            <span class="source-flags">
              <label class="checkbox-label">
                <input type="checkbox" v-model="options.sources.web" />
                Web
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="options.sources.news" />
                News
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="options.sources.images" />
                Images
              </label>
            </span>
          </div>

          <label class="checkbox-label block">
            <input type="checkbox" v-model="options.includeMetadata" />
            Include metadata in results
          </label>
          <label class="checkbox-label block">
            <input type="checkbox" v-model="options.extractContent" />
            Enable content extraction
          </label>

          <label class="field-label" for="maxResults">Max results</label>
          <input
            id="maxResults"
            type="number"
            class="field-input field-input--short"
            v-model.number="options.maxResults"
            min="1"
            max="100"
          />

          <label class="field-label" for="location">Location</label>
          <input
            id="location"
            type="text"
            class="field-input"
            v-model="options.location"
            placeholder="Paris, France"
          />

          <label class="field-label" for="tbs">Time range (tbs)</label>
          <input
            id="tbs"
            type="text"
            class="field-input"
            v-model="options.tbs"
          />

          <label class="field-label" for="timeout">Timeout (ms)</label>
          <input
            id="timeout"
            type="number"
            class="field-input field-input--short"
            v-model.number="options.timeout"
            min="0"
          />
        </fieldset>

        <button type="submit" class="run-button" :disabled="loading">
          {{ loading ? 'Searching…' : 'Search' }}
        </button>
      </form>
    </template>

    <!-- RESPONSE pane: tab-switched results -->
    <template #response="{ activeTab }">
      <!-- Results tab: rendered result cards -->
      <div v-if="activeTab === 'results'" class="results-list">
        <ul>
          <li v-for="(result, index) in results" :key="index" class="result-item">
            <div class="result-header">
              <a :href="result.url" target="_blank" rel="noopener noreferrer" class="result-title">
                {{ result.title }}
              </a>
              <small class="result-kind">{{ result.sourceType }}</small>
            </div>
            <p v-if="result.description" class="result-description">{{ result.description }}</p>
            <p v-if="result.date" class="result-meta">{{ result.date }}</p>
            <img
              v-if="result.imageUrl"
              :src="result.imageUrl"
              :alt="result.title"
              class="result-image"
            />
            <div v-if="options.includeMetadata && result.metadata" class="result-meta">
              <small>{{ result.metadata.title }}</small>
            </div>
            <!-- Content extraction is available for download but not shown inline -->
          </li>
        </ul>

        <!-- Download section (only visible in Results tab) -->
        <div v-if="activeFormats.length || results.length" class="download-section">
          <p class="download-label">Download Results</p>
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
      </div>

      <!-- JSON tab: raw API response -->
      <CodeBlock v-else-if="activeTab === 'json'" :json="results" label="Search results" />
    </template>
  </PlaygroundLayout>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import type { FirecrawlSearchApi } from '@/services/firecrawl';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import axios from 'axios';
import PlaygroundLayout from './playground/PlaygroundLayout.vue';
import CodeBlock from './playground/CodeBlock.vue';

/**
 * Defines the structure for a single search result item.
 */
interface SearchResult {
  sourceType: 'web' | 'news' | 'images';
  title: string;
  url: string;
  description?: string;
  date?: string;
  imageUrl?: string;
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
  location: string;
  tbs: string;
  timeout?: number;
  sources: {
    web: boolean;
    news: boolean;
    images: boolean;
  };
}

/**
 * Injects the API client, specifically the search API.
 * Throws an error if the search API is not available.
 */
const api = inject('api') as { search?: FirecrawlSearchApi } | undefined;
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
  location: '',
  tbs: '',
  timeout: undefined,
  sources: {
    web: true,
    news: false,
    images: false,
  },
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
 * Elapsed milliseconds for the last completed request, used by the status bar.
 * Null until the first request completes.
 */
const durationMs = ref<number | null>(null);

/**
 * Computed property to determine the currently active download formats based on requested formats.
 */
const activeFormats = computed(() => requestedFormats.value);

/**
 * Whether the response pane has content to show.
 */
const hasResult = computed<boolean>(() => results.value.length > 0);

/**
 * Human-readable status label for the PlaygroundLayout status bar.
 * Shows result count on success, 'Failed' on error, null when idle.
 */
const statusLabel = computed<string | null>(() => {
  if (error.value) return 'Failed';
  if (hasResult.value) return `${results.value.length} result${results.value.length === 1 ? '' : 's'}`;
  return null;
});

/**
 * Semantic status type driving the status dot color in PlaygroundLayout.
 */
const statusType = computed<'success' | 'error' | 'idle'>(() => {
  if (error.value) return 'error';
  if (hasResult.value) return 'success';
  return 'idle';
});

/**
 * Execute the search with the current query and options.
 *
 * @returns Promise resolving when the request completes
 */
async function onSearch(): Promise<void> {
  results.value = [];
  error.value = '';
  loading.value = true;
  durationMs.value = null;
  const startTime = performance.now();

  const selectedSources = (
    Object.entries(options.value.sources) as Array<[keyof SearchOptions['sources'], boolean]>
  )
    .filter(([, enabled]) => enabled)
    .map(([source]) => source);

  const payload = {
    query: query.value,
    ...(selectedSources.length > 0 ? { sources: selectedSources } : {}),
    limit: options.value.maxResults,
    ...(options.value.tbs && { tbs: options.value.tbs }),
    ...(options.value.location && { location: options.value.location }),
    ...(options.value.timeout && { timeout: options.value.timeout }),
    ...(options.value.extractContent && {
      scrapeOptions: { formats: ['markdown'] },
    }),
  };

  try {
    const response = await api.search.search(payload);
    requestedFormats.value = payload.scrapeOptions?.formats ?? [];
    results.value = [
      ...(response.data.web || []).map((item) => normalizeResult({ ...item, sourceType: 'web' })),
      ...(response.data.news || []).map((item) =>
        normalizeResult({
          ...item,
          sourceType: 'news',
          title: String(item.title || item.url || 'Untitled result'),
          url: String(item.url || ''),
          description: typeof item.snippet === 'string' ? item.snippet : undefined,
          date: typeof item.date === 'string' ? item.date : undefined,
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
        } as SearchResult),
      ),
      ...(response.data.images || []).map((item) =>
        normalizeResult({
          ...item,
          sourceType: 'images',
          title: String(item.title || item.url || 'Untitled image'),
          url: String(item.url || ''),
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
        } as SearchResult),
      ),
    ];
  } catch (err: any) {
    error.value = err?.message || 'Search request failed';
  } finally {
    loading.value = false;
    durationMs.value = performance.now() - startTime;
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
    date: fixEncoding(item.date),
    imageUrl: fixEncoding(item.imageUrl),
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
    if (!decoded.includes('�')) {
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
    if (!decoded.includes('�')) {
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
/* Form layout inside the request pane */
.search-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-soft);
  display: block;
  margin-bottom: 0.15rem;
}

.field-input {
  width: 100%;
  padding: 0.45rem 0.65rem;
  font-size: 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-background);
  color: var(--color-text);
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}

.field-input:focus {
  outline: none;
  border-color: var(--ember-500);
}

.field-input--short {
  width: 6rem;
}

/* Advanced options fieldset */
.advanced-options {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.options-legend {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--color-text-mute);
  padding: 0 0.25rem;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.source-flags {
  display: inline-flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.88rem;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-label.block {
  display: flex;
}

/* Submit button — fire gradient, matches other playground views */
.run-button {
  margin-top: 0.4rem;
  padding: 0.55rem 1.2rem;
  font-size: 0.92rem;
  font-weight: 700;
  background: var(--gradient-fire);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
  align-self: flex-start;
}

.run-button:hover:not(:disabled) {
  background: var(--gradient-fire-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 26px -6px rgba(250, 77, 18, 0.6);
}

.run-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Results list in the response pane — scrolls inside pg-result */
.results-list {
  padding: 1rem;
}

.results-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-item {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.result-item:last-child {
  border-bottom: none;
}

.result-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Result links use the themed link color */
.result-title {
  font-weight: 600;
  color: var(--color-link);
  text-decoration: none;
}

.result-title:hover {
  text-decoration: underline;
}

/* Source-type badge */
.result-kind {
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: var(--color-text-mute);
}

.result-description {
  margin: 0.3rem 0 0;
  font-size: 0.88rem;
  color: var(--color-text-soft);
  line-height: 1.5;
}

/* Muted metadata text */
.result-meta {
  margin: 0.25rem 0 0;
  color: var(--color-text-mute);
  font-size: 0.82rem;
}

.result-image {
  display: block;
  max-width: 240px;
  margin-top: 0.75rem;
  border-radius: var(--radius-sm);
}

/* Download section */
.download-section {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.download-label {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-mute);
  margin-bottom: 0.6rem;
}

.download-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Download button — fire gradient primary */
.download-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.88rem;
  font-weight: 600;
  background: var(--gradient-fire);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.download-button:hover {
  background: var(--gradient-fire-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 26px -6px rgba(250, 77, 18, 0.6);
}
</style>
