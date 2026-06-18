<template>
  <div class="page-container batch-scrape-view">
    <h2>Batch Scrape</h2>
    <p class="intro">Scrape multiple URLs in a single job and track progress.</p>

    <form class="batch-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="urls">URLs (one per line):</label>
        <textarea
          id="urls"
          v-model="urlsInput"
          rows="6"
          placeholder="https://example.com&#10;https://example.org/page"
          required
        ></textarea>
        <small>Each non-empty line is treated as a URL to scrape.</small>
      </div>

      <div class="form-group">
        <label for="formats">Output Formats:</label>
        <select id="formats" v-model="selectedFormats" multiple>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="rawHtml">Raw HTML</option>
          <option value="links">Links</option>
          <option value="summary">Summary</option>
          <option value="screenshot">Screenshot (Viewport)</option>
          <option value="screenshot@fullPage">Screenshot (Full Page)</option>
        </select>
        <small>Select one or more formats.</small>
      </div>

      <label class="checkbox-label">
        <input type="checkbox" v-model="onlyMainContent" />
        Only Main Content (exclude headers, footers, etc.)
      </label>

      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Submitting…' : 'Start Batch Scrape' }}
      </button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- Progress while the batch job is running -->
    <div v-if="jobId" class="status-section">
      <h3>Batch Status</h3>
      <p>Job ID: {{ jobId }}</p>
      <p>Status: {{ status }}</p>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
      <p>{{ completed }} / {{ total }} pages scraped ({{ progress }}%)</p>
      <p v-if="creditsUsed">Credits used: {{ creditsUsed }}</p>
    </div>

    <!-- Results once the batch is completed -->
    <div v-if="results.length" class="results">
      <h3>Results ({{ results.length }})</h3>
      <ul class="result-list">
        <li v-for="(doc, index) in results" :key="index">
          {{ docTitle(doc) }}
        </li>
      </ul>
      <button class="download-button" type="button" @click="downloadJson">Download JSON</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onUnmounted } from 'vue';
import type { FirecrawlBatchScrapingApi } from '@/services/firecrawl';

/**
 * BatchScrapeView Component
 *
 * Lets the user submit several URLs as a single batch scrape job, polls the job
 * status until completion, and renders the scraped documents with a JSON export.
 */

/**
 * Injects the API instance provided by the API plugin.
 * @type {{ batchScraping?: FirecrawlBatchScrapingApi } | undefined}
 */
const api = inject('api') as { batchScraping?: FirecrawlBatchScrapingApi } | undefined;
if (!api?.batchScraping) {
  throw new Error(
    'Batch scraping API is not available. Ensure the API plugin is correctly configured.',
  );
}

/** Raw multiline textarea content holding one URL per line. */
const urlsInput = ref('');
/** Selected output formats for the scrape. */
const selectedFormats = ref<string[]>(['markdown']);
/** Whether to restrict extraction to the main content of each page. */
const onlyMainContent = ref(true);

/** Whether a submission request is currently in flight. */
const loading = ref(false);
/** User-facing error message. */
const error = ref('');

/** Identifier of the running batch job, or null when idle. */
const jobId = ref<string | null>(null);
/** Current job status label. */
const status = ref('');
/** Number of pages scraped so far. */
const completed = ref(0);
/** Total number of pages in the job. */
const total = ref(0);
/** Completion percentage derived from completed/total. */
const progress = ref(0);
/** Number of credits consumed by the job. */
const creditsUsed = ref(0);
/** Scraped documents returned once the job completes. */
const results = ref<Record<string, unknown>[]>([]);

/** Polling interval handle. */
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Derive a human-readable label from a scraped document.
 *
 * @param doc - The scraped document record.
 * @returns The document title, source URL, or a fallback string.
 */
function docTitle(doc: Record<string, unknown>): string {
  const metadata = (doc.metadata as Record<string, unknown> | undefined) ?? {};
  return (
    (metadata.title as string | undefined) ||
    (metadata.sourceURL as string | undefined) ||
    (doc.url as string | undefined) ||
    'Untitled document'
  );
}

/**
 * Stop the status polling loop, if any is active.
 */
function stopPolling(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Poll the batch scrape status endpoint until the job completes or fails.
 *
 * @param id - The batch job identifier.
 */
function pollStatus(id: string): void {
  stopPolling();
  intervalId = setInterval(async () => {
    try {
      const response = await api.batchScraping!.getBatchScrapeStatus(id);
      const data = response.data;
      status.value = data.status;
      completed.value = data.completed;
      total.value = data.total;
      creditsUsed.value = data.creditsUsed;
      progress.value = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

      if (data.status === 'completed' || data.status === 'failed') {
        results.value = data.data;
        stopPolling();
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch batch status.';
      status.value = 'failed';
      stopPolling();
    }
  }, 3000);
}

/**
 * Submit the batch scrape job from the current form inputs and start polling.
 *
 * @returns {Promise<void>} Resolves once the job has been submitted.
 */
async function handleSubmit(): Promise<void> {
  const urls = urlsInput.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    error.value = 'Please enter at least one URL.';
    return;
  }
  if (selectedFormats.value.length === 0) {
    error.value = 'Please select at least one output format.';
    return;
  }

  loading.value = true;
  error.value = '';
  results.value = [];
  jobId.value = null;
  try {
    const response = await api.batchScraping!.batchScrape({
      urls,
      formats: selectedFormats.value,
      onlyMainContent: onlyMainContent.value,
    });
    jobId.value = response.data.id;
    status.value = 'scraping';
    pollStatus(response.data.id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to start batch scrape.';
  } finally {
    loading.value = false;
  }
}

/**
 * Download the scraped documents as a JSON file.
 */
function downloadJson(): void {
  const blob = new Blob([JSON.stringify(results.value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `batch-scrape-${jobId.value ?? 'results'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Clean up the polling loop when the component is destroyed.
onUnmounted(stopPolling);
</script>

<style scoped>
.batch-scrape-view {
  max-width: 700px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}

.intro {
  margin-bottom: 1rem;
  opacity: 0.8;
}

.batch-form {
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

textarea,
select {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid #aaa;
  border-radius: 4px;
}

.form-group small {
  font-size: 0.8em;
  color: #666;
  margin-top: 3px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
}

.primary-button {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background-color: #007acc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button:hover:not(:disabled) {
  background-color: #005fa3;
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-section {
  margin-top: 1.5rem;
}

.progress-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin: 10px 0;
  overflow: hidden;
}

.progress-bar {
  height: 20px;
  background-color: #4caf50;
  transition: width 0.5s ease;
}

.results {
  margin-top: 1.5rem;
}

.result-list {
  list-style: disc;
  padding-left: 1.5rem;
  word-break: break-all;
}

.download-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.download-button:hover {
  background-color: #0056b3;
}

.error {
  color: #d9534f;
  margin-top: 0.75rem;
}
</style>
