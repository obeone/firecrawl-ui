<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const isMenuOpen = ref(false);

const storedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = ref(storedTheme ?? (prefersDark ? 'dark' : 'light'));
document.documentElement.setAttribute('data-theme', theme.value);

watch(theme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

/**
 * A single navigation entry rendered in the sidebar.
 *
 * @property to - Router path the link points to.
 * @property label - Human-readable label shown next to the icon.
 * @property paths - SVG path `d` strings composing the lucide-style icon.
 */
interface NavItem {
  to: string;
  label: string;
  paths: string[];
}

/**
 * Sidebar navigation model. Icons are stroke-based 24x24 lucide-style glyphs,
 * stored as raw path data so they render without an icon dependency.
 */
const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    paths: ['M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'],
  },
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
  {
    to: '/api-config',
    label: 'API Config',
    paths: [
      'M4 21v-7',
      'M4 10V3',
      'M12 21v-9',
      'M12 8V3',
      'M20 21v-5',
      'M20 12V3',
      'M2 14h4',
      'M10 8h4',
      'M18 16h4',
    ],
  },
  {
    to: '/about',
    label: 'About',
    paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 16v-4', 'M12 8h.01'],
  },
];

/**
 * Toggles the visibility of the sidebar drawer on small screens.
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
</script>

<template>
  <div class="app-layout" :class="{ 'menu-open': isMenuOpen }">
    <!-- Mobile top bar: hamburger toggle, only shown on narrow screens -->
    <button class="menu-button" @click="toggleMenu" aria-label="Toggle navigation">
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Dimmed backdrop behind the mobile drawer -->
    <div class="scrim" :class="{ visible: isMenuOpen }" @click="closeMenu" aria-hidden="true"></div>

    <aside class="sidebar" :class="{ open: isMenuOpen }">
      <!-- Brand block -->
      <RouterLink to="/" class="brand" @click="closeMenu">
        <span class="brand-mark">
          <img alt="" class="brand-logo" src="@/assets/logo.png" width="36" height="36" />
        </span>
        <span class="brand-text">
          <span class="brand-name">Firecrawl</span>
          <span class="brand-tag">UI</span>
        </span>
      </RouterLink>

      <!-- Primary navigation -->
      <nav class="nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          @click="closeMenu"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path v-for="(d, i) in item.paths" :key="i" :d="d" />
          </svg>
          <span class="nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <!-- Sidebar footer: theme switch + local-only note -->
      <div class="sidebar-footer">
        <button class="theme-toggle" @click="toggleTheme" aria-label="Toggle color theme">
          <svg
            v-if="theme === 'dark'"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
            />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
          <span>{{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}</span>
        </button>
        <p class="local-badge">
          <span class="dot"></span>
          Runs locally
        </p>
      </div>
    </aside>

    <main @click="closeMenu">
      <router-view />
    </main>
  </div>
</template>

<style>
/* App identity uses the shared sans stack from the token layer. */
#app {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

/* ---------------------------------------------------------------------------
 * Sidebar
 * ------------------------------------------------------------------------- */

.sidebar {
  position: sticky;
  top: 0;
  align-self: flex-start;
  width: 248px;
  height: 100vh;
  flex-shrink: 0;
  background-color: var(--color-background-soft);
  border-right: 1px solid var(--color-border);
  padding: 1.25rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Brand block: logo mark + wordmark. */
.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.4rem 0.5rem;
  border-radius: var(--radius-md);
  color: var(--color-heading);
  transition: background-color var(--transition-fast);
}

.brand:hover {
  background-color: var(--color-background-mute);
  color: var(--color-heading);
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--gradient-fire);
  box-shadow: var(--box-shadow-button);
}

.brand-logo {
  width: 30px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.25));
}

.brand-text {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.brand-name {
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--color-heading);
}

.brand-tag {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brand-strong);
  background: var(--brand-soft);
  padding: 0.12rem 0.4rem;
  border-radius: var(--radius-pill);
}

/* Navigation list. */
.nav {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex-grow: 1;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.62rem 0.75rem;
  border-radius: var(--radius-md);
  color: var(--color-text-soft);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.nav-icon {
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
}

.nav-link:hover {
  background-color: var(--color-background-mute);
  color: var(--color-heading);
}

/* Active route: ember accent bar + tinted background. */
.nav-link.router-link-exact-active {
  background: var(--brand-soft);
  color: var(--brand-strong);
  font-weight: 600;
  position: relative;
}

.nav-link.router-link-exact-active::before {
  content: '';
  position: absolute;
  left: -0.9rem;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: var(--radius-pill);
  background: var(--gradient-fire);
}

.nav-link.router-link-exact-active .nav-icon {
  opacity: 1;
}

/* Sidebar footer area. */
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background-color var(--transition-fast);
}

.theme-toggle svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: var(--brand-strong);
}

.theme-toggle:hover {
  border-color: var(--ember-500);
  color: var(--color-heading);
}

/* Local-only reassurance badge. */
.local-badge {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  color: var(--color-text-mute);
  padding: 0 0.25rem;
}

.local-badge .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hue-success);
  box-shadow: 0 0 0 3px var(--hue-success-soft);
}

/* ---------------------------------------------------------------------------
 * Main content
 * ------------------------------------------------------------------------- */

main {
  flex-grow: 1;
  min-width: 0;
  padding: 2rem;
  overflow-y: auto;
  background-color: var(--color-background);
}

/* ---------------------------------------------------------------------------
 * Mobile controls
 * ------------------------------------------------------------------------- */

.menu-button {
  display: none;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.45rem;
  cursor: pointer;
  color: var(--color-heading);
}

.menu-button svg {
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.scrim {
  display: none;
}

@media (max-width: 768px) {
  .menu-button {
    display: block;
    position: fixed;
    top: 0.85rem;
    left: 0.85rem;
    z-index: 1100;
    box-shadow: var(--box-shadow-card);
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 270px;
    transform: translateX(-100%);
    transition: transform var(--transition);
    z-index: 1200;
    box-shadow: var(--box-shadow-container);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .scrim {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition);
    z-index: 1150;
  }

  .scrim.visible {
    opacity: 1;
    pointer-events: auto;
  }

  main {
    padding: 4rem 1.1rem 1.5rem;
  }
}
</style>
