<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const storedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = ref(storedTheme ?? (prefersDark ? 'dark' : 'light'));
document.documentElement.setAttribute('data-theme', theme.value);

watch(theme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

/**
 * A primary tool tab rendered in the top bar.
 *
 * @property to - Router path the tab points to.
 * @property label - Visible tab label.
 * @property paths - Lucide-style SVG path `d` strings for the tab icon.
 */
interface ToolTab {
  to: string;
  label: string;
  paths: string[];
}

/**
 * Top-bar tool tabs. These are the playground tools; secondary destinations
 * (API config, about) live as actions on the right of the bar.
 */
const tools: ToolTab[] = [
  {
    to: '/scrape',
    label: 'Scrape',
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M9 13h6',
      'M9 17h4',
    ],
  },
  {
    to: '/crawl',
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
    to: '/extract',
    label: 'Extract',
    paths: [
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
      'M3.3 7 12 12l8.7-5',
      'M12 22V12',
    ],
  },
  {
    to: '/map',
    label: 'Map',
    paths: [
      'M9 4 3.5 6.2A1 1 0 0 0 3 7.1v12.2a1 1 0 0 0 1.4.9L9 18l6 3 5.1-2.2a1 1 0 0 0 .6-.9V5.7a1 1 0 0 0-1.4-.9L15 7z',
      'M9 4v14',
      'M15 7v14',
    ],
  },
  {
    to: '/search',
    label: 'Search',
    paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3'],
  },
];

/**
 * Switches between light and dark themes and persists the choice.
 */
function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <!-- Brand -->
        <RouterLink to="/" class="brand" aria-label="Firecrawl UI home">
          <span class="brand-mark">
            <img alt="" class="brand-logo" src="@/assets/logo.png" width="28" height="28" />
          </span>
          <span class="brand-name">Firecrawl</span>
          <span class="brand-tag">UI</span>
        </RouterLink>

        <!-- Tool tabs -->
        <nav class="tabs" aria-label="Tools">
          <RouterLink v-for="tool in tools" :key="tool.to" :to="tool.to" class="tab">
            <svg class="tab-icon" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
              <path v-for="(d, i) in tool.paths" :key="i" :d="d" />
            </svg>
            <span>{{ tool.label }}</span>
          </RouterLink>
        </nav>

        <!-- Actions -->
        <div class="actions">
          <RouterLink to="/api-config" class="icon-btn" aria-label="API configuration" title="API configuration">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
          </RouterLink>
          <RouterLink to="/about" class="icon-btn" aria-label="About" title="About">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </RouterLink>
          <button class="icon-btn" @click="toggleTheme" aria-label="Toggle color theme" title="Toggle theme">
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<style>
#app {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
}

/* ---------------------------------------------------------------------------
 * Top bar
 * ------------------------------------------------------------------------- */

.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--color-background-soft) 88%, transparent);
  backdrop-filter: saturate(140%) blur(10px);
  border-bottom: 1px solid var(--color-border);
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  height: 60px;
  padding: 0 1.25rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  color: var(--color-heading);
}

.brand:hover {
  color: var(--color-heading);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--gradient-fire);
  box-shadow: var(--box-shadow-button);
}

.brand-logo {
  width: 22px;
  height: 22px;
  object-fit: contain;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
}

.brand-name {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.brand-tag {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brand-strong);
  background: var(--brand-soft);
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-pill);
}

/* Tool tabs */
.tabs {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-sm);
  color: var(--color-text-soft);
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    background var(--transition-fast);
}

.tab-icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.8;
}

.tab:hover {
  color: var(--color-heading);
  background: var(--color-background-mute);
}

.tab.router-link-active {
  color: var(--brand-strong);
  background: var(--brand-soft);
}

.tab.router-link-active .tab-icon {
  opacity: 1;
}

/* Actions */
.actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: none;
  color: var(--color-text-soft);
  cursor: pointer;
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.icon-btn svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.icon-btn:hover {
  color: var(--color-heading);
  background: var(--color-background-mute);
}

.icon-btn.router-link-active {
  color: var(--brand-strong);
  background: var(--brand-soft);
}

/* ---------------------------------------------------------------------------
 * Main content
 * ------------------------------------------------------------------------- */

.app-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 1.75rem 1.5rem;
}

/* Stretch a direct child (playground / page) to fill the main area. */
.app-main > * {
  flex: 1;
  min-height: 0;
}

@media (max-width: 640px) {
  .topbar-inner {
    gap: 0.75rem;
    padding: 0 0.75rem;
  }

  .brand-name,
  .brand-tag {
    display: none;
  }

  .tab span {
    display: none;
  }

  .tab {
    padding: 0.5rem;
  }

  .app-main {
    padding: 1rem 0.85rem;
  }
}
</style>
