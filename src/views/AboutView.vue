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
.about-view {
  text-align: center;
}

.hero {
  background: linear-gradient(135deg, #2563eb 0%, #9333ea 50%, #4fc08d 100%);
  background-size: 400% 400%;
  animation: gradientFlow 15s ease infinite;
  padding: 4rem 2rem;
  border-radius: 16px;
  color: #fff;
  margin-bottom: 2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.tagline {
  font-size: 1.2rem;
  opacity: 0.9;
}

section {
  margin-bottom: 2rem;
}

section h2 {
  color: #2563eb;
  font-size: 1.6rem;
  margin-bottom: 0.5rem;
}

section p {
  color: #e0e0e0;
}

a {
  color: #4fc08d;
}

.feature-list {
  list-style: disc;
  margin: 0 auto 1rem auto;
  padding-left: 1.5rem;
  max-width: 600px;
  text-align: left;
}

.feature-list li {
  margin-bottom: 0.5rem;
}

@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
