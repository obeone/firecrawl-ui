<template>
  <div class="home">
    <section class="hero">
      <span class="hero-eyebrow">Web data toolkit</span>
      <div class="hero-mark">
        <img src="@/assets/logo.png" alt="Firecrawl UI Logo" class="logo" />
      </div>
      <h1>Firecrawl <span class="accent">UI</span></h1>
      <p class="subtitle">
        A modern interface for crawling, scraping and web data extraction.<br />
        Centralize, explore, and extract your data with ease.
      </p>
    </section>
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
    <section class="about">
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
    </section>
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
 * Root wrapper for the landing page. Centers content within a comfortable
 * reading width.
 */
.home {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1rem 0 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/*
 * Hero: branded introduction with an ember glow behind the logo mark.
 */
.hero {
  text-align: center;
  margin-bottom: 3rem;
  padding-top: 1.5rem;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand-strong);
  background: var(--brand-soft);
  padding: 0.3rem 0.85rem;
  border-radius: var(--radius-pill);
  margin-bottom: 1.5rem;
}

/* Logo sits on a glowing fire-gradient tile. */
.hero-mark {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  margin: 0 auto 1.25rem;
  border-radius: var(--radius-xl);
  background: var(--gradient-fire);
  box-shadow: 0 18px 48px -14px rgba(250, 77, 18, 0.6);
}

.logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
}

h1 {
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  font-weight: 800;
  margin-bottom: 0.75rem;
  letter-spacing: -0.03em;
}

/* Brand accent applied to the "UI" wordmark fragment. */
.accent {
  background: var(--gradient-fire);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.subtitle {
  font-size: 1.12rem;
  color: var(--color-text-soft);
  max-width: 540px;
  margin: 0 auto;
}

/*
 * Feature grid: responsive cards for each section of the app.
 */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.25rem;
  width: 100%;
  margin-bottom: 3rem;
}

/*
 * Feature card: raised surface that lifts and reveals an ember top edge on
 * hover.
 */
.feature-card {
  position: relative;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-card);
  padding: 1.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  transition:
    box-shadow var(--transition),
    transform var(--transition),
    border-color var(--transition);
  color: var(--color-text);
}

/* Fire accent line revealed across the top edge on hover. */
.feature-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: var(--gradient-fire);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--transition);
}

.feature-card:hover {
  box-shadow: var(--box-shadow-container);
  transform: translateY(-4px);
  border-color: var(--color-border-hover);
}

.feature-card:hover::before {
  transform: scaleX(1);
}

/* Icon badge tinted with the brand. */
.icon {
  width: 28px;
  height: 28px;
  margin-bottom: 1rem;
  padding: 0.55rem;
  box-sizing: content-box;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.feature-card h2 {
  font-size: 1.15rem;
  margin-bottom: 0.4rem;
  color: var(--color-heading);
  font-weight: 700;
}

.feature-card p {
  font-size: 0.95rem;
  color: var(--color-text-soft);
  margin-bottom: 1.4rem;
  text-align: left;
  flex-grow: 1;
}

/*
 * In-card navigation link styled as a quiet secondary action that warms to the
 * brand on hover.
 */
.feature-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-heading);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  margin-top: auto;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.feature-link::after {
  content: '→';
  transition: transform var(--transition-fast);
}

.feature-link:hover {
  background: var(--brand-soft);
  border-color: var(--ember-500);
  color: var(--brand-strong);
}

.feature-link:hover::after {
  transform: translateX(3px);
}

/*
 * About section: informational panel with a fire accent bar on the left.
 */
.about {
  position: relative;
  width: 100%;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--ember-500);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-card);
  padding: 2rem 2.25rem;
  color: var(--color-text);
  line-height: 1.7;
}

.about h2 {
  font-size: 1.4rem;
  color: var(--color-heading);
  margin-bottom: 0.7rem;
  font-weight: 700;
}

.about ul {
  margin: 1rem 0 1.5rem 1.25rem;
  padding: 0;
  list-style: none;
  color: var(--color-text);
  font-size: 1rem;
}

.about li {
  position: relative;
  margin: 0.55rem 0;
  padding-left: 1.4rem;
}

/* Ember bullet marker. */
.about li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6em;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: var(--gradient-fire);
}

.local-note {
  color: var(--color-text-soft);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

/*
 * "Documentation & Support" call to action with the fire gradient.
 */
.about-link {
  display: inline-flex;
  align-items: center;
  color: #fff;
  background: var(--gradient-fire);
  padding: 0.6rem 1.3rem;
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    transform var(--transition-fast);
}

.about-link:hover {
  background: var(--gradient-fire-hover);
  color: #fff;
  transform: translateY(-2px);
}
</style>
