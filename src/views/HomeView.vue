<script setup lang="ts">
/**
 * HomeView.vue
 *
 * Console landing for the Firecrawl UI playground. Presents a compact hero and
 * a quick-launch grid of the available tools, each opening its request/response
 * playground. Mirrors the top-bar tabs for a coherent navigation model.
 */
import { RouterLink } from 'vue-router';

/**
 * A quick-launch tool card.
 *
 * @property to - Router path the card opens.
 * @property label - Tool name.
 * @property desc - One-line description of what the tool does.
 * @property paths - Lucide-style SVG path `d` strings for the icon (match the tabs).
 */
interface ToolCard {
  to: string;
  label: string;
  desc: string;
  paths: string[];
}

/** Tools surfaced on the landing, in the same order as the top-bar tabs. */
const tools: ToolCard[] = [
  {
    to: '/scrape',
    label: 'Scrape',
    desc: 'Extract clean content from a single page as markdown, HTML or structured data.',
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
    desc: 'Traverse a whole site, follow links in depth and collect pages at scale.',
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
    desc: 'Pull structured fields from URLs with a prompt or schema, powered by AI.',
    paths: [
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
      'M3.3 7 12 12l8.7-5',
      'M12 22V12',
    ],
  },
  {
    to: '/map',
    label: 'Map',
    desc: 'List every reachable URL of a website to understand its structure fast.',
    paths: [
      'M9 4 3.5 6.2A1 1 0 0 0 3 7.1v12.2a1 1 0 0 0 1.4.9L9 18l6 3 5.1-2.2a1 1 0 0 0 .6-.9V5.7a1 1 0 0 0-1.4-.9L15 7z',
      'M9 4v14',
      'M15 7v14',
    ],
  },
  {
    to: '/search',
    label: 'Search',
    desc: 'Query the web and get ranked results with optional page content.',
    paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3'],
  },
];
</script>

<template>
  <div class="home">
    <!-- Hero -->
    <section class="hero">
      <span class="hero-eyebrow">Web data playground</span>
      <div class="hero-mark">
        <img src="@/assets/logo.png" alt="Firecrawl UI Logo" class="logo" />
      </div>
      <h1>Firecrawl <span class="accent">UI</span></h1>
      <p class="subtitle">
        A request/response playground for the Firecrawl API. Build a call on the left, read the
        response on the right. Everything runs locally.
      </p>
      <div class="hero-cta">
        <RouterLink to="/scrape" class="cta cta-primary">Start scraping</RouterLink>
        <RouterLink to="/api-config" class="cta cta-secondary">Configure API key</RouterLink>
      </div>
    </section>

    <!-- Quick-launch tool grid -->
    <section class="launch">
      <h2 class="launch-title">Tools</h2>
      <div class="grid">
        <RouterLink v-for="tool in tools" :key="tool.to" :to="tool.to" class="tool">
          <span class="tool-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path v-for="(d, i) in tool.paths" :key="i" :d="d" />
            </svg>
          </span>
          <span class="tool-body">
            <span class="tool-name">{{ tool.label }}</span>
            <span class="tool-desc">{{ tool.desc }}</span>
          </span>
          <span class="tool-arrow" aria-hidden="true">→</span>
        </RouterLink>
      </div>
    </section>

    <!-- Footer strip -->
    <footer class="home-foot">
      <p class="local">
        <span class="dot"></span>
        Local-only — your API key and data never leave this browser.
      </p>
      <a
        href="https://github.com/obeone/firecrawl-ui"
        target="_blank"
        rel="noopener noreferrer"
        class="repo"
      >
        Documentation &amp; source
        <span aria-hidden="true">↗</span>
      </a>
    </footer>
  </div>
</template>

<style scoped>
.home {
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 1rem 0 2rem;
}

/* Hero */
.hero {
  text-align: center;
  padding-top: 1rem;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand-strong);
  background: var(--brand-soft);
  padding: 0.3rem 0.85rem;
  border-radius: var(--radius-pill);
  margin-bottom: 1.5rem;
}

.hero-mark {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 0 auto 1.1rem;
  border-radius: var(--radius-xl);
  background: var(--gradient-fire);
  box-shadow: 0 18px 44px -16px rgba(250, 77, 18, 0.6);
}

.logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3));
}

h1 {
  font-size: clamp(2.2rem, 4.5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 0.6rem;
}

.accent {
  background: var(--gradient-fire);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.subtitle {
  font-size: 1.05rem;
  color: var(--color-text-soft);
  max-width: 560px;
  margin: 0 auto;
}

.hero-cta {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.6rem;
  flex-wrap: wrap;
}

.cta {
  display: inline-flex;
  align-items: center;
  padding: 0.7rem 1.4rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid transparent;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.cta-primary {
  background: var(--gradient-fire);
  color: #fff;
  box-shadow: var(--box-shadow-button);
}

.cta-primary:hover {
  background: var(--gradient-fire-hover);
  color: #fff;
  transform: translateY(-2px);
}

.cta-secondary {
  background: var(--color-background-soft);
  color: var(--color-heading);
  border-color: var(--color-border);
}

.cta-secondary:hover {
  border-color: var(--ember-500);
  color: var(--brand-strong);
  background: var(--brand-soft);
}

/* Launch grid */
.launch-title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-mute);
  margin-bottom: 1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.tool {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.2rem;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-card);
  color: var(--color-text);
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
}

.tool:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--box-shadow-container);
  transform: translateY(-3px);
  color: var(--color-text);
}

.tool-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.tool-icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tool-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.tool-name {
  font-weight: 700;
  color: var(--color-heading);
}

.tool-desc {
  font-size: 0.88rem;
  color: var(--color-text-soft);
  line-height: 1.45;
}

.tool-arrow {
  margin-left: auto;
  color: var(--color-text-mute);
  font-size: 1.1rem;
  transition:
    transform var(--transition-fast),
    color var(--transition-fast);
}

.tool:hover .tool-arrow {
  color: var(--brand-strong);
  transform: translateX(4px);
}

/* Footer strip */
.home-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.local {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-mute);
}

.local .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--hue-success);
  box-shadow: 0 0 0 3px var(--hue-success-soft);
}

.repo {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.88rem;
  font-weight: 600;
}
</style>
