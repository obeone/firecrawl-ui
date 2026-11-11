<template>
  <div class="page-container research-view">
    <h2>Deep Research</h2>
    <p class="intro">
      Run an AI-powered deep research job that crawls the web and synthesises a final analysis.
    </p>
    <DeprecationNotice path="/research" />

    <form class="research-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="query">Research Query:</label>
        <textarea
          id="query"
          v-model="query"
          rows="4"
          placeholder="What is the current state of quantum computing?"
          required
        ></textarea>
        <small>Describe the topic or question you want researched.</small>
      </div>

      <!-- Advanced options collapsible block -->
      <OptionsDisclosure v-model:collapsed="advancedCollapsed" title="Advanced Options">
        <div class="advanced-options">
          <div class="form-row">
            <div class="form-group">
              <label for="maxDepth">Max Depth (1–12):</label>
              <input id="maxDepth" v-model.number="maxDepth" type="number" min="1" max="12" />
              <small>How many research hops to perform.</small>
            </div>

            <div class="form-group">
              <label for="timeLimit">Time Limit (seconds, 30–600):</label>
              <input id="timeLimit" v-model.number="timeLimit" type="number" min="30" max="600" />
              <small>Maximum wall-clock time for the job.</small>
            </div>

            <div class="form-group">
              <label for="maxUrls">Max URLs (1–1000):</label>
              <input id="maxUrls" v-model.number="maxUrls" type="number" min="1" max="1000" />
              <small>Cap on total URLs visited.</small>
            </div>
          </div>

          <div class="form-group">
            <label for="analysisPrompt">Analysis Prompt (optional):</label>
            <textarea
              id="analysisPrompt"
              v-model="analysisPrompt"
              rows="3"
              placeholder="Focus the final analysis on practical applications."
            ></textarea>
            <small>Guide the synthesis step with a custom prompt.</small>
          </div>

          <div class="form-group">
            <label for="systemPrompt">System Prompt (optional):</label>
            <textarea
              id="systemPrompt"
              v-model="systemPrompt"
              rows="3"
              placeholder="You are an expert researcher. Be concise and cite sources."
            ></textarea>
            <small>Override the default system prompt used during research.</small>
          </div>

          <ChipMultiSelect
            v-model="selectedFormats"
            legend="Output Formats"
            :options="RESEARCH_FORMAT_OPTIONS"
            hint="Select one or more output formats."
          />
        </div>
      </OptionsDisclosure>

      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Starting…' : 'Start Deep Research' }}
      </button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- Progress while the research job is processing -->
    <div v-if="jobId && jobStatus === 'processing'" class="status-section">
      <h3>Research in Progress</h3>
      <p>Job ID: {{ jobId }}</p>
      <p class="progress-line">
        Depth {{ currentDepth }}/{{ maxDepthReported }} &middot; {{ totalUrls }} URLs visited
      </p>
      <!-- Explicit downgrade notice: self-hosted installs only serve the v1 endpoint -->
      <p v-if="apiVersion && apiVersion !== 'v2'" class="api-version-notice">
        Served by the <code>/{{ apiVersion }}</code> endpoint. This Firecrawl install does not
        expose <code>/v2</code> for this feature.
      </p>
      <!-- Deprecation notices the API itself returned, shown verbatim -->
      <ul v-if="apiWarnings.length" class="api-version-notice">
        <li v-for="(warning, index) in apiWarnings" :key="index">{{ warning }}</li>
      </ul>

      <div v-if="activities.length" class="activities">
        <h4>Live Activity</h4>
        <ul class="activity-list">
          <li v-for="(activity, index) in activitiesNewestFirst" :key="index" class="activity-item">
            <span class="activity-status" :class="activityClass(activity.status)">
              {{ activity.status ?? 'info' }}
            </span>
            <span class="activity-message">{{ activity.message }}</span>
            <span v-if="activity.timestamp" class="activity-timestamp">
              {{ formatTimestamp(activity.timestamp) }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- Failed state -->
    <div v-if="jobStatus === 'failed'" class="status-section">
      <h3>Research Failed</h3>
      <div class="error">
        {{ researchError ?? 'The research job encountered an unexpected error.' }}
      </div>
    </div>

    <!-- Cancelled on the server side -->
    <div v-if="jobStatus === 'cancelled'" class="status-section">
      <h3>Research Cancelled</h3>
    </div>

    <!-- Status request failed: the job itself may still be running -->
    <p v-if="jobStatus === 'unavailable' && jobId" class="api-version-notice">
      Status unavailable for job {{ jobId }}; it may still be running on the server.
    </p>

    <!-- Completed state: sources + final analysis -->
    <div v-if="jobStatus === 'completed'" class="results">
      <h3>Research Complete</h3>

      <div v-if="sources.length" class="sources-section">
        <h4>Sources ({{ sources.length }})</h4>
        <ul class="source-list">
          <li v-for="(source, index) in sources" :key="index" class="source-item">
            <img
              v-if="source.favicon"
              :src="source.favicon"
              alt=""
              class="source-favicon"
              aria-hidden="true"
            />
            <div class="source-body">
              <a
                v-if="source.url"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="source-title"
              >
                {{ source.title ?? source.url }}
              </a>
              <span v-else class="source-title">{{ source.title ?? 'Unknown source' }}</span>
              <p v-if="source.description" class="source-description">{{ source.description }}</p>
            </div>
          </li>
        </ul>
      </div>

      <div v-if="finalAnalysis" class="analysis-section">
        <h4>Final Analysis</h4>
        <pre class="analysis-content">{{ finalAnalysis }}</pre>
      </div>

      <div class="download-buttons">
        <button
          v-if="finalAnalysis"
          type="button"
          class="download-button"
          @click="downloadMarkdown"
        >
          Download Markdown
        </button>
        <button
          v-if="researchJson !== null"
          type="button"
          class="download-button"
          @click="downloadJson"
        >
          Download JSON
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useApi } from '@/plugins/api';
import { useJobPoller } from '@/composables/useJobPoller';
import { describeRequestError } from '@/utils/errors';
import { createLatestGuard, type IsCurrent } from '@/utils/latestGuard';
import { isTerminalStatus } from '@/utils/polling';
import DeprecationNotice from '@/components/DeprecationNotice.vue';
import OptionsDisclosure from '@/components/OptionsDisclosure.vue';
import ChipMultiSelect, { type ChipOption } from '@/components/ChipMultiSelect.vue';
import type {
  FirecrawlApiVersion,
  DeepResearchStatus,
  ResearchActivity,
  ResearchSource,
} from '@/services/firecrawl';

/**
 * ResearchView Component
 *
 * Lets the user submit a deep research query, polls the job status until
 * completion, and renders the final analysis and discovered sources with
 * download options.
 */

/**
 * Injects the API instance provided by the API plugin.
 */
const api = useApi();

// --- Form state ---

/** The main research question entered by the user. */
const query = ref('');
/** Whether the advanced options block is folded. */
const advancedCollapsed = ref(true);
/** Maximum research depth (1–12). */
const maxDepth = ref(7);
/** Time limit in seconds (30–600). */
const timeLimit = ref(300);
/** Maximum number of URLs to visit (1–1000). */
const maxUrls = ref(20);
/** Optional custom analysis prompt. */
const analysisPrompt = ref('');
/** Optional custom system prompt. */
const systemPrompt = ref('');
/** Output formats offered for a research job. */
const RESEARCH_FORMAT_OPTIONS: readonly ChipOption[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
];
/** Selected output formats. */
const selectedFormats = ref<string[]>(['markdown']);

// --- Async / job state ---

/** Whether a submission request is currently in flight. */
const loading = ref(false);
/** User-facing error message for submission failures. */
const error = ref('');

/** Identifier of the running research job, or null when idle. */
const jobId = ref<string | null>(null);
/**
 * Current job lifecycle status. `unavailable` means the status could not be
 * fetched; the job may still be running.
 */
const jobStatus = ref<DeepResearchStatus['status'] | 'unavailable' | null>(null);
/** Current crawl depth reported by the server. */
const currentDepth = ref(0);
/** Max depth as reported by the server status response. */
const maxDepthReported = ref(0);
/** Total URLs visited so far. */
const totalUrls = ref(0);
/** Live activity log from the server. */
const activities = ref<ResearchActivity[]>([]);
/** Discovered sources once the job completes. */
const sources = ref<ResearchSource[]>([]);
/** Final analysis text once the job completes. */
const finalAnalysis = ref('');
/** JSON result from the server, if any. */
const researchJson = ref<Record<string, unknown> | null>(null);
/** Error message reported by the server on failure. */
const researchError = ref<string | null>(null);
/** API version the connected Firecrawl instance actually served this job on. */
const apiVersion = ref<FirecrawlApiVersion | null>(null);
/** Deprecation notices returned by the API for this job. */
const apiWarnings = ref<string[]>([]);

/** Status poll loop; stops on its own when the view is destroyed. */
const poller = useJobPoller();
// Answers that arrive for a job the user has replaced are dropped.
const jobGuard = createLatestGuard();

// --- Computed ---

/**
 * Returns the activities list sorted newest-first for display.
 */
const activitiesNewestFirst = computed<ResearchActivity[]>(() => [...activities.value].reverse());

// --- Helpers ---

/**
 * Apply a server status response snapshot to the reactive state.
 *
 * @param data - The deep research status object returned by the API.
 */
function applyStatus(data: DeepResearchStatus): void {
  jobStatus.value = data.status;
  apiVersion.value = data.apiVersion;
  apiWarnings.value = data.warnings;
  currentDepth.value = data.currentDepth;
  maxDepthReported.value = data.maxDepth;
  totalUrls.value = data.totalUrls;
  activities.value = data.activities;

  if (data.status === 'completed') {
    sources.value = data.sources;
    finalAnalysis.value = data.finalAnalysis;
    researchJson.value = data.json;
  }

  if (data.status === 'failed') {
    researchError.value = data.error;
  }
}

/**
 * Poll the deep research status endpoint until the job settles.
 *
 * One request at a time; `completed`, `failed` and `cancelled` all end the
 * loop. A failed status request leaves the job `unavailable` rather than
 * `failed`, since the job itself may still be running server-side.
 *
 * @param id - The research job identifier.
 * @param isCurrent - Token of the submit that started this job.
 */
function pollStatus(id: string, isCurrent: IsCurrent): void {
  poller.start({
    request: async () => (await api.research.getDeepResearchStatus(id)).data,
    isSettled: (data) => isTerminalStatus(data.status),
    onUpdate: applyStatus,
    onError: (err: unknown) => {
      if (!isCurrent()) {
        return;
      }
      error.value = `Failed to fetch research status: ${describeRequestError(err)}`;
      jobStatus.value = 'unavailable';
    },
    intervalMs: 3000,
    jobId: id,
  });
}

/**
 * Build a CSS class name based on the activity status string for colour coding.
 *
 * @param status - The activity status value (may be undefined).
 * @returns A CSS class string.
 */
function activityClass(status: string | undefined): string {
  switch (status) {
    case 'completed':
      return 'status-completed';
    case 'failed':
      return 'status-failed';
    case 'processing':
      return 'status-processing';
    default:
      return 'status-info';
  }
}

/**
 * Format an ISO 8601 timestamp into a compact, locale-aware time string.
 *
 * @param timestamp - An ISO 8601 timestamp string.
 * @returns A short time string suitable for the activity list.
 */
function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

/**
 * Trigger a browser file download for the given content.
 *
 * @param content - The file content as a string.
 * @param filename - The suggested download filename.
 * @param mimeType - The MIME type of the file.
 */
function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Download the final analysis as a Markdown file.
 */
function downloadMarkdown(): void {
  triggerDownload(
    finalAnalysis.value,
    `deep-research-${jobId.value ?? 'result'}.md`,
    'text/markdown',
  );
}

/**
 * Download the JSON result as a JSON file.
 */
function downloadJson(): void {
  if (researchJson.value === null) {
    return;
  }
  triggerDownload(
    JSON.stringify(researchJson.value, null, 2),
    `deep-research-${jobId.value ?? 'result'}.json`,
    'application/json',
  );
}

/**
 * Submit the deep research job from the current form inputs and start polling.
 *
 * @returns {Promise<void>} Resolves once the job has been submitted.
 */
async function handleSubmit(): Promise<void> {
  if (!query.value.trim()) {
    error.value = 'Please enter a research query.';
    return;
  }
  if (selectedFormats.value.length === 0) {
    error.value = 'Please select at least one output format.';
    return;
  }

  // Any answer still pending for the previous job is now stale.
  const isCurrent = jobGuard.begin();
  poller.stop();
  loading.value = true;
  error.value = '';
  jobId.value = null;
  jobStatus.value = null;
  activities.value = [];
  sources.value = [];
  finalAnalysis.value = '';
  researchJson.value = null;
  researchError.value = null;

  const payload: Record<string, unknown> = {
    query: query.value.trim(),
    maxDepth: maxDepth.value,
    timeLimit: timeLimit.value,
    maxUrls: maxUrls.value,
    formats: selectedFormats.value,
    ...(analysisPrompt.value.trim() ? { analysisPrompt: analysisPrompt.value.trim() } : {}),
    ...(systemPrompt.value.trim() ? { systemPrompt: systemPrompt.value.trim() } : {}),
  };

  try {
    const response = await api.research.startDeepResearch(payload);
    if (!isCurrent()) {
      return;
    }
    jobId.value = response.data.id;
    apiVersion.value = response.data.apiVersion;
    jobStatus.value = 'processing';
    pollStatus(response.data.id, isCurrent);
  } catch (err: unknown) {
    if (isCurrent()) {
      error.value = err instanceof Error ? err.message : 'Failed to start deep research.';
    }
  } finally {
    if (isCurrent()) {
      loading.value = false;
    }
  }
}

// Ignore pending answers once the component is destroyed; the poller stops itself.
onUnmounted(() => {
  jobGuard.invalidate();
});
</script>

<style scoped>
.research-view {
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

.research-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* The flex gap already spaces the options group. */
  --disclosure-gap: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.form-row .form-group {
  flex: 1;
  min-width: 140px;
}

label {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

textarea,
select,
input[type='number'] {
  padding: 0.5rem;
  font-size: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-mute);
  color: var(--color-text);
}

.form-group small {
  font-size: 0.8em;
  color: var(--color-text);
  opacity: 0.7;
  margin-top: 3px;
}

.advanced-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.progress-line {
  font-weight: bold;
  color: #007acc;
}

.activities {
  margin-top: 1rem;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  background-color: var(--color-background-soft);
}

.activity-status {
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.7em;
  white-space: nowrap;
}

.status-completed {
  color: #4caf50;
}

.status-failed {
  color: #d9534f;
}

.status-processing {
  color: #007acc;
}

.status-info {
  color: var(--color-text);
  opacity: 0.7;
}

.activity-message {
  flex: 1;
}

.activity-timestamp {
  font-size: 0.75em;
  color: var(--color-text);
  opacity: 0.6;
  white-space: nowrap;
}

.results {
  margin-top: 1.5rem;
}

.sources-section {
  margin-bottom: 1.5rem;
}

.source-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.source-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.source-favicon {
  width: 16px;
  height: 16px;
  margin-top: 3px;
  flex-shrink: 0;
}

.source-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.source-title {
  font-weight: bold;
  color: #007acc;
  word-break: break-word;
}

a.source-title:hover {
  text-decoration: underline;
}

.source-description {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
  margin: 0;
}

.analysis-section {
  margin-bottom: 1rem;
}

.analysis-content {
  white-space: pre-wrap;
  word-break: break-word;
  background-color: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1rem;
  font-size: 0.9rem;
  line-height: 1.5;
  max-height: 500px;
  overflow-y: auto;
}

.download-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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

.api-version-notice {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-soft, #6b7280);
}

.api-version-notice code {
  font-family: inherit;
  font-weight: 600;
}
</style>
