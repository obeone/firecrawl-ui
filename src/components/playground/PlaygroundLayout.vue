<script setup lang="ts">
/**
 * PlaygroundLayout.vue
 *
 * Two-pane "API playground" shell shared by every tool view:
 *
 *   ┌ header (title + subtitle + optional #header-actions) ─────────────┐
 *   ├ REQUEST pane ───────────────┬ RESPONSE pane ──────────────────────┤
 *   │ <slot name="request">       │ tab bar (props.tabs) + #response-actions
 *   │  the form + submit button   │ ┌ content ──────────────────────────┐
 *   │                             │ │ empty / loading / error / #response │
 *   │                             │ └────────────────────────────────────┘
 *   │                             │ status bar (status • duration)        │
 *   └─────────────────────────────┴───────────────────────────────────────┘
 *
 * The view owns ALL logic: it keeps its request state in the #request slot
 * (including the submit button) and renders results in the #response slot,
 * switching on the `activeTab` slot prop. This component only provides chrome:
 * the split, the response tab bar, and the empty/loading/error/status states.
 *
 * Usage:
 *   <PlaygroundLayout
 *     title="Scrape" subtitle="Extract a single page"
 *     :tabs="[{ key: 'preview', label: 'Preview' }, { key: 'json', label: 'JSON' }]"
 *     :running="isLoading" :error="error" :has-result="!!result"
 *     :status="status" status-type="success" :duration="durationMs">
 *     <template #request> …form + submit… </template>
 *     <template #response="{ activeTab }">
 *       <div v-if="activeTab === 'preview'"> … </div>
 *       <CodeBlock v-else-if="activeTab === 'json'" :json="result" />
 *     </template>
 *   </PlaygroundLayout>
 */
import { computed, ref, watch } from 'vue';

/** A single response tab descriptor. */
interface ResponseTab {
  key: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    /** Tool title shown in the header. */
    title?: string;
    /** Short tool description under the title. */
    subtitle?: string;
    /** Response tabs. The first is active by default. */
    tabs?: ResponseTab[];
    /** True while a request is in flight — shows the loading state. */
    running?: boolean;
    /** Error message; when set, the response pane shows the error state. */
    error?: string | null;
    /** Whether a result exists (drives empty vs content). */
    hasResult?: boolean;
    /** Status label shown in the status bar (e.g. "Success", "200"). */
    status?: string | null;
    /** Status semantic, drives the status dot color. */
    statusType?: 'success' | 'error' | 'info' | 'idle';
    /** Request duration in milliseconds, shown in the status bar. */
    duration?: number | null;
    /** Placeholder text for the empty response state. */
    emptyHint?: string;
  }>(),
  {
    title: '',
    subtitle: '',
    tabs: () => [],
    running: false,
    error: null,
    hasResult: false,
    status: null,
    statusType: 'idle',
    duration: null,
    emptyHint: 'Run a request to see the response here.',
  },
);

/** Key of the currently active response tab. */
const activeTab = ref<string>(props.tabs[0]?.key ?? 'default');

// Keep the active tab valid if the tab set changes (e.g. async tab lists).
watch(
  () => props.tabs,
  (tabs) => {
    if (tabs.length && !tabs.some((t) => t.key === activeTab.value)) {
      activeTab.value = tabs[0].key;
    }
  },
  { deep: true },
);

/** Human-readable duration string for the status bar. */
const durationLabel = computed<string | null>(() => {
  if (props.duration == null) return null;
  if (props.duration < 1000) return `${Math.round(props.duration)} ms`;
  return `${(props.duration / 1000).toFixed(2)} s`;
});

/** Whether the response content area should show the empty placeholder. */
const showEmpty = computed<boolean>(
  () => !props.running && !props.error && !props.hasResult,
);

/**
 * Switches the active response tab.
 *
 * @param key - The tab key to activate.
 */
function selectTab(key: string): void {
  activeTab.value = key;
}
</script>

<template>
  <section class="playground">
    <!-- Header: title, subtitle, optional actions -->
    <header v-if="title || $slots['header-actions']" class="pg-header">
      <div class="pg-heading">
        <h1 v-if="title">{{ title }}</h1>
        <p v-if="subtitle" class="pg-subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots['header-actions']" class="pg-header-actions">
        <slot name="header-actions" />
      </div>
    </header>

    <div class="pg-split">
      <!-- REQUEST pane -->
      <div class="pg-pane pg-request">
        <div class="pg-pane-label">Request</div>
        <div class="pg-pane-body">
          <slot name="request" />
        </div>
      </div>

      <!-- RESPONSE pane -->
      <div class="pg-pane pg-response">
        <div class="pg-response-head">
          <div class="pg-tabs" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              role="tab"
              class="pg-tab"
              :class="{ active: tab.key === activeTab }"
              :aria-selected="tab.key === activeTab"
              @click="selectTab(tab.key)"
            >
              {{ tab.label }}
            </button>
          </div>
          <div v-if="$slots['response-actions']" class="pg-response-actions">
            <slot name="response-actions" :active-tab="activeTab" />
          </div>
        </div>

        <div class="pg-response-body">
          <!-- Loading -->
          <div v-if="running" class="pg-state">
            <span class="pg-spinner" aria-hidden="true"></span>
            <p>Running request…</p>
          </div>

          <!-- Error -->
          <div v-else-if="error" class="pg-state pg-state--error">
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <p class="pg-state-title">Request failed</p>
            <p class="pg-state-detail">{{ error }}</p>
          </div>

          <!-- Empty -->
          <div v-else-if="showEmpty" class="pg-state pg-state--empty">
            <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
              <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
              <path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
              <path d="M8 12h8M8 16h5" />
            </svg>
            <p>{{ emptyHint }}</p>
          </div>

          <!-- Result -->
          <div v-else class="pg-result">
            <slot name="response" :active-tab="activeTab" />
          </div>
        </div>

        <!-- Status bar -->
        <div class="pg-status" :class="`pg-status--${statusType}`">
          <span class="pg-status-dot" aria-hidden="true"></span>
          <span class="pg-status-text">{{
            running ? 'Running…' : (status ?? (error ? 'Error' : 'Idle'))
          }}</span>
          <span v-if="durationLabel && !running" class="pg-status-time">{{ durationLabel }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.playground {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 1300px;
  margin: 0 auto;
  height: 100%;
}

/* Header */
.pg-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.pg-heading h1 {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.pg-subtitle {
  color: var(--color-text-soft);
  font-size: 0.95rem;
  margin-top: 0.2rem;
}

.pg-header-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

/* Split */
.pg-split {
  display: grid;
  grid-template-columns: minmax(340px, 460px) 1fr;
  gap: 1.25rem;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.pg-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-card);
  overflow: hidden;
}

.pg-pane-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-mute);
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--color-border);
}

.pg-pane-body {
  padding: 1.25rem;
  overflow-y: auto;
  min-height: 0;
}

/* Response pane */
.pg-response {
  min-height: 480px;
}

.pg-response-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  padding-right: 0.75rem;
}

.pg-tabs {
  display: flex;
  align-items: stretch;
  gap: 0.15rem;
  overflow-x: auto;
}

.pg-tab {
  position: relative;
  background: none;
  border: none;
  padding: 0.85rem 0.95rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-mute);
  cursor: pointer;
  white-space: nowrap;
  transition: color var(--transition-fast);
}

.pg-tab:hover {
  color: var(--color-text);
}

.pg-tab.active {
  color: var(--brand-strong);
}

/* Active tab underline in the fire gradient. */
.pg-tab.active::after {
  content: '';
  position: absolute;
  left: 0.6rem;
  right: 0.6rem;
  bottom: -1px;
  height: 2px;
  border-radius: var(--radius-pill);
  background: var(--gradient-fire);
}

.pg-response-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.pg-response-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
}

.pg-result {
  flex: 1;
  min-height: 0;
  overflow: auto;
  width: 100%;
}

/* States (loading / error / empty) */
.pg-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  text-align: center;
  padding: 2rem;
  color: var(--color-text-mute);
  width: 100%;
}

.pg-state svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.75;
}

.pg-state--error {
  color: var(--hue-danger);
}

.pg-state-title {
  font-weight: 700;
  color: var(--color-heading);
}

.pg-state--error .pg-state-title {
  color: var(--hue-danger);
}

.pg-state-detail {
  font-size: 0.88rem;
  color: var(--color-text-soft);
  max-width: 460px;
  word-break: break-word;
}

/* Spinner */
.pg-spinner {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 3px solid var(--color-border);
  border-top-color: var(--ember-500);
  animation: pg-spin 0.7s linear infinite;
}

@keyframes pg-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pg-spinner {
    animation-duration: 1.6s;
  }
}

/* Status bar */
.pg-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-soft);
  background: var(--color-background-mute);
}

.pg-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-mute);
}

.pg-status--success .pg-status-dot {
  background: var(--hue-success);
  box-shadow: 0 0 0 3px var(--hue-success-soft);
}

.pg-status--error .pg-status-dot {
  background: var(--hue-danger);
  box-shadow: 0 0 0 3px var(--hue-danger-soft);
}

.pg-status--info .pg-status-dot {
  background: var(--hue-info);
  box-shadow: 0 0 0 3px var(--hue-info-soft);
}

.pg-status-time {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-mute);
}

/* Responsive: stack request above response. */
@media (max-width: 920px) {
  .pg-split {
    grid-template-columns: 1fr;
  }

  .pg-pane-body {
    max-height: none;
  }

  .pg-response {
    min-height: 420px;
  }
}
</style>
