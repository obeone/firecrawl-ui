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
 * Toggles the visibility of the sidebar menu on small screens.
 */
function toggleMenu(): void {
  isMenuOpen.value = !isMenuOpen.value;
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
    <button class="menu-button" @click="toggleMenu" aria-label="Toggle navigation">☰</button>
    <aside class="sidebar" :class="{ open: isMenuOpen }">
      <img alt="Firecrawl UI logo" class="logo" src="@/assets/logo.png" width="80" height="80" />
      <nav @click="isMenuOpen = false">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/scrape">Scrape</RouterLink>
        <RouterLink to="/crawl">Crawl</RouterLink>
        <RouterLink to="/extract">Extract</RouterLink>
        <RouterLink to="/map">Map</RouterLink>
        <RouterLink to="/search">Search</RouterLink>
        <RouterLink to="/api-config">API Config</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
      <button class="theme-toggle" @click="toggleTheme" aria-label="Toggle theme">
        {{ theme === 'dark' ? 'Light' : 'Dark' }} Mode
      </button>
    </aside>
    <main @click="isMenuOpen = false">
      <router-view />
    </main>
  </div>
</template>

<style>
/* Global styles for the #app element */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px; /* Fixed width */
  background-color: var(--color-background-soft); /* Soft background color */
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border); /* Right border */
}

.sidebar .logo {
  display: block;
  margin: 0 auto 2rem; /* Center logo and add bottom margin */
  width: 80px;
  height: 80px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* Spacing between navigation links */
}

.sidebar nav a {
  display: block;
  padding: 0.6rem 1rem;
  border-radius: 6px; /* Rounded corners for links */
  color: var(--color-text); /* Text color from CSS variable */
  text-decoration: none;
  font-weight: 500;
  transition:
    background-color 0.2s ease-in-out,
    color 0.2s ease-in-out;
}

.sidebar nav a:hover {
  background-color: var(--color-background-mute); /* Hover background color */
}

.sidebar nav a.router-link-exact-active {
  background-color: hsla(160, 100%, 37%, 0.2); /* Active link background */
  color: hsla(160, 100%, 37%, 1); /* Active link text color */
  font-weight: 600;
}

.theme-toggle {
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background-color: var(--color-background-soft);
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
}

.theme-toggle:hover {
  background-color: var(--color-background-mute);
}

.menu-button {
  display: none; /* Hidden by default on larger screens */
  background: none;
  border: none;
  font-size: 1.5rem;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--color-heading); /* Button color */
}

main {
  flex-grow: 1; /* Occupy remaining space */
  padding: 2rem; /* Inner padding for content */
  overflow-y: auto; /* Enable vertical scrolling for overflow */
  background-color: var(--color-background); /* Main content background */
}

/* Media queries for responsive layout */
/* @media (min-width: 1024px) { ... } - Removed old header specific styles */

@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }

  .menu-button {
    display: block;
    position: fixed; /* Keep the button at the top left */
    top: 1rem;
    left: 1rem;
    z-index: 1100;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 200px;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 1000;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  main {
    padding: 1rem;
  }
}
</style>
