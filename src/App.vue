<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

const isMenuOpen = ref(false);

/**
 * Toggle the sidebar visibility on small screens.
 */
function toggleMenu(): void {
  isMenuOpen.value = !isMenuOpen.value;
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
    </aside>
    <main @click="isMenuOpen = false">
      <router-view />
    </main>
  </div>
</template>

<style>
/* Removes old unnecessary global styles */
#app {
  /* Keeps fonts and antialiasing if necessary, but the structure is managed by app-layout */
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align and margin-top are removed because they are managed by the new layout */
  /* color is inherited or set in base.css */
}

.app-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px; /* Fixed width for the sidebar */
  background-color: var(--color-background-soft); /* Slightly different background color */
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border); /* Adds a thin border */
}

.sidebar .logo {
  display: block;
  margin: 0 auto 2rem; /* Centers the logo and adds spacing below */
  width: 80px; /* Adjusted size */
  height: 80px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem; /* Spacing between links */
}

.sidebar nav a {
  display: block; /* Ensures padding and background are applied correctly */
  padding: 0.6rem 1rem;
  border-radius: 6px; /* Rounded corners */
  color: var(--color-text); /* Use the CSS variable for text color */
  text-decoration: none;
  font-weight: 500; /* Slightly less bold than 'bold' */
  transition:
    background-color 0.2s ease-in-out,
    color 0.2s ease-in-out;
}

.sidebar nav a:hover {
  background-color: var(--color-background-mute); /* Light background on hover */
}

.sidebar nav a.router-link-exact-active {
  background-color: hsla(160, 100%, 37%, 0.2); /* Uses the existing accent color as background */
  color: hsla(160, 100%, 37%, 1); /* Accent color for the text */
  font-weight: 600; /* Slightly more pronounced for the active link */
}

.menu-button {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  padding: 0.5rem;
  cursor: pointer;
}

main {
  flex-grow: 1; /* Takes up all remaining space */
  padding: 2rem; /* Inner margin for content */
  overflow-y: auto; /* Adds a scrollbar if content overflows */
  background-color: var(--color-background); /* Main background */
}

/* Removes @media styles specific to the old header */
/* @media (min-width: 1024px) { ... } */

@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }

  .menu-button {
    display: block;
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
