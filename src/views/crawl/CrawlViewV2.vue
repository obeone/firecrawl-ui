<template>
  <div class="page-container">
    <h1>Crawl Configuration (API v2)</h1>
    <form class="crawl-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">Base URL</label>
        <input
          id="url"
          v-model="formState.url"
          type="url"
          required
          placeholder="https://example.com"
        />
      </div>

      <div class="grid">
        <div class="form-group">
          <label for="includes">Includes (one per line)</label>
          <textarea
            id="includes"
            v-model="formState.includes"
            placeholder="/blog/**"
            rows="3"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="excludes">Excludes (one per line)</label>
          <textarea
            id="excludes"
            v-model="formState.excludes"
            placeholder="/private/**"
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="grid">
        <div class="form-group">
          <label for="maxDepth">Max depth</label>
          <input id="maxDepth" v-model.number="formState.maxDepth" type="number" min="0" />
        </div>
        <div class="form-group">
          <label for="maxPages">Max pages</label>
          <input id="maxPages" v-model.number="formState.maxPages" type="number" min="1" />
        </div>
        <div class="form-group">
          <label for="statusInterval">Status interval (seconds)</label>
          <input id="statusInterval" v-model.number="statusInterval" type="number" min="1" />
        </div>
      </div>

      <fieldset class="options">
        <legend>Page options</legend>
        <label class="checkbox">
          <input type="checkbox" v-model="formState.onlyMainContent" /> Only main content
        </label>
        <label class="checkbox">
          <input type="checkbox" v-model="formState.includeHtml" /> Include HTML
        </label>
        <label class="checkbox">
          <input type="checkbox" v-model="formState.screenshot" /> Capture screenshot
        </label>
      </fieldset>

      <fieldset class="options">
        <legend>Webhook (optional)</legend>
        <div class="form-group">
          <label for="webhookUrl">Webhook URL</label>
          <input
            id="webhookUrl"
            v-model="formState.webhookUrl"
            type="url"
            placeholder="https://example.com/hook"
          />
        </div>
        <div class="form-group">
          <label for="webhookSecret">Webhook secret</label>
          <input id="webhookSecret" v-model="formState.webhookSecret" type="text" />
        </div>
      </fieldset>

      <label class="checkbox">
        <input type="checkbox" v-model="formState.returnOnlyUrls" /> Return only URLs
      </label>

      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Starting…' : 'Start crawl' }}
      </button>
    </form>

    <div v-if="error" class="status error">{{ error }}</div>

    <section v-if="currentJobId" class="status-panel">
      <h2>Status</h2>
      <p><strong>Job ID:</strong> {{ currentJobId }}</p>
      <p><strong>State:</strong> {{ crawlStatus }}</p>
      <p v-if="totalPages">
        <strong>Progress:</strong> {{ processedPages }} / {{ totalPages }}
        <span v-if="progressPercentage !== null">({{ progressPercentage }}%)</span>
      </p>
      <div class="actions">
        <button class="secondary-button" type="button" @click="fetchStatus">Refresh</button>
        <button
          class="secondary-button"
          type="button"
          @click="cancelCrawl"
          :disabled="loading || crawlStatus !== 'crawling'"
        >
          Cancel job
        </button>
        <button
          class="secondary-button"
          type="button"
          @click="downloadResults"
          :disabled="!results.length"
        >
          Download results
        </button>
      </div>
      <div v-if="results.length" class="results">
        <h3>Pages</h3>
        <ul>
          <li v-for="(page, index) in results" :key="index">
            <span v-if="page?.metadata?.sourceURL">{{ page.metadata.sourceURL }}</span>
            <span v-else>Item {{ index + 1 }}</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, reactive, ref } from 'vue';
import type { AxiosResponse } from 'axios';
import type { FirecrawlApiClients } from '@/plugins/api';
import type {
  CrawlRequestV2,
  CrawlResponseV2,
  CrawlStatusResponseV2,
  ScrapeResponseV2,
} from '@/types/api.js';

interface FormState {
  url: string;
  includes: string;
  excludes: string;
  maxDepth: number;
  maxPages: number;
  returnOnlyUrls: boolean;
  onlyMainContent: boolean;
  includeHtml: boolean;
  screenshot: boolean;
  webhookUrl: string;
  webhookSecret: string;
}

const api = inject('api') as FirecrawlApiClients | undefined;
if (!api?.crawling) {
  throw new Error('Crawling API client is not available.');
}

const formState = reactive<FormState>({
  url: '',
  includes: '',
  excludes: '',
  maxDepth: 3,
  maxPages: 100,
  returnOnlyUrls: false,
  onlyMainContent: false,
  includeHtml: false,
  screenshot: false,
  webhookUrl: '',
  webhookSecret: '',
});

const statusInterval = ref(3);
const loading = ref(false);
const error = ref('');
const currentJobId = ref<string | null>(null);
const crawlStatus = ref('');
const totalPages = ref<number | null>(null);
const processedPages = ref<number>(0);
const results = ref<Array<ScrapeResponseV2['data']>>([]);
let pollingHandle: ReturnType<typeof setInterval> | null = null;

const progressPercentage = computed(() => {
  if (!totalPages.value || totalPages.value === 0) {
    return null;
  }
  const percentage = Math.round((processedPages.value / totalPages.value) * 100);
  return Number.isNaN(percentage) ? null : percentage;
});

/**
 * Normalize textarea content into an array of strings.
 *
 * @param value - Raw textarea content.
 * @returns A filtered array of non-empty strings.
 */
function parseList(value: string): string[] | undefined {
  const items = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Build the crawl request payload following the v2 contract.
 *
 * @returns Crawl request ready to be sent to the API.
 */
function buildPayload(): CrawlRequestV2 {
  const payload: CrawlRequestV2 = {
    url: formState.url,
    crawlerOptions: {
      ...(parseList(formState.includes) ? { includes: parseList(formState.includes) } : {}),
      ...(parseList(formState.excludes) ? { excludes: parseList(formState.excludes) } : {}),
      ...(formState.maxDepth >= 0 ? { maxDepth: formState.maxDepth } : {}),
      ...(formState.maxPages > 0 ? { maxPages: formState.maxPages } : {}),
      ...(formState.returnOnlyUrls ? { returnOnlyUrls: true } : {}),
    },
    pageOptions: {
      onlyMainContent: formState.onlyMainContent,
      includeHtml: formState.includeHtml,
      screenshot: formState.screenshot,
    },
  };

  if (formState.webhookUrl) {
    payload.webhook = {
      url: formState.webhookUrl,
      ...(formState.webhookSecret ? { secret: formState.webhookSecret } : {}),
    };
  }

  return payload;
}

/**
 * Persist the latest crawl results as a JSON download.
 */
function downloadResults(): void {
  const payload = {
    jobId: currentJobId.value,
    status: crawlStatus.value,
    total: totalPages.value,
    progress: processedPages.value,
    data: results.value,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'crawl-results.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Stop the polling timer if active.
 */
function stopPolling(): void {
  if (pollingHandle) {
    clearInterval(pollingHandle);
    pollingHandle = null;
  }
}

/**
 * Refresh the crawl status from the API.
 */
async function fetchStatus(): Promise<void> {
  if (!currentJobId.value) {
    return;
  }
  try {
    const response = (await api.crawling.getCrawlStatus(
      currentJobId.value,
    )) as AxiosResponse<CrawlStatusResponseV2>;
    const data = response.data;
    crawlStatus.value = data.status ?? '';
    totalPages.value = data.total ?? null;
    processedPages.value = data.progress ?? 0;
    results.value = data.data ?? [];
    if (data.status === 'completed' || data.status === 'failed') {
      stopPolling();
    }
  } catch (err) {
    console.error('Failed to fetch crawl status', err);
    error.value = err instanceof Error ? err.message : 'Failed to fetch crawl status.';
    stopPolling();
    loading.value = false;
  }
}

/**
 * Schedule recurring status refreshes.
 */
function startPolling(): void {
  stopPolling();
  pollingHandle = setInterval(fetchStatus, statusInterval.value * 1000);
}

/**
 * Submit the crawl request to the API and start polling the job status.
 */
async function handleSubmit(): Promise<void> {
  error.value = '';
  if (!formState.url) {
    error.value = 'Please provide a base URL to crawl.';
    return;
  }

  try {
    loading.value = true;
    const payload = buildPayload();
    const response = (await api.crawling.crawlUrls(payload)) as AxiosResponse<CrawlResponseV2>;
    currentJobId.value = response.data.jobId;
    crawlStatus.value = 'crawling';
    processedPages.value = 0;
    totalPages.value = null;
    results.value = [];
    if (!currentJobId.value) {
      throw new Error('The crawl response did not include a job ID.');
    }
    startPolling();
    await fetchStatus();
    loading.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start crawl.';
    loading.value = false;
  }
}

/**
 * Cancel the active crawl job.
 */
async function cancelCrawl(): Promise<void> {
  if (!currentJobId.value) {
    return;
  }
  try {
    await api.crawling.cancelCrawl(currentJobId.value);
    crawlStatus.value = 'cancelled';
    stopPolling();
    loading.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to cancel crawl.';
  }
}

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<style scoped>
.page-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem 1rem;
}

.crawl-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.options {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.primary-button,
.secondary-button {
  padding: 0.6rem 1.1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button {
  background-color: #1d4ed8;
  color: #fff;
}

.secondary-button {
  background-color: #0f172a;
  color: #fff;
}

.status.error {
  color: #b91c1c;
  margin-bottom: 1rem;
}

.status-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
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
