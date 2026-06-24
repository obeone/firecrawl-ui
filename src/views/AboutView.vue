<template>
  <div class="page-container about-view">
    <div class="hero">
      <h1>About Firecrawl UI</h1>
      <p class="tagline">A sleek interface for exploring the web, built with Vue and passion.</p>
    </div>
    <section>
      <h2>Our Mission</h2>
      <p>
        Firecrawl UI aims to simplify web data extraction by providing an intuitive experience
        powered by the Firecrawl API. Whether scraping a single page or crawling entire websites,
        the application brings powerful tools to your fingertips.
      </p>
    </section>
    <section>
      <h2>Capabilities</h2>
      <p>Firecrawl UI comes with a complete set of features:</p>
      <ul class="feature-list">
        <li>Scrape individual URLs for structured data.</li>
        <li>Crawl entire sites to explore and collect information.</li>
        <li>Extract rich content using Firecrawl's AI.</li>
        <li>Map URLs to visualize site architecture.</li>
        <li>Search your results to gain quick insights.</li>
        <li>Configure API keys and endpoints for custom workflows.</li>
      </ul>
    </section>
    <section>
      <h2>Get Involved</h2>
      <p>
        Contributions are welcome! Visit
        <a href="https://github.com/obeone/firecrawl-ui" target="_blank" rel="noopener noreferrer"
          >our GitHub repository</a
        >
        to report issues or submit improvements.
      </p>
    </section>
    <section>
      <h2>Thanks</h2>
      <p>We warmly thank Firecrawl for powering this project and its community.</p>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/**
 * @file src/views/AboutView.vue
 * @brief This component displays comprehensive information about the Firecrawl UI application.
 *
 * It outlines the project's mission, highlights its core capabilities (such as scraping, crawling,
 * AI extraction, URL mapping, and search), and provides guidance on how users can contribute.
 * The view is designed with a modern aesthetic to enhance readability and user engagement.
 */
export default defineComponent({
  name: 'AboutView',
});
</script>

<style scoped>
/* ---------------------------------------------------------------------------
 * AboutView — informational glass content page.
 *
 * Follows the same "frosted panel floating over the aurora" aesthetic as
 * HomeView: glass surfaces, violet/cyan accent, hover-lift on interactive
 * elements. The old animated fire gradient hero is replaced with a static
 * glass hero banner that shows the aurora shining through.
 * ------------------------------------------------------------------------- */

.about-view {
  text-align: center;
}

/* Hero banner — glass surface with the aurora gradient as a decorative fill
   instead of the old animated fire gradient. Gradient text for the title
   mirrors the HomeView .accent pattern (used sparingly, hero only). */
.hero {
  position: relative;
  /* Frosted glass so the page aurora glows through. */
  background: var(--glass-fill-strong);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 4rem 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}

/* Subtle aurora glow bleeding from the top — matches .page-container::before. */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--glow-aurora);
  pointer-events: none;
  z-index: 0;
}

/* Keep text content above the glow layer. */
.hero > * {
  position: relative;
  z-index: 1;
}

.hero h1 {
  /* Aurora gradient text — hero-only treatment matching HomeView .accent. */
  background: var(--gradient-aurora);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 0.75rem;
}

.tagline {
  font-size: 1.1rem;
  color: var(--color-text-soft);
}

/* Content sections. Each is a glass card with airy padding and a hover-lift
   matching the HomeView tool tiles (translateY + shadow on hover). */
section {
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-card);
  padding: 2rem 2.5rem;
  margin-bottom: 1.25rem;
  text-align: left;
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
}

section:hover {
  border-color: var(--color-border-hover);
  /* Lift + soft violet halo — same pattern as HomeView .tool:hover. */
  box-shadow:
    var(--box-shadow-container),
    0 0 0 1px rgba(124, 92, 255, 0.2),
    0 10px 36px -10px rgba(124, 92, 255, 0.4);
  transform: translateY(-3px);
}

section h2 {
  color: var(--brand-strong);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 0.6rem;
}

section p {
  color: var(--color-text);
  line-height: 1.7;
}

/* Links inherit the themed link color (violet in dark, deep violet in light). */
a {
  color: var(--color-link);
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--color-link-hover);
}

/* Capability bullet list — left-aligned, airy line height. */
.feature-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  color: var(--color-text);
}

/* Each item gets a violet accent bullet via ::before. */
.feature-list li {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  line-height: 1.6;
}

.feature-list li::before {
  content: '→';
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--brand-strong);
}
</style>
