<template>
  <div class="page-container history-view">
    <h2>History</h2>
    <p class="intro">
      Stored only in this browser. Only job metadata is kept: no API key, no scraped content.
    </p>

    <div v-if="entries.length > 0" class="toolbar">
      <button type="button" class="danger-button" @click="handleClear">Clear history</button>
    </div>

    <p v-if="entries.length === 0" class="empty">No jobs recorded yet.</p>

    <ul v-else class="entries">
      <li v-for="item in entries" :key="rowKey(item)" class="entry">
        <div class="entry-head">
          <span class="badge">{{ item.kind }}</span>
          <span class="source" :title="item.sourceUrl">{{ item.sourceUrl }}</span>
        </div>
        <div class="entry-meta">
          <span>{{ formatDate(item.createdAt) }}</span>
          <span>Status: {{ item.status || 'unknown' }}</span>
          <span>Results: {{ item.resultCount ?? 'n/a' }}</span>
          <code class="job-id">{{ item.id }}</code>
        </div>
        <p v-if="messages[rowKey(item)]" class="row-message">{{ messages[rowKey(item)] }}</p>
        <div class="entry-actions">
          <button
            v-if="item.kind !== 'map'"
            type="button"
            class="secondary-button"
            :disabled="checking[rowKey(item)]"
            @click="checkStatus(item)"
          >
            {{ checking[rowKey(item)] ? 'Checking…' : 'Check status' }}
          </button>
          <button type="button" class="secondary-button" @click="openEntry(item)">Open</button>
          <button type="button" class="secondary-button" @click="handleRemove(item)">Delete</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useApi } from '@/plugins/api';
import { FirecrawlApiError } from '@/utils/errors';
import {
  clearJobHistory,
  loadJobHistory,
  removeJob,
  updateJob,
  type JobHistoryEntry,
} from '@/utils/jobHistory';

/**
 * HistoryView Component
 *
 * Lists the locally recorded crawl, batch scrape and map jobs. Lets the user
 * re-check the server-side status of a job, reopen it, delete one entry or
 * clear everything. A failed status request never marks the job as failed.
 */

const api = useApi();
const router = useRouter();

/** Recorded jobs, newest first. */
const entries = ref<JobHistoryEntry[]>(loadJobHistory());
/** Per-row status-check message, keyed by {@link rowKey}. */
const messages = reactive<Record<string, string>>({});
/** Per-row in-flight flag, keyed by {@link rowKey}. */
const checking = reactive<Record<string, boolean>>({});

/**
 * Stable key for a row.
 *
 * @param item - History entry.
 * @returns `kind:id`.
 */
function rowKey(item: JobHistoryEntry): string {
  return `${item.kind}:${item.id}`;
}

/**
 * Format an ISO date for display.
 *
 * @param iso - ISO 8601 date text.
 * @returns A locale string, or the raw text when it is not a valid date.
 */
function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

/**
 * Tell whether an error means the job no longer exists server-side.
 *
 * @param err - The caught value.
 * @returns True for an HTTP 404.
 */
function isNotFound(err: unknown): boolean {
  return err instanceof FirecrawlApiError && err.status === 404;
}

/**
 * Re-check a job's status once and store it.
 *
 * @param item - Crawl or batch entry.
 */
async function checkStatus(item: JobHistoryEntry): Promise<void> {
  const key = rowKey(item);
  checking[key] = true;
  messages[key] = '';
  try {
    const response =
      item.kind === 'crawl'
        ? await api.crawling.getCrawlStatus(item.id)
        : await api.batchScraping.getBatchScrapeStatus(item.id);
    entries.value = updateJob(item.kind, item.id, {
      status: response.data.status,
      resultCount: response.data.completed,
    });
  } catch (err: unknown) {
    messages[key] = isNotFound(err) ? 'No longer available on the server' : 'Status unavailable';
  } finally {
    checking[key] = false;
  }
}

/**
 * Reopen a job in its tool.
 *
 * @param item - History entry.
 */
function openEntry(item: JobHistoryEntry): void {
  if (item.kind === 'map') {
    void router.push({ name: 'map', query: { url: item.sourceUrl } });
    return;
  }
  void router.push({
    name: item.kind === 'crawl' ? 'crawl' : 'batch-scrape',
    query: { job: item.id },
  });
}

/**
 * Delete one entry.
 *
 * @param item - History entry.
 */
function handleRemove(item: JobHistoryEntry): void {
  entries.value = removeJob(item.kind, item.id);
}

/**
 * Delete every entry after confirmation.
 */
function handleClear(): void {
  if (window.confirm('Clear the whole job history?')) {
    entries.value = clearJobHistory();
  }
}
</script>

<style scoped>
.history-view {
  max-width: 800px;
  margin: 1rem auto;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.intro {
  margin-bottom: 1rem;
  opacity: 0.8;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.empty {
  opacity: 0.7;
}

.entries {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.entry {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-soft);
}

.entry-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.badge {
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.source {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  font-size: 0.85rem;
  opacity: 0.85;
}

.job-id {
  word-break: break-all;
}

.row-message {
  margin: 0;
  font-size: 0.85rem;
}

.entry-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.secondary-button,
.danger-button {
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.danger-button {
  border-color: #c0392b;
  color: #c0392b;
}

.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
