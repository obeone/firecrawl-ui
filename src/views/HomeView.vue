<script setup lang="ts">
/**
 * HomeView.vue
 *
 * The tool's home: a functional launcher, not a marketing page. Paste a URL,
 * pick an action (scrape / crawl / map / extract) and go straight into that
 * tool with the URL pre-filled via the `url` query param. A slim row of direct
 * tool links sits underneath for everything else (including search).
 */
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { getApiConfig } from '../config/api.js';

const router = useRouter();

/**
 * Whether Firecrawl access is configured. Either an API key (cloud) or a custom
 * API URL (a self-hosted install, which may not require a key) counts as
 * configured. The base URL always falls back to the public default, so the
 * unconfigured case is "no key AND still pointing at the default cloud URL".
 * When unconfigured, the launcher shows a setup notice and routes the action to
 * the config page instead of a tool that would only fail with a 401.
 */
const isConfigured = ref<boolean>(
  (() => {
    const cfg = getApiConfig();
    const hasKey = Boolean(cfg.apiKey?.trim());
    const hasCustomUrl = Boolean(cfg.basePath) && !cfg.basePath.includes('api.firecrawl.dev');
    return hasKey || hasCustomUrl;
  })(),
);

/**
 * A URL-based action reachable from the launcher.
 *
 * @property key - Action id, also the route segment it pushes to.
 * @property label - Visible label.
 * @property paths - Lucide-style SVG path `d` strings for the icon.
 */
interface LaunchAction {
  key: string;
  label: string;
  paths: string[];
}

/** URL-based actions offered by the launcher (search is query-based, kept aside). */
const actions: LaunchAction[] = [
  {
    key: 'scrape',
    label: 'Scrape',
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M9 13h6',
      'M9 17h4',
    ],
  },
  {
    key: 'crawl',
    label: 'Crawl',
    paths: [
      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
      'M3.6 9h16.8',
      'M3.6 15h16.8',
      'M12 3a13 13 0 0 1 0 18',
      'M12 3a13 13 0 0 0 0 18',
    ],
  },
  {
    key: 'map',
    label: 'Map',
    paths: [
      'M9 4 3.5 6.2A1 1 0 0 0 3 7.1v12.2a1 1 0 0 0 1.4.9L9 18l6 3 5.1-2.2a1 1 0 0 0 .6-.9V5.7a1 1 0 0 0-1.4-.9L15 7z',
      'M9 4v14',
      'M15 7v14',
    ],
  },
  {
    key: 'extract',
    label: 'Extract',
    paths: [
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
      'M3.3 7 12 12l8.7-5',
      'M12 22V12',
    ],
  },
];

/** Currently selected launcher action. */
const action = ref<string>('scrape');

/** The URL the user is about to act on. */
const url = ref<string>('');

/** A couple of example hosts to fill the field with one click. */
const examples = ['news.ycombinator.com', 'stripe.com', 'en.wikipedia.org'];

/**
 * Normalizes a user-entered URL by trimming it and prepending https:// when no
 * scheme is present.
 *
 * @param raw - The raw input value.
 * @returns A normalized absolute URL, or an empty string if input was blank.
 */
function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Launches the selected action with the entered URL, routing into the matching
 * tool with `?url=` so it lands pre-filled. No-op on empty input.
 */
function launch(): void {
  // Without any configuration every tool call would 401, so guide to setup first.
  if (!isConfigured.value) {
    router.push('/api-config');
    return;
  }
  const normalized = normalizeUrl(url.value);
  if (!normalized) return;
  router.push({ path: `/${action.value}`, query: { url: normalized } });
}

/**
 * Fills the URL field with an example host.
 *
 * @param host - The example host to insert.
 */
function useExample(host: string): void {
  url.value = host;
}

/** Tool routes that accept a URL, so their pills can carry the typed one. */
const urlTools = ['/scrape', '/crawl', '/extract', '/map'];

/**
 * Router target for a direct tool pill. Carries the currently typed URL when the
 * tool accepts one, so clicking a tool never silently drops the entered URL.
 *
 * @param path - The tool route path.
 * @returns A plain path, or a location with `?url=` when a URL is entered.
 */
function toolLink(path: string): string | { path: string; query: { url: string } } {
  const u = url.value.trim();
  if (u && urlTools.includes(path)) {
    return { path, query: { url: normalizeUrl(u) } };
  }
  return path;
}
</script>

<template>
  <div class="home">
    <!-- Accessible page title (the launcher is intentionally visually title-less) -->
    <h1 class="visually-hidden">Firecrawl UI</h1>

    <!-- Shown only when no API key is configured -->
    <RouterLink v-if="!isConfigured" to="/api-config" class="setup-notice">
      <span class="setup-icon">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      </span>
      <span class="setup-text">
        <strong>Firecrawl access not configured</strong>
        Add your API key, or an API URL for a self-hosted install, to start.
      </span>
      <span class="setup-cta">
        Configure
        <span aria-hidden="true">→</span>
      </span>
    </RouterLink>

    <div class="launcher">
      <!-- Action selector -->
      <div class="actions" role="group" aria-label="Action">
        <button
          v-for="a in actions"
          :key="a.key"
          type="button"
          class="action"
          :class="{ active: a.key === action }"
          :aria-pressed="a.key === action"
          @click="action = a.key"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path v-for="(d, i) in a.paths" :key="i" :d="d" />
          </svg>
          {{ a.label }}
        </button>
      </div>

      <!-- URL bar -->
      <form class="bar" @submit.prevent="launch">
        <svg class="bar-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
          <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
        </svg>
        <input
          v-model="url"
          type="text"
          class="bar-input"
          placeholder="Paste a URL, e.g. example.com"
          aria-label="URL"
          autofocus
          spellcheck="false"
          autocapitalize="off"
        />
        <button type="submit" class="bar-go" :disabled="!url.trim()">
          {{ actions.find((a) => a.key === action)?.label }}
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <!-- Examples -->
      <div class="examples">
        <span class="examples-label">try</span>
        <button
          v-for="host in examples"
          :key="host"
          type="button"
          class="example"
          @click="useExample(host)"
        >
          {{ host }}
        </button>
      </div>
    </div>

    <!-- Direct tool access -->
    <nav class="pills" aria-label="Open a tool">
      <RouterLink :to="toolLink('/scrape')" class="pill">Scrape</RouterLink>
      <RouterLink :to="toolLink('/crawl')" class="pill">Crawl</RouterLink>
      <RouterLink :to="toolLink('/extract')" class="pill">Extract</RouterLink>
      <RouterLink :to="toolLink('/map')" class="pill">Map</RouterLink>
      <RouterLink to="/search" class="pill">Search</RouterLink>
      <RouterLink to="/api-config" class="pill pill-muted">API key</RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.home {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem 0;
}

/* Visually hidden but available to screen readers (carries the page h1). */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ---------------------------------------------------------------------------
 * Setup notice (no API key)
 * ------------------------------------------------------------------------- */
.setup-notice {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  padding: 0.85rem 1.1rem;
  border-radius: var(--radius-md);
  background: var(--hue-warning-soft);
  border: 1px solid color-mix(in srgb, var(--hue-warning) 45%, transparent);
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.setup-notice:hover {
  border-color: var(--hue-warning);
}

.setup-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--hue-warning);
}

.setup-icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.setup-text {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
  font-size: 0.9rem;
  color: var(--color-text-soft);
}

.setup-text strong {
  color: var(--color-heading);
  font-weight: 700;
}

.setup-cta {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--hue-warning);
}

/* ---------------------------------------------------------------------------
 * Launcher
 * ------------------------------------------------------------------------- */
.launcher {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

/* Action segmented control */
.actions {
  display: flex;
  gap: 0.25rem;
  padding: 0.3rem;
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.95rem;
  border: none;
  background: none;
  border-radius: var(--radius-pill);
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-soft);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}

.action svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
}

.action:hover {
  color: var(--color-heading);
}

.action.active {
  color: #fff;
  background: var(--gradient-violet);
  box-shadow: 0 6px 18px -8px rgba(124, 92, 255, 0.8);
}

.action.active svg {
  opacity: 1;
}

/* URL bar */
.bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.6rem 0.55rem 1rem;
  background: var(--glass-fill-strong, var(--glass-fill));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow:
    var(--box-shadow-card),
    0 0 0 1px rgba(124, 92, 255, 0.1),
    0 22px 60px -28px rgba(124, 92, 255, 0.55);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.bar:focus-within {
  border-color: var(--violet-500);
  box-shadow:
    var(--shadow-ring),
    0 22px 60px -28px rgba(124, 92, 255, 0.7);
}

.bar-icon {
  flex-shrink: 0;
  fill: none;
  stroke: var(--color-text-mute);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bar-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  padding: 0.5rem 0;
  font-size: 1.05rem;
  color: var(--color-heading);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

.bar-input:focus {
  outline: none;
  border: none;
  box-shadow: none;
}

.bar-input::placeholder {
  color: var(--color-text-mute);
}

.bar-go {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--gradient-violet);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    opacity var(--transition-fast);
}

.bar-go:hover:not(:disabled) {
  background: var(--gradient-violet-hover);
  transform: translateY(-1px);
}

.bar-go:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Examples */
.examples {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.examples-label {
  font-size: 0.8rem;
  color: var(--color-text-mute);
}

.example {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-soft);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--color-border-hover);
  padding: 0 0.1rem 0.05rem;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.example:hover {
  color: var(--brand-strong);
}

/* ---------------------------------------------------------------------------
 * Direct tool pills
 * ------------------------------------------------------------------------- */
.pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.pill {
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-pill);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-soft);
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid var(--glass-border);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.pill:hover {
  color: var(--brand-strong);
  border-color: var(--violet-500);
  background: var(--brand-soft);
}

.pill-muted {
  color: var(--color-text-mute);
}
</style>
