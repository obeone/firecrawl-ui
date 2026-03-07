<template>
  <div class="page-container">
    <h1>Crawl Configuration (API v2)</h1>
    <form class="scrape-config-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">Base URL to crawl:</label>
        <input id="url" v-model="form.url" type="text" required placeholder="https://example.com" />
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Crawler Options</legend>
        <div class="grid-layout">
          <div class="form-group">
            <label for="includes">Includes (comma separated globs):</label>
            <input
              id="includes"
              v-model="form.includes"
              type="text"
              placeholder="/blog/**, /docs/**"
            />
          </div>
          <div class="form-group">
            <label for="excludes">Excludes (comma separated globs):</label>
            <input id="excludes" v-model="form.excludes" type="text" placeholder="/private/**" />
          </div>
          <div class="form-group">
            <label for="maxDepth">Max depth:</label>
            <input id="maxDepth" v-model.number="form.maxDepth" type="number" min="0" />
          </div>
          <div class="form-group">
            <label for="maxPages">Max pages:</label>
            <input id="maxPages" v-model.number="form.maxPages" type="number" min="1" />
          </div>
        </div>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.returnOnlyUrls" />
          Return only URLs (skip page content)
        </label>
      </fieldset>

      <fieldset class="form-group options-fieldset">
        <legend>Page Options</legend>
        <div class="grid-layout">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.onlyMainContent" />
            Only main content
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.includeHtml" />
            Include HTML
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.screenshot" />
            Capture screenshot
          </label>
        </div>
      </fieldset>

      <fieldset class="form-group options-fieldset">
        <legend>Webhook (optional)</legend>
        <div class="grid-layout">
          <div class="form-group">
            <label for="webhookUrl">Webhook URL:</label>
            <input
              id="webhookUrl"
              v-model="form.webhookUrl"
              type="text"
              placeholder="https://example.com/hook"
            />
          </div>
          <div class="form-group">
            <label for="webhookSecret">Webhook secret:</label>
            <input id="webhookSecret" v-model="form.webhookSecret" type="text" />
          </div>
        </div>
      </fieldset>

      <button type="submit" class="primary-button">Start crawl</button>
    </form>

    <div v-if="loading" class="status loading">
      <div class="spinner"></div>
      <span>Submitting crawl job...</span>
    </div>

    <div v-if="error" class="status error">
      <div class="error-icon">!</div>
      <div>
        <h3>Error occurred</h3>
        <p>{{ error }}</p>
        <button class="primary-button" @click="error = ''">Dismiss</button>
      </div>
    </div>

    <div v-if="status" class="status-block">
      <h2>Crawl status</h2>
      <p><strong>State:</strong> {{ status.status }}</p>
      <p v-if="status.total != null">
        <strong>Progress:</strong>
        {{ status.progress ?? 0 }} / {{ status.total }} pages ({{ progressPercent }}%)
      </p>
      <div class="actions">
        <button
          v-if="jobId && status.status === 'crawling'"
          class="secondary-button"
          @click="cancelCrawl"
        >
          Cancel crawl
        </button>
        <button v-if="status.data?.length" class="secondary-button" @click="downloadResults">
          Download results (JSON)
        </button>
      </div>
      <ul v-if="status.data?.length" class="results-list">
        <li v-for="(page, index) in status.data" :key="index">
          {{ page.metadata?.sourceURL || 'Page ' + (index + 1) }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, onUnmounted, reactive, ref } from 'vue';
import type { FirecrawlApiClients } from '@/plugins/api';
import type {
  CrawlingApiV2,
  CrawlRequestV2,
  CrawlStatusResponseV2,
} from '@/api-client-v2/index.js';

interface CrawlFormState {
  url: string;
  includes: string;
  excludes: string;
  maxDepth?: number;
  maxPages?: number;
  returnOnlyUrls: boolean;
  onlyMainContent: boolean;
  includeHtml: boolean;
  screenshot: boolean;
  webhookUrl: string;
  webhookSecret: string;
}

/**
 * CrawlViewV2 exposes a simplified configuration aligned with the API v2 crawl endpoint.
 */
export default defineComponent({
  name: 'CrawlViewV2',
  setup() {
    const clients = inject('api') as FirecrawlApiClients | undefined;
    if (!clients || clients.version !== 'v2') {
      throw new Error('Crawling API v2 is not available');
    }
    const crawlingApi = clients.crawling as CrawlingApiV2;

    const form = reactive<CrawlFormState>({
      url: '',
      includes: '',
      excludes: '',
      maxDepth: undefined,
      maxPages: undefined,
      returnOnlyUrls: false,
      onlyMainContent: true,
      includeHtml: false,
      screenshot: false,
      webhookUrl: '',
      webhookSecret: '',
    });

    const loading = ref(false);
    const error = ref('');
    const jobId = ref<string | null>(null);
    const status = ref<CrawlStatusResponseV2 | null>(null);
    let pollHandle: number | null = null;

    const progressPercent = computed(() => {
      if (!status.value || status.value.total == null || status.value.total === 0) {
        return 0;
      }
      const processed = status.value.progress ?? 0;
      return Math.min(100, Math.round((processed / status.value.total) * 100));
    });

    /**
     * Convert a comma-separated string into an array of trimmed values.
     *
     * @param value - Raw comma-separated input.
     * @returns An array of values or undefined when empty.
     */
    const parseList = (value: string): string[] | undefined => {
      const parts = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return parts.length ? parts : undefined;
    };

    /**
     * Stop the status polling interval when active.
     */
    const stopPolling = () => {
      if (pollHandle !== null) {
        clearInterval(pollHandle);
        pollHandle = null;
      }
    };

    /**
     * Retrieve the crawl status for the provided job identifier.
     *
     * @param id - Crawl job identifier.
     */
    const fetchStatus = async (id: string) => {
      try {
        const response = await crawlingApi.getCrawlStatus(id);
        status.value = response.data;
        if (response.data.status && response.data.status !== 'crawling') {
          stopPolling();
        }
      } catch (err: any) {
        error.value = err?.message || 'Failed to fetch crawl status';
        stopPolling();
      }
    };

    /**
     * Begin polling the crawl status periodically.
     *
     * @param id - Crawl job identifier.
     */
    const startPolling = (id: string) => {
      stopPolling();
      pollHandle = window.setInterval(() => {
        void fetchStatus(id);
      }, 3000);
      void fetchStatus(id);
    };

    /**
     * Submit a crawl job to the v2 endpoint.
     */
    const handleSubmit = async () => {
      error.value = '';
      status.value = null;

      if (!form.url.trim()) {
        error.value = 'Please provide a base URL.';
        return;
      }

      const payload: CrawlRequestV2 = {
        url: form.url.trim(),
        crawlerOptions: {
          ...(parseList(form.includes) ? { includes: parseList(form.includes) } : {}),
          ...(parseList(form.excludes) ? { excludes: parseList(form.excludes) } : {}),
          ...(form.maxDepth != null ? { maxDepth: form.maxDepth } : {}),
          ...(form.maxPages != null ? { maxPages: form.maxPages } : {}),
          returnOnlyUrls: form.returnOnlyUrls,
        },
        pageOptions: {
          onlyMainContent: form.onlyMainContent,
          includeHtml: form.includeHtml,
          screenshot: form.screenshot,
        },
        ...(form.webhookUrl
          ? {
              webhook: {
                url: form.webhookUrl,
                ...(form.webhookSecret ? { secret: form.webhookSecret } : {}),
              },
            }
          : {}),
      };

      loading.value = true;
      try {
        const response = await crawlingApi.startCrawl(payload);
        jobId.value = response.data.jobId;
        if (jobId.value) {
          startPolling(jobId.value);
        }
      } catch (err: any) {
        error.value = err?.message || 'Failed to start crawl';
      } finally {
        loading.value = false;
      }
    };

    /**
     * Cancel the active crawl job when possible.
     */
    const cancelCrawl = async () => {
      if (!jobId.value) {
        return;
      }
      try {
        await crawlingApi.cancelCrawl(jobId.value);
      } catch (err: any) {
        error.value = err?.message || 'Failed to cancel crawl';
      } finally {
        stopPolling();
      }
    };

    /**
     * Download the collected crawl data as a JSON file.
     */
    const downloadResults = () => {
      if (!status.value?.data?.length) {
        return;
      }
      const blob = new Blob([JSON.stringify(status.value.data, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'crawl-results.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    onUnmounted(() => {
      stopPolling();
    });

    return {
      form,
      loading,
      error,
      jobId,
      status,
      progressPercent,
      handleSubmit,
      cancelCrawl,
      downloadResults,
    };
  },
});
</script>

<style scoped>
.page-container {
  max-width: 960px;
  margin: 20px auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
}

.options-fieldset {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.primary-button {
  background-color: #0066cc;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.secondary-button {
  background-color: #f4f4f4;
  border: 1px solid #ccc;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.status {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 6px;
}

.status.error {
  border-color: #cc0000;
  color: #cc0000;
}

.error-icon {
  background-color: #cc0000;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status-block {
  margin-top: 24px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.results-list {
  margin-top: 12px;
  list-style: disc;
  padding-left: 20px;
}
</style>
