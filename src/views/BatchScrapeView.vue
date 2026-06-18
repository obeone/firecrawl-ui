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
      <div class="status-actions">
        <!-- Cancel button: visible only while the job is actively running -->
        <button
          v-if="isJobRunning"
          class="cancel-button"
          type="button"
          :disabled="cancelling"
          @click="cancelJob"
        >
          {{ cancelling ? 'Cancelling…' : 'Cancel' }}
        </button>
        <!-- Check Errors button: visible whenever a job ID exists -->
        <button class="download-button" type="button" @click="loadErrors">Check Errors</button>
      </div>
    </div>

    <!-- Section listing scrape errors for the current batch job -->
    <div v-if="errorsLoaded" class="batch-errors-section">
      <h3>Batch Errors</h3>
      <p v-if="batchErrors.length === 0 && batchRobotsBlocked.length === 0">No errors reported.</p>
      <ul v-if="batchErrors.length > 0" class="errors-list">
        <li v-for="(err, index) in batchErrors" :key="err.id || index">
          <strong>{{ err.url || 'Unknown URL' }}</strong> — {{ err.error || 'Unknown error' }}
          <em v-if="err.timestamp"> ({{ new Date(err.timestamp).toLocaleString() }})</em>
        </li>
      </ul>
      <div v-if="batchRobotsBlocked.length > 0">
        <h4>Blocked by robots.txt</h4>
        <ul class="errors-list">
          <li v-for="(url, index) in batchRobotsBlocked" :key="index">{{ url }}</li>
        </ul>
      </div>
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
import { ref, computed, inject, onUnmounted } from 'vue';
import type { CrawlError, FirecrawlBatchScrapingApi } from '@/services/firecrawl';

/**
 * BatchScrapeView Component
 *
 * Lets the user submit several URLs as a single batch scrape job, polls the job
 * status until completion, and renders the scraped documents with a JSON export.
 * Also supports cancelling an in-progress job and fetching the error report.
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

/** Whether a cancel request is currently in flight. */
const cancelling = ref(false);

/** Errors reported for the current batch job. */
const batchErrors = ref<CrawlError[]>([]);
/** URLs blocked by robots.txt for the current batch job. */
const batchRobotsBlocked = ref<string[]>([]);
/** Whether the error report has been fetched at least once for the current job. */
const errorsLoaded = ref(false);

/** Polling interval handle. */
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * True while the job is actively scraping or processing (i.e. not yet in a
 * terminal state). Used to control the visibility of the Cancel button.
 */
const isJobRunning = computed(
  () =>
    jobId.value !== null &&
    status.value !== 'completed' &&
    status.value !== 'failed' &&
    status.value !== 'cancelled',
);

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
  errorsLoaded.value = false;
  batchErrors.value = [];
  batchRobotsBlocked.value = [];
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
 * Cancel the currently running batch scrape job.
 *
 * Calls the cancel endpoint, stops polling, and sets the status to 'cancelled'.
 * Any API error is surfaced through the existing error ref.
 *
 * @returns {Promise<void>} Resolves once the cancel request completes.
 */
async function cancelJob(): Promise<void> {
  if (!jobId.value) {
    return;
  }
  cancelling.value = true;
  error.value = '';
  try {
    await api.batchScraping!.cancelBatchScrape(jobId.value);
    stopPolling();
    status.value = 'cancelled';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to cancel batch scrape job.';
  } finally {
    cancelling.value = false;
  }
}

/**
 * Fetch the error report for the current batch job and populate the errors section.
 *
 * Both `batchErrors` and `batchRobotsBlocked` are updated; `errorsLoaded` is
 * set to true so the errors section becomes visible. Any API error is surfaced
 * through the existing error ref.
 *
 * @returns {Promise<void>} Resolves once the error report has been fetched.
 */
async function loadErrors(): Promise<void> {
  if (!jobId.value) {
    return;
  }
  error.value = '';
  try {
    const response = await api.batchScraping!.getBatchScrapeErrors(jobId.value);
    batchErrors.value = response.data.errors;
    batchRobotsBlocked.value = response.data.robotsBlocked;
    errorsLoaded.value = true;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch batch scrape errors.';
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

.status-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.cancel-button {
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  background-color: #dc3545;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-button:hover:not(:disabled) {
  background-color: #b02a37;
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.batch-errors-section {
  margin: 1.5rem 0;
  padding: 15px;
  border: 1px solid #f0c0c0;
  border-radius: 4px;
  background: #fff7f7;
}

.errors-list {
  list-style: disc;
  padding-left: 1.5rem;
  word-break: break-all;
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
