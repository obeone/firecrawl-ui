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
        <small v-if="importedCount > 0" class="imported-note">
          {{ importedCount }} {{ importedCount === 1 ? 'URL' : 'URLs' }} imported from Map — choose
          scrape options, then start.
        </small>
      </div>

      <ScrapeOptionsForm v-model="scrapeOptions" :format-options="BATCH_FORMAT_OPTIONS" />

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
      <div class="export-actions">
        <button class="download-button" type="button" @click="exportJson">Export JSON</button>
        <button
          class="download-button"
          type="button"
          :disabled="!markdownAvailable"
          :title="markdownAvailable ? '' : markdownHint"
          @click="exportMarkdown"
        >
          Export Markdown
        </button>
        <button
          class="download-button"
          type="button"
          :disabled="!markdownAvailable"
          :title="markdownAvailable ? '' : markdownHint"
          @click="exportMarkdownZip"
        >
          Export Markdown (zip)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useApi } from '@/plugins/api';
import type { CrawlError } from '@/services/firecrawl';
import { saveAs } from 'file-saver';
import { describeRequestError } from '@/utils/errors';
import {
  buildCompiledMarkdown,
  buildJsonExport,
  buildMarkdownZip,
  exportFileBase,
  hasMarkdown,
} from '@/utils/jobExport';
import { createLatestGuard, type IsCurrent } from '@/utils/latestGuard';
import { takePendingBatchUrls } from '@/utils/batchHandoff';
import { isTerminalStatus } from '@/utils/polling';
import { recordJob, updateJob } from '@/utils/jobHistory';
import { useJobPoller } from '@/composables/useJobPoller';
import ScrapeOptionsForm from '@/components/ScrapeOptionsForm.vue';
import {
  BATCH_FORMAT_OPTIONS,
  buildBatchScrapePayload,
  defaultScrapeOptionsFormValue,
  type ScrapeOptionsFormValue,
} from '@/utils/scrapeOptions';

/**
 * BatchScrapeView Component
 *
 * Lets the user submit several URLs as a single batch scrape job, polls the job
 * status until completion, and renders the scraped documents with a JSON export.
 * Also supports cancelling an in-progress job and fetching the error report.
 */

/**
 * Injects the API instance provided by the API plugin.
 */
const api = useApi();

/** Raw multiline textarea content holding one URL per line. */
const urlsInput = ref('');

/** Number of URLs imported from the Map view, shown until the user submits. */
const importedCount = ref(0);

// Pick up URLs selected in the Map view (in-memory handoff, consumed once).
onMounted(() => {
  const pending = takePendingBatchUrls();
  if (pending?.length) {
    urlsInput.value = pending.join('\n');
    importedCount.value = pending.length;
  }
});
/** Scrape options applied to every URL: formats, main content, tag filters. */
const scrapeOptions = ref<ScrapeOptionsFormValue>(defaultScrapeOptionsFormValue());

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

/** Status poll loop; stops on its own when the view is destroyed. */
const poller = useJobPoller();
// Answers that arrive for a job the user has replaced are dropped.
const jobGuard = createLatestGuard();

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
  poller.stop();
}

/**
 * Poll the batch scrape status endpoint until the job settles.
 *
 * One request at a time; `completed`, `failed` and `cancelled` all end the
 * loop. A failed status request leaves the job state `unavailable` rather than
 * `failed`, since the job itself may still be running server-side.
 *
 * @param id - The batch job identifier.
 * @param isCurrent - Token of the submit that started this job; once stale,
 *   late answers are ignored.
 */
function pollStatus(id: string, isCurrent: IsCurrent): void {
  poller.start({
    request: async () => (await api.batchScraping.getBatchScrapeStatus(id)).data,
    isSettled: (data) => isTerminalStatus(data.status),
    onUpdate: (data) => {
      status.value = data.status;
      completed.value = data.completed;
      updateJob('batch', id, { status: data.status, resultCount: data.completed });
      total.value = data.total;
      creditsUsed.value = data.creditsUsed;
      progress.value = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
    },
    onSettled: async (data) => {
      if (!isCurrent()) {
        return;
      }
      if (data.status === 'completed' || data.status === 'failed') {
        // The results can span many pages; another job may start meanwhile.
        try {
          const all = await api.batchScraping.getBatchScrapeResults(id);
          if (isCurrent()) {
            results.value = all.data.data;
          }
        } catch (err: unknown) {
          if (isCurrent()) {
            error.value = describeRequestError(err, 'Failed to fetch batch results.');
          }
        }
      }
    },
    onError: (err: unknown) => {
      if (!isCurrent()) {
        return;
      }
      error.value = `Failed to fetch batch status: ${describeRequestError(err)}`;
      status.value = 'unavailable';
    },
    intervalMs: 3000,
    jobId: id,
  });
}

/**
 * Submit the batch scrape job from the current form inputs and start polling.
 *
 * @returns {Promise<void>} Resolves once the job has been submitted.
 */
async function handleSubmit(): Promise<void> {
  importedCount.value = 0;
  const urls = urlsInput.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    error.value = 'Please enter at least one URL.';
    return;
  }
  if (scrapeOptions.value.formats.length === 0) {
    error.value = 'Please select at least one output format.';
    return;
  }

  // Any answer still pending for the previous job is now stale.
  const isCurrent = jobGuard.begin();
  stopPolling();
  loading.value = true;
  // A cancel still pending for the previous job must not lock this one.
  cancelling.value = false;
  error.value = '';
  results.value = [];
  jobId.value = null;
  errorsLoaded.value = false;
  batchErrors.value = [];
  batchRobotsBlocked.value = [];
  try {
    const response = await api.batchScraping.batchScrape(
      buildBatchScrapePayload(urls, scrapeOptions.value),
    );
    if (!isCurrent()) {
      return;
    }
    jobId.value = response.data.id;
    status.value = 'scraping';
    recordJob({
      kind: 'batch',
      id: response.data.id,
      createdAt: new Date().toISOString(),
      sourceUrl: urls[0],
      resultCount: null,
      status: 'scraping',
    });
    pollStatus(response.data.id, isCurrent);
  } catch (err: unknown) {
    if (isCurrent()) {
      error.value = err instanceof Error ? err.message : 'Failed to start batch scrape.';
    }
  } finally {
    if (isCurrent()) {
      loading.value = false;
    }
  }
}

const route = useRoute();

// Reopen a job from the History page (?job=<id>): resume polling it the same
// way a fresh submit does.
onMounted(() => {
  const job = route.query.job;
  if (typeof job === 'string' && job !== '') {
    const isCurrent = jobGuard.begin();
    jobId.value = job;
    status.value = 'scraping';
    pollStatus(job, isCurrent);
  }
});

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
  const id = jobId.value;
  const isCurrent = jobGuard.current();
  cancelling.value = true;
  error.value = '';
  try {
    await api.batchScraping.cancelBatchScrape(id);
    // The server cancelled this job whichever job is on screen now.
    updateJob('batch', id, { status: 'cancelled' });
    if (isCurrent()) {
      stopPolling();
      status.value = 'cancelled';
    }
  } catch (err: unknown) {
    if (isCurrent()) {
      error.value = err instanceof Error ? err.message : 'Failed to cancel batch scrape job.';
    }
  } finally {
    if (isCurrent()) {
      cancelling.value = false;
    }
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
  const isCurrent = jobGuard.current();
  error.value = '';
  try {
    const response = await api.batchScraping.getBatchScrapeErrors(jobId.value);
    if (!isCurrent()) {
      return;
    }
    batchErrors.value = response.data.errors;
    batchRobotsBlocked.value = response.data.robotsBlocked;
    errorsLoaded.value = true;
  } catch (err: unknown) {
    if (isCurrent()) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch batch scrape errors.';
    }
  }
}

const markdownHint = 'No document has Markdown content: request the Markdown format when scraping.';
const markdownAvailable = computed(() => hasMarkdown(results.value));

/**
 * Save the batch results through the browser download flow.
 *
 * @param build - Produces the file content and its extension suffix.
 */
async function saveExport(build: () => Promise<Blob> | Blob, suffix: string): Promise<void> {
  try {
    const base = exportFileBase('batch', jobId.value ?? '');
    saveAs(await build(), `${base}${suffix}`);
  } catch (err) {
    error.value = `Failed to export results: ${describeRequestError(err)}`;
  }
}

/** Export the scraped documents as a JSON file. */
function exportJson(): Promise<void> {
  return saveExport(
    () =>
      new Blob([buildJsonExport('batch', jobId.value ?? '', results.value)], {
        type: 'application/json',
      }),
    '.json',
  );
}

/** Export the scraped documents compiled into one Markdown file. */
function exportMarkdown(): Promise<void> {
  return saveExport(
    () =>
      new Blob([buildCompiledMarkdown(`Batch scrape ${jobId.value ?? ''}`.trim(), results.value)], {
        type: 'text/markdown',
      }),
    '.md',
  );
}

/** Export the scraped documents as a zip with one Markdown file per page. */
function exportMarkdownZip(): Promise<void> {
  return saveExport(() => buildMarkdownZip(results.value), '-markdown.zip');
}

// Ignore pending answers once the component is destroyed; the poller stops itself.
onUnmounted(() => {
  jobGuard.invalidate();
});
</script>

<style scoped>
.imported-note {
  color: var(--brand-strong);
  font-weight: 600;
}

.batch-scrape-view {
  max-width: 700px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid var(--color-border);
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

/* :deep() so the fields rendered by ScrapeOptionsForm get the same layout. */
:deep(.form-group) {
  display: flex;
  flex-direction: column;
}

:deep(label) {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

:deep(textarea),
:deep(select),
:deep(input[type='text']) {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-mute);
  color: var(--color-text);
}

:deep(.form-group small) {
  font-size: 0.8em;
  color: var(--color-text);
  opacity: 0.7;
  margin-top: 3px;
}

:deep(.checkbox-label) {
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
  background-color: var(--color-background-mute);
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
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-soft);
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

.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.download-button:hover {
  background-color: #0056b3;
}

.error {
  color: #d9534f;
  margin-top: 0.75rem;
}
</style>
