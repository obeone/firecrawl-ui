<template>
  <div class="page-container">
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
          <a :href="result.url" target="_blank" rel="noopener noreferrer">{{
            result.title
          }}</a>
          <div
            v-if="options.includeMetadata && result.metadata"
            class="metadata"
          >
            <small>{{ result.metadata.title }}</small>
          </div>
          <!-- Content extraction is available for download but not shown inline -->
        </li>
      </ul>
      <div class="download-section">
        <h3>Download Results</h3>
        <div v-for="fmt in activeFormats" :key="fmt" class="download-btn">
          <button class="primary-button" @click="handleDownload(fmt)">
            Download {{ fmt }} Archive
          </button>
        </div>
        <button class="primary-button" @click="handleDownload('Full JSON')">
          Download Full JSON
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from "vue";
import type { SearchApi, SearchRequest } from "@/api-client/search.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import axios from "axios";

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

const api = inject("api") as { search?: SearchApi } | undefined;
if (!api?.search) {
  throw new Error("Search API is not available");
}

const query = ref("");
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

const options = ref<SearchOptions>({
  includeMetadata: true,
  extractContent: false,
  maxResults: 5,
  lang: "en",
  country: "us",
  location: "",
  tbs: "",
  timeout: undefined,
});

const loading = ref(false);
const error = ref("");
const results = ref<SearchResult[]>([]);
const requestedFormats = ref<string[]>([]);

const activeFormats = computed(() => requestedFormats.value);

/**
 * Execute the search with the current query and options.
 *
 * @returns Promise resolving when the request completes
 */
async function onSearch(): Promise<void> {
  results.value = [];
  error.value = "";
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
      scrapeOptions: { formats: ["markdown"] },
    }),
  };

  try {
    const response = await api.search.search(payload);
    requestedFormats.value = payload.scrapeOptions?.formats ?? [];
    results.value = (response.data.data || []).map(normalizeResult);
  } catch (err: any) {
    error.value = err?.message || "Search request failed";
  } finally {
    loading.value = false;
  }
}

/**
 * Normalize potential encoding issues in a search result.
 *
 * @param item - Raw search result from the API
 * @returns Normalized search result
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
 * Attempt to convert strings from Latin-1 to UTF-8 when needed.
 *
 * @param value - String that might be misencoded
 * @returns Decoded string or the original value
 */
function fixEncoding(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  try {
    const decoded = decodeURIComponent(escape(value));
    if (!decoded.includes("\ufffd")) {
      return decoded;
    }
  } catch {
    // Ignore decoding errors
  }
  try {
    const bytes = Uint8Array.from([...value].map((c) => c.charCodeAt(0)));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (!decoded.includes("\ufffd")) {
      return decoded;
    }
  } catch {
    // Ignore decoding errors
  }
  return value;
}

/**
 * Replace characters that cannot be used in filenames.
 *
 * @param url - URL associated with the result
 * @returns Sanitized filename string
 */
function sanitizeFilename(url: string): string {
  let name = url.replace(/^https?:\/\//, "");
  name = name.replace(/[?#].*$/, "");
  name = name.replace(/[^a-zA-Z0-9]+/g, "_");
  return name || "result";
}

/**
 * Download search results in the requested format or as full JSON.
 *
 * @param type - Format name or 'Full JSON'
 */
async function handleDownload(type: string): Promise<void> {
  if (!results.value.length) {
    return;
  }

  if (type === "Full JSON") {
    const blob = new Blob([JSON.stringify(results.value, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, "search-results.json");
    return;
  }

  const zip = new JSZip();
  const fetches: Promise<void>[] = [];

  results.value.forEach((page, index) => {
    const base = sanitizeFilename(page.url || index.toString());
    const prefix = (index + 1).toString().padStart(3, "0");
    switch (type) {
      case "markdown":
        if (page.markdown) {
          zip.file(`${prefix}-${base}.md`, page.markdown);
        }
        break;
      case "html":
        if (page.html) {
          zip.file(`${prefix}-${base}.html`, page.html);
        }
        break;
      case "rawHtml":
        if (page.rawHtml) {
          zip.file(`${prefix}-${base}.raw.html`, page.rawHtml);
        }
        break;
      case "links":
        if (page.links && page.links.length) {
          zip.file(`${prefix}-${base}.txt`, page.links.join("\n"));
        }
        break;
      case "screenshot":
      case "screenshot@fullPage":
        if (page.screenshot) {
          const p = axios
            .get(page.screenshot, { responseType: "blob" })
            .then((res) => {
              zip.file(`${prefix}-${base}.png`, res.data);
            });
          fetches.push(p);
        }
        break;
      default:
        break;
    }
  });

  await Promise.all(fetches);
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `search-${type}-archive.zip`);
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
</style>
