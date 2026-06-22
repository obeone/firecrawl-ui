<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import CommandPalette from '@/components/CommandPalette.vue';
import { navItems } from '@/config/navigation';

const route = useRoute();

/** Whether the mobile navigation drawer is open. */
const isMenuOpen = ref(false);
/** Whether the ⌘K command palette is visible. */
const paletteOpen = ref(false);

const storedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = ref(storedTheme ?? (prefersDark ? 'dark' : 'light'));
document.documentElement.setAttribute('data-theme', theme.value);

watch(theme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

/**
 * Title of the current route, resolved from the shared navigation model.
 */
const currentTitle = computed<string>(() => {
  const match = navItems.find((item) => item.to === route.path);
  return match?.label ?? 'Firecrawl';
});

/**
 * Toggles the mobile navigation drawer.
 */
function toggleMenu(): void {
  isMenuOpen.value = !isMenuOpen.value;
}

/**
 * Closes the mobile navigation drawer.
 */
function closeMenu(): void {
  isMenuOpen.value = false;
}

/**
 * Switches between light and dark themes and persists the choice.
 */
function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

/**
 * Opens the command palette.
 */
function openPalette(): void {
  paletteOpen.value = true;
}

/**
 * Global shortcut handler: ⌘K / Ctrl+K toggles the command palette.
 *
 * @param event - The keyboard event from the document listener.
 */
function onGlobalKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    paletteOpen.value = !paletteOpen.value;
  }
}

onMounted(() => document.addEventListener('keydown', onGlobalKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKeydown));
</script>

<template>
  <div class="app-shell">
    <!-- Dimmed backdrop behind the mobile rail drawer -->
    <div class="scrim" :class="{ visible: isMenuOpen }" @click="closeMenu" aria-hidden="true"></div>

    <!-- Slim icon navigation rail -->
    <aside class="rail" :class="{ open: isMenuOpen }">
      <RouterLink to="/" class="rail-brand" @click="closeMenu" aria-label="Firecrawl UI home">
        <img alt="" class="rail-logo" src="@/assets/logo.png" width="30" height="30" />
      </RouterLink>

      <nav class="rail-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rail-link"
          :data-tip="item.label"
          @click="closeMenu"
        >
          <svg class="rail-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path v-for="(d, i) in item.paths" :key="i" :d="d" />
          </svg>
          <span class="rail-link-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="rail-footer">
        <button
          class="rail-link rail-action"
          :data-tip="theme === 'dark' ? 'Light mode' : 'Dark mode'"
          @click="toggleTheme"
          aria-label="Toggle color theme"
        >
          <svg
            v-if="theme === 'dark'"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>
      </div>
    </aside>

    <!-- Content column: top bar + routed view -->
    <div class="content">
      <header class="topbar">
        <button class="icon-btn topbar-menu" @click="toggleMenu" aria-label="Toggle navigation">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="topbar-title">
          <span class="topbar-crumb">Firecrawl</span>
          <span class="topbar-sep" aria-hidden="true">/</span>
          <span class="topbar-current">{{ currentTitle }}</span>
        </div>

        <button class="cmdk" @click="openPalette" aria-label="Open command palette">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span class="cmdk-label">Jump to…</span>
          <kbd class="cmdk-keys">⌘K</kbd>
        </button>
      </header>

      <main class="view" @click="closeMenu">
        <router-view />
      </main>
    </div>

    <CommandPalette v-model:open="paletteOpen" />
  </div>
</template>

<style>
/* App identity uses the shared sans stack from the token layer. */
#app {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

/* ---------------------------------------------------------------------------
 * Icon rail
 * ------------------------------------------------------------------------- */

.rail {
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
  width: 72px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 0;
  background-color: var(--color-background-soft);
  border-right: 1px solid var(--color-border);
  z-index: 900;
}

.rail-brand {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--gradient-fire);
  box-shadow: var(--box-shadow-button);
  margin-bottom: 0.5rem;
}

.rail-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
}

.rail-nav {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex-grow: 1;
}

.rail-footer {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border-top: 1px solid var(--color-border);
  padding-top: 0.6rem;
  width: 100%;
  align-items: center;
}

/* Rail link/button: icon tile with a hover tooltip. */
.rail-link {
  position: relative;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: var(--radius-md);
  color: var(--color-text-soft);
  border: none;
  background: transparent;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.rail-icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rail-action svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rail-link:hover {
  background-color: var(--color-background-mute);
  color: var(--color-heading);
}

.rail-link.router-link-exact-active {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

/* Ember active indicator on the inner edge. */
.rail-link.router-link-exact-active::after {
  content: '';
  position: absolute;
  left: -0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  border-radius: var(--radius-pill);
  background: var(--gradient-fire);
}

/* Label is hidden on desktop (icon-only) and revealed as a tooltip. */
.rail-link-label {
  display: none;
}

.rail-link[data-tip]::before {
  content: attr(data-tip);
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%) scale(0.96);
  transform-origin: left center;
  white-space: nowrap;
  background: var(--color-heading);
  color: var(--color-background);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.55rem;
  border-radius: var(--radius-sm);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--transition-fast),
    transform var(--transition-fast);
  z-index: 950;
}

.rail-link[data-tip]:hover::before {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}

/* ---------------------------------------------------------------------------
 * Content column
 * ------------------------------------------------------------------------- */

.content {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 800;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 60px;
  padding: 0 1.25rem;
  background-color: color-mix(in srgb, var(--color-background) 80%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-border);
}

.topbar-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.topbar-crumb {
  color: var(--color-text-mute);
}

.topbar-sep {
  color: var(--color-text-mute);
}

.topbar-current {
  font-weight: 700;
  color: var(--color-heading);
  letter-spacing: -0.01em;
}

/* ⌘K trigger button. */
.cmdk {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-left: auto;
  padding: 0.45rem 0.7rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-mute);
  font-size: 0.88rem;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.cmdk:hover {
  border-color: var(--color-border-hover);
  color: var(--color-text);
}

.cmdk svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cmdk-keys {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.08rem 0.35rem;
}

/* Generic icon button (mobile menu). */
.icon-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-heading);
  cursor: pointer;
}

.icon-btn svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.topbar-menu {
  display: none;
}

/* Routed view area. */
.view {
  flex-grow: 1;
  padding: 2rem;
  overflow-y: auto;
}

/* ---------------------------------------------------------------------------
 * Mobile
 * ------------------------------------------------------------------------- */

.scrim {
  display: none;
}

@media (max-width: 768px) {
  .topbar-menu {
    display: grid;
  }

  .cmdk-label {
    display: none;
  }

  .rail {
    position: fixed;
    top: 0;
    left: 0;
    transform: translateX(-100%);
    transition: transform var(--transition);
    box-shadow: var(--box-shadow-container);
  }

  .rail.open {
    transform: translateX(0);
  }

  /* On mobile the drawer is wide enough to show labels next to icons. */
  .rail {
    width: 220px;
    align-items: stretch;
    padding: 0.85rem 0.7rem;
  }

  .rail-brand {
    margin-left: 0.2rem;
  }

  .rail-link {
    width: 100%;
    grid-template-columns: 46px 1fr;
    display: grid;
    justify-items: start;
    align-items: center;
    padding-right: 0.5rem;
  }

  .rail-link .rail-icon {
    justify-self: center;
    grid-column: 1;
  }

  .rail-link-label {
    display: block;
    grid-column: 2;
    font-size: 0.92rem;
    font-weight: 500;
  }

  /* Tooltips are redundant when labels are visible. */
  .rail-link[data-tip]::before {
    display: none;
  }

  .rail-link.router-link-exact-active::after {
    display: none;
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition);
    z-index: 850;
  }

  .scrim.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .view {
    padding: 1.25rem 1.1rem;
  }
}
</style>
