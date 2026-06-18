<template>
  <div class="page-container llms-txt-view">
    <h2>LLMs.txt Generator</h2>
    <p class="intro">Generate an LLMs.txt (and optionally full-text) file from any website.</p>

    <form class="llms-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">URL:</label>
        <input id="url" v-model="url" type="url" placeholder="https://example.com" required />
        <small>The website URL to generate an LLMs.txt file for.</small>
      </div>

      <div class="form-group">
        <label for="maxUrls">Max URLs:</label>
        <input id="maxUrls" v-model.number="maxUrls" type="number" min="1" placeholder="2" />
        <small>Maximum number of URLs to include in the output.</small>
      </div>

      <label class="checkbox-label">
        <input type="checkbox" v-model="showFullText" />
        Generate full-text version (llms-full.txt)
      </label>

      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Submitting…' : 'Generate LLMs.txt' }}
      </button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>

    <!-- Status while the job is processing -->
    <div v-if="jobId && generationStatus === 'processing'" class="status-section">
      <p class="generating-status">Generating… (Job ID: {{ jobId }})</p>
    </div>

    <!-- Failed state -->
    <div v-if="generationStatus === 'failed'" class="error">
      Generation failed. Please try again.
    </div>

    <!-- Results once the job completes -->
    <div v-if="generationStatus === 'completed'" class="results">
      <div class="result-block">
        <div class="result-header">
          <h3>llms.txt</h3>
          <button class="download-button" type="button" @click="downloadLlmsTxt">
            Download llms.txt
          </button>
        </div>
        <pre class="result-pre">{{ llmstxt }}</pre>
      </div>

      <div v-if="llmsfulltxt" class="result-block">
        <div class="result-header">
          <h3>
            <button
              class="collapsible-toggle"
              type="button"
              @click="fullTextExpanded = !fullTextExpanded"
            >
              {{ fullTextExpanded ? '▾' : '▸' }} llms-full.txt
            </button>
          </h3>
          <button class="download-button" type="button" @click="downloadLlmsFullTxt">
            Download llms-full.txt
          </button>
        </div>
        <pre v-if="fullTextExpanded" class="result-pre">{{ llmsfulltxt }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onUnmounted } from 'vue';
import type { FirecrawlLlmsTxtApi, LlmsTxtStatus } from '@/services/firecrawl';

/**
 * LlmsTxtView Component
 *
 * Lets the user submit a URL to generate an LLMs.txt (and optionally a
 * full-text) file via the Firecrawl API, polls the job status until
 * completion, and renders the results with download buttons.
 */

/**
 * Injects the API instance provided by the API plugin.
 * @type {{ llmsTxt?: FirecrawlLlmsTxtApi } | undefined}
 */
const api = inject('api') as { llmsTxt?: FirecrawlLlmsTxtApi } | undefined;
if (!api?.llmsTxt) {
  throw new Error('LLMs.txt API is not available. Ensure the API plugin is correctly configured.');
}

/** The website URL to generate the LLMs.txt for. */
const url = ref('');
/** Maximum number of URLs to include in the output. */
const maxUrls = ref<number>(2);
/** Whether to also generate the full-text version. */
const showFullText = ref(false);

/** Whether a submission request is currently in flight. */
const loading = ref(false);
/** User-facing error message. */
const error = ref('');

/** Identifier of the running generation job, or null when idle. */
const jobId = ref<string | null>(null);
/** Current job status, or null when no job has been started. */
const generationStatus = ref<LlmsTxtStatus['status'] | null>(null);
/** Generated llms.txt content. */
const llmstxt = ref('');
/** Generated llms-full.txt content, empty when not requested or unavailable. */
const llmsfulltxt = ref('');
/** Whether the collapsible full-text block is expanded. */
const fullTextExpanded = ref(false);

/** Polling interval handle. */
let intervalId: ReturnType<typeof setInterval> | null = null;

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
 * Poll the LLMs.txt status endpoint until the job completes or fails.
 *
 * @param id - The generation job identifier.
 */
function pollStatus(id: string): void {
  stopPolling();
  intervalId = setInterval(async () => {
    try {
      const response = await api.llmsTxt!.getLlmsTxtStatus(id);
      const data = response.data;
      generationStatus.value = data.status;

      if (data.status === 'completed') {
        llmstxt.value = data.llmstxt;
        llmsfulltxt.value = data.llmsfulltxt;
        stopPolling();
      } else if (data.status === 'failed') {
        stopPolling();
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch generation status.';
      generationStatus.value = 'failed';
      stopPolling();
    }
  }, 3000);
}

/**
 * Submit the LLMs.txt generation job from the current form inputs and start polling.
 *
 * @returns {Promise<void>} Resolves once the job has been submitted.
 */
async function handleSubmit(): Promise<void> {
  if (!url.value) {
    error.value = 'Please enter a URL.';
    return;
  }

  loading.value = true;
  error.value = '';
  jobId.value = null;
  generationStatus.value = null;
  llmstxt.value = '';
  llmsfulltxt.value = '';
  fullTextExpanded.value = false;

  try {
    const response = await api.llmsTxt!.generateLlmsTxt({
      url: url.value,
      maxUrls: maxUrls.value,
      showFullText: showFullText.value,
    });
    jobId.value = response.data.id;
    generationStatus.value = 'processing';
    pollStatus(response.data.id);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Failed to start LLMs.txt generation.';
  } finally {
    loading.value = false;
  }
}

/**
 * Trigger a browser download of the generated llms.txt content.
 */
function downloadLlmsTxt(): void {
  const blob = new Blob([llmstxt.value], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'llms.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Trigger a browser download of the generated llms-full.txt content.
 */
function downloadLlmsFullTxt(): void {
  const blob = new Blob([llmsfulltxt.value], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'llms-full.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Clean up the polling loop when the component is destroyed.
onUnmounted(stopPolling);
</script>

<style scoped>
.llms-txt-view {
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

.llms-form {
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

input[type='url'],
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

.generating-status {
  font-style: italic;
  color: var(--color-text);
  opacity: 0.7;
}

.results {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.result-block {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.result-header h3 {
  margin: 0;
  font-size: 1rem;
}

.result-pre {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  padding: 1rem;
  margin: 0;
  font-size: 0.85rem;
  background-color: var(--color-background-mute);
  color: var(--color-text);
  font-family: monospace;
}

.collapsible-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  padding: 0;
  color: inherit;
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
