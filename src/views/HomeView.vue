<template>
  <div class="page-container">
    <div class="hero">
      <img src="@/assets/logo.png" alt="Firecrawl UI Logo" class="logo" />
      <h1>Firecrawl UI</h1>
      <p class="subtitle">
        Modern platform for crawling, scraping and web data analysis.<br />
        Centralize, explore, and extract your data with ease.
      </p>
    </div>
    <div class="features">
      <div class="feature-card">
        <IconDocumentation class="icon" />
        <h2>Scrape</h2>
        <p>Extract structured data from any web page.</p>
        <router-link to="/scrape" class="feature-link">Access Scraping</router-link>
      </div>
      <div class="feature-card">
        <IconEcosystem class="icon" />
        <h2>Crawl</h2>
        <p>Explore websites in depth and collect data on a large scale.</p>
        <router-link to="/crawl" class="feature-link">Access Crawling</router-link>
      </div>
      <div class="feature-card">
        <IconTooling class="icon" />
        <h2>Extract</h2>
        <p>Extract content and metadata from URLs with advanced options.</p>
        <router-link to="/extract" class="feature-link">Access Extraction</router-link>
      </div>
      <div class="feature-card">
        <IconCommunity class="icon" />
        <h2>Map</h2>
        <p>Visualize and map the links and structures of a website.</p>
        <router-link to="/map" class="feature-link">Access Map</router-link>
      </div>
      <div class="feature-card">
        <IconSupport class="icon" />
        <h2>Search</h2>
        <p>Search and filter quickly in your crawl and scrape results.</p>
        <router-link to="/search" class="feature-link">Access Search</router-link>
      </div>
      <div class="feature-card">
        <IconSupport class="icon" />
        <h2>API Configuration</h2>
        <p>Configure your API keys and access points for custom workflows.</p>
        <router-link to="/api-config" class="feature-link">Configure API</router-link>
      </div>
    </div>
    <div class="about">
      <h2>About Firecrawl UI</h2>
      <p>
        Firecrawl UI is a modern and intuitive interface for web data extraction, crawling and
        analysis.<br />
        <strong>Main Features:</strong>
      </p>
      <ul>
        <li>Fast scraping and structured content extraction.</li>
        <li>Multi-level crawling with visualization of the site structure.</li>
        <li>Advanced search within collected results.</li>
        <li>Flexible API configuration and key management.</li>
        <li>Mapping interface to explore page relationships.</li>
      </ul>
      <p class="local-note">All features run locally; your data never leaves your machine.</p>
      <p>
        <a href="https://github.com/obeone/firecrawl-ui" target="_blank" class="about-link"
          >Documentation & Support</a
        >
      </p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
// Importing icons and components for a modern home page
import IconDocumentation from '@/components/icons/IconDocumentation.vue';
import IconEcosystem from '@/components/icons/IconEcosystem.vue';
import IconTooling from '@/components/icons/IconTooling.vue';
import IconCommunity from '@/components/icons/IconCommunity.vue';
import IconSupport from '@/components/icons/IconSupport.vue';

/**
 * @file HomeView.vue
 * @description This component serves as the main landing page for the Firecrawl UI application.
 * It provides an overview of the application's features, navigation links to different sections,
 * and general information about the project.
 *
 * @component HomeView
 * @example <HomeView />
 */
export default defineComponent({
  name: 'HomeView',
  components: {
    IconDocumentation,
    IconEcosystem,
    IconTooling,
    IconCommunity,
    IconSupport,
  },
});
</script>

<style scoped>
/*
 * Theme-independent design variables.
 */
:root {
  --primary: #2563eb;
  --primary-dark: #1e40af;
  --accent: #f59e42;
  --card-shadow: 0 2px 16px rgba(30, 64, 175, 0.07);
}

/*
 * Styles for the main container of the HomeView.
 * Centers content, sets padding, and defines background.
 */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-background);
  color: var(--color-text);
  min-height: 100vh;
}

/*
 * Styles for the hero section, including logo, main title, and subtitle.
 * Provides a prominent introduction to the application.
 */
.hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.logo {
  width: 90px;
  height: 90px;
  margin-bottom: 1rem;
}

h1 {
  font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif;
  font-size: 2.8rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  color: var(--primary);
  letter-spacing: -1px;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 0.5rem;
  font-family: 'Inter', Arial, sans-serif;
}

/*
 * Styles for the features section, displaying various application functionalities.
 * Uses flexbox for responsive layout of feature cards.
 */
.features {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 2.5rem;
}

/*
 * Styles for individual feature cards.
 * Includes background, shadow, padding, and hover effects for interactivity.
 */
.feature-card {
  background: var(--color-background-soft);
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  padding: 2rem 1.5rem 1.5rem 1.5rem;
  width: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  position: relative;
  color: var(--color-text);
}

.feature-card:hover {
  box-shadow: 0 6px 32px rgba(37, 99, 235, 0.13);
  transform: translateY(-4px) scale(1.03);
}

.icon {
  width: 38px;
  height: 38px;
  margin-bottom: 0.7rem;
  color: var(--primary);
}

.feature-card h2 {
  font-size: 1.18rem;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
  font-family: 'Montserrat', Arial, sans-serif;
  font-weight: 700;
}

.feature-card p {
  font-size: 1rem;
  color: var(--color-text);
  opacity: 0.8;
  margin-bottom: 1.2rem;
  text-align: center;
  min-height: 48px;
}

/*
 * Styles for navigation links within feature cards.
 * Defines button-like appearance and hover effects.
 */
.feature-link {
  color: #fff;
  background: var(--primary);
  padding: 0.5rem 1.2rem;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 600;
  font-family: 'Inter', Arial, sans-serif;
  font-size: 1rem;
  margin-top: auto;
  display: block;
  width: 100%;
  text-align: center;
  transition: background 0.2s;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.08);
}

.feature-link:hover {
  background: var(--primary-dark);
}

/*
 * Styles for the "About Firecrawl UI" section.
 * Features a gradient background, accent border, and clear text styling.
 */
.about {
  margin-top: 2.5rem;
  width: 100%;
  background: var(--color-background-soft);
  border-left: 4px solid var(--accent);
  border-radius: 10px;
  box-shadow: var(--card-shadow);
  padding: 2rem 2.5rem;
  color: var(--color-text);
  font-family: 'Inter', Arial, sans-serif;
  line-height: 1.6;
}

.about h2 {
  font-size: 1.5rem;
  color: var(--primary);
  margin-bottom: 0.7rem;
  font-family: 'Montserrat', Arial, sans-serif;
  font-weight: 700;
}

.about ul {
  margin: 1rem 0 1.5rem 1.5rem;
  padding: 0;
  list-style-type: square;
  color: var(--color-text);
  font-size: 1.05rem;
}

.about li {
  margin: 0.5rem 0;
}

.local-note {
  color: var(--color-text);
  opacity: 0.9;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

/*
 * Styles for the "Documentation & Support" link in the about section.
 * Applies a gradient background and hover effects.
 */
.about-link {
  color: var(--color-background);
  background: linear-gradient(90deg, var(--accent) 0%, #eab308 100%);
  padding: 0.5rem 1.2rem;
  border-radius: 5px;
  text-decoration: none;
  font-weight: 600;
  font-family: 'Inter', Arial, sans-serif;
  font-size: 1rem;
  transition: background 0.2s;
}

.about-link:hover {
  background: #d97706;
}
</style>
