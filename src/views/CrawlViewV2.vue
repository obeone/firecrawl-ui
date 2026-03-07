<template>
  <div class="page-container crawl-view">
    <h1>Crawl Configuration (API v2)</h1>
    <form class="scrape-config-form" @submit.prevent="startCrawl">
      <div class="form-group">
        <label for="crawlUrl">Start URL:</label>
        <input id="crawlUrl" v-model="formData.url" type="url" required />
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Crawler Options</legend>
        <div class="form-group">
          <label for="includes">Include Patterns (comma or newline separated):</label>
          <textarea
            id="includes"
            v-model="includesInput"
            rows="3"
            placeholder="/blog/**"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="excludes">Exclude Patterns (comma or newline separated):</label>
          <textarea
            id="excludes"
            v-model="excludesInput"
            rows="3"
            placeholder="/blog/old/**"
          ></textarea>
        </div>
        <div class="grid-layout">
          <div class="form-group">
            <label for="maxDepth">Max Depth:</label>
            <input
              id="maxDepth"
              v-model.number="formData.crawlerOptions.maxDepth"
              type="number"
              min="0"
            />
          </div>
          <div class="form-group">
            <label for="maxPages">Max Pages:</label>
            <input
              id="maxPages"
              v-model.number="formData.crawlerOptions.maxPages"
              type="number"
              min="1"
            />
          </div>
        </div>
        <label class="checkbox-label">
          <input type="checkbox" v-model="formData.crawlerOptions.returnOnlyUrls" />
          Return only URLs (no content)
        </label>
      </fieldset>

      <fieldset class="form-group options-fieldset">
        <legend>Page Options</legend>
        <div class="grid-layout">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.pageOptions.onlyMainContent" />
            Only main content
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.pageOptions.includeHtml" />
            Include HTML
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.pageOptions.screenshot" />
            Capture screenshots
          </label>
        </div>
      </fieldset>

      <fieldset class="form-group options-fieldset">
        <legend>Webhook (optional)</legend>
        <div class="form-group">
          <label for="webhookUrl">Webhook URL:</label>
          <input
            id="webhookUrl"
            v-model="formData.webhook.url"
            type="url"
            placeholder="https://example.com/webhook"
          />
        </div>
        <div class="form-group">
          <label for="webhookSecret">Webhook Secret:</label>
          <input id="webhookSecret" v-model="formData.webhook.secret" type="text" />
        </div>
      </fieldset>

      <button type="submit" class="primary-button" :disabled="loading">Start Crawl</button>
    </form>

    <div v-if="loading" class="status loading">
      <div class="spinner"></div>
      <span>Starting crawl...</span>
    </div>

    <div v-if="currentJobId" class="status success">
      <p>
        Crawl job started with ID: <strong>{{ currentJobId }}</strong>
      </p>
      <button class="secondary-button" @click="copyJobId">Copy Job ID</button>
    </div>

    <div class="status error" v-if="error">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
    </div>

    <section class="status-check">
      <h2>Check Crawl Status</h2>
      <form @submit.prevent="fetchStatus" class="status-form">
        <input
          id="statusJobId"
          v-model="statusJobId"
          type="text"
          placeholder="Enter crawl job ID"
          required
        />
        <button type="submit" class="secondary-button" :disabled="statusLoading">
          Fetch Status
        </button>
        <button
          type="button"
          class="secondary-button"
          :disabled="cancelLoading || !statusJobId"
          @click="cancelCrawl"
        >
          Cancel Crawl
        </button>
      </form>
      <div v-if="statusError" class="status error">
        <div class="error-icon">!</div>
        <p>{{ statusError }}</p>
      </div>
      <div v-if="statusLoading" class="status loading">
        <div class="spinner"></div>
        <span>Loading status...</span>
      </div>
      <div v-if="statusResult" class="result">
        <div class="result-header">
          <h3>Status</h3>
          <button class="secondary-button" @click="downloadStatus">Download JSON</button>
        </div>
        <pre>{{ formattedStatus }}</pre>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { getV2, postV2 } from '@/api/v2Client';

interface CrawlerOptionsV2 {
  includes?: string[];
  excludes?: string[];
  maxDepth?: number;
  maxPages?: number;
  returnOnlyUrls?: boolean;
}

interface PageOptionsV2 {
  onlyMainContent: boolean;
  includeHtml: boolean;
  screenshot: boolean;
}

interface WebhookOptionsV2 {
  url?: string;
  secret?: string;
}

interface CrawlRequestV2 {
  url: string;
  crawlerOptions?: CrawlerOptionsV2;
  pageOptions?: PageOptionsV2;
  webhook?: WebhookOptionsV2;
}

interface CrawlStatusResponseV2 {
  status?: string;
  total?: number;
  progress?: number;
  data?: Array<Record<string, unknown>>;
}

export default defineComponent({
  name: 'CrawlViewV2',
  setup() {
    const formData = ref({
      url: '',
      crawlerOptions: {
        maxDepth: 3,
        maxPages: 100,
        returnOnlyUrls: false,
      } as CrawlerOptionsV2,
      pageOptions: {
        onlyMainContent: false,
        includeHtml: false,
        screenshot: false,
      } as PageOptionsV2,
      webhook: {
        url: '',
        secret: '',
      } as WebhookOptionsV2,
    });

    const includesInput = ref('');
    const excludesInput = ref('');
    const loading = ref(false);
    const error = ref('');
    const currentJobId = ref('');

    const statusJobId = ref('');
    const statusLoading = ref(false);
    const cancelLoading = ref(false);
    const statusError = ref('');
    const statusResult = ref<CrawlStatusResponseV2 | null>(null);

    /**
     * Provides a formatted JSON representation of the current crawl status.
     *
     * @returns {string} The formatted JSON or an empty string when no status is available.
     */
    const formattedStatus = computed(() =>
      statusResult.value ? JSON.stringify(statusResult.value, null, 2) : '',
    );

    /**
     * Converts the includes and excludes text input into string arrays.
     *
     * @returns {{ includes: string[]; excludes: string[] }} The parsed pattern arrays.
     */
    const buildPatternLists = (): { includes: string[]; excludes: string[] } => {
      const sanitize = (value: string): string[] =>
        value
          .split(/[,\n]/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      return {
        includes: sanitize(includesInput.value),
        excludes: sanitize(excludesInput.value),
      };
    };

    /**
     * Builds the crawl request payload using the form state.
     *
     * @returns {CrawlRequestV2} The request payload.
     */
    const buildPayload = (): CrawlRequestV2 => {
      const payload: CrawlRequestV2 = {
        url: formData.value.url,
      };

      const { includes, excludes } = buildPatternLists();
      const crawlerOptions: CrawlerOptionsV2 = {};
      if (includes.length) {
        crawlerOptions.includes = includes;
      }
      if (excludes.length) {
        crawlerOptions.excludes = excludes;
      }
      if (
        formData.value.crawlerOptions.maxDepth !== undefined &&
        formData.value.crawlerOptions.maxDepth !== null
      ) {
        crawlerOptions.maxDepth = formData.value.crawlerOptions.maxDepth;
      }
      if (
        formData.value.crawlerOptions.maxPages !== undefined &&
        formData.value.crawlerOptions.maxPages !== null
      ) {
        crawlerOptions.maxPages = formData.value.crawlerOptions.maxPages;
      }
      if (formData.value.crawlerOptions.returnOnlyUrls) {
        crawlerOptions.returnOnlyUrls = true;
      }
      if (Object.keys(crawlerOptions).length > 0) {
        payload.crawlerOptions = crawlerOptions;
      }

      const pageOptions: PageOptionsV2 = {
        onlyMainContent: formData.value.pageOptions.onlyMainContent,
        includeHtml: formData.value.pageOptions.includeHtml,
        screenshot: formData.value.pageOptions.screenshot,
      };
      if (pageOptions.onlyMainContent || pageOptions.includeHtml || pageOptions.screenshot) {
        payload.pageOptions = pageOptions;
      }

      const webhookOptions: WebhookOptionsV2 = {};
      if (formData.value.webhook.url?.trim()) {
        webhookOptions.url = formData.value.webhook.url.trim();
      }
      if (formData.value.webhook.secret?.trim()) {
        webhookOptions.secret = formData.value.webhook.secret.trim();
      }
      if (Object.keys(webhookOptions).length > 0) {
        payload.webhook = webhookOptions;
      }

      return payload;
    };

    /**
     * Initiates a crawl request using the configured form data.
     *
     * @returns {Promise<void>} Resolves when the crawl request finishes.
     */
    const startCrawl = async (): Promise<void> => {
      loading.value = true;
      error.value = '';
      currentJobId.value = '';
      try {
        const payload = buildPayload();
        const response = await postV2<{ jobId: string }>('crawl', payload);
        currentJobId.value = response.data.jobId;
        statusJobId.value = response.data.jobId;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to start crawl.';
      } finally {
        loading.value = false;
      }
    };

    /**
     * Copies the current job identifier to the clipboard.
     *
     * @returns {Promise<void>} Resolves once the copy operation completes.
     */
    const copyJobId = async (): Promise<void> => {
      if (!currentJobId.value) {
        return;
      }
      try {
        await navigator.clipboard.writeText(currentJobId.value);
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to copy job ID.';
      }
    };

    /**
     * Fetches the crawl status for the provided job identifier.
     *
     * @returns {Promise<void>} Resolves when the status request completes.
     */
    const fetchStatus = async (): Promise<void> => {
      if (!statusJobId.value.trim()) {
        statusError.value = 'Please provide a job ID.';
        return;
      }
      statusLoading.value = true;
      statusError.value = '';
      statusResult.value = null;
      try {
        const response = await getV2<CrawlStatusResponseV2>(
          `crawl/status/${statusJobId.value.trim()}`,
        );
        statusResult.value = response.data;
      } catch (err) {
        statusError.value = err instanceof Error ? err.message : 'Failed to fetch crawl status.';
      } finally {
        statusLoading.value = false;
      }
    };

    /**
     * Cancels the crawl job associated with the provided job identifier.
     *
     * @returns {Promise<void>} Resolves once the cancellation request completes.
     */
    const cancelCrawl = async (): Promise<void> => {
      if (!statusJobId.value.trim()) {
        statusError.value = 'Please provide a job ID to cancel.';
        return;
      }
      cancelLoading.value = true;
      statusError.value = '';
      try {
        await postV2('crawl/cancel', { jobId: statusJobId.value.trim() });
      } catch (err) {
        statusError.value = err instanceof Error ? err.message : 'Failed to cancel crawl.';
      } finally {
        cancelLoading.value = false;
      }
    };

    /**
     * Downloads the current crawl status as a JSON file.
     */
    const downloadStatus = (): void => {
      if (!statusResult.value) {
        return;
      }
      const blob = new Blob([JSON.stringify(statusResult.value, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'crawl-status-v2.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    return {
      formData,
      includesInput,
      excludesInput,
      loading,
      error,
      currentJobId,
      statusJobId,
      statusLoading,
      cancelLoading,
      statusError,
      statusResult,
      formattedStatus,
      startCrawl,
      copyJobId,
      fetchStatus,
      cancelCrawl,
      downloadStatus,
    };
  },
});
</script>

<style scoped>
@import '@/assets/main.css';

.crawl-view {
  max-width: 900px;
  margin: 0 auto;
}

.options-fieldset {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
  padding: 1rem;
  border-radius: 8px;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-check {
  margin-top: 2rem;
  border-top: 1px solid var(--color-border);
  padding-top: 1.5rem;
}

.status-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.status-form input {
  flex: 1 1 260px;
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
