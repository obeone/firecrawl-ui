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
      <h1 class="hero-title">Firecrawl <span class="accent">UI</span></h1>
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
  gap: 3rem;
  padding: 2rem 0 2rem;
}

/* ---------------------------------------------------------------------------
 * Hero — the showcase. Gradient-text title (sparingly, hero only), a glowing
 * glass logo mark, and aurora-accented CTAs.
 * ------------------------------------------------------------------------- */
.hero {
  text-align: center;
  padding-top: 1.5rem;
}

.hero-eyebrow {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--brand-strong);
  /* Glass chip with a hairline so it reads on the aurora. */
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid var(--glass-border);
  padding: 0.35rem 0.95rem;
  border-radius: var(--radius-pill);
  margin-bottom: 1.6rem;
}

.hero-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  margin: 0 auto 1.3rem;
  border-radius: var(--radius-xl);
  background: var(--gradient-aurora);
  /* Violet/cyan glow radiating from the mark — the hero's focal light. */
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12) inset,
    0 18px 50px -12px rgba(124, 92, 255, 0.7),
    0 8px 30px -8px rgba(24, 194, 221, 0.5);
}

.logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
}

.hero-title {
  font-size: clamp(2.4rem, 5vw, 3.4rem);
  font-weight: 800;
  letter-spacing: -0.035em;
  margin-bottom: 0.7rem;
}

/* Gradient text — only used on the hero accent to keep it special. */
.accent {
  background: var(--gradient-aurora);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

.subtitle {
  font-size: 1.08rem;
  color: var(--color-text-soft);
  max-width: 580px;
  margin: 0 auto;
}

.hero-cta {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.8rem;
  flex-wrap: wrap;
}

.cta {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid transparent;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.cta-primary {
  background: var(--gradient-violet);
  color: #fff;
  box-shadow: var(--box-shadow-button);
}

.cta-primary:hover {
  background: var(--gradient-violet-hover);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 12px 32px -8px rgba(124, 92, 255, 0.7);
}

/* Secondary CTA — frosted glass pill. */
.cta-secondary {
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  color: var(--color-heading);
  border-color: var(--glass-border);
}

.cta-secondary:hover {
  border-color: var(--violet-500);
  color: var(--brand-strong);
  background: var(--brand-soft);
}

/* ---------------------------------------------------------------------------
 * Launch grid — glass tool cards with hover-lift and a soft neon halo.
 * ------------------------------------------------------------------------- */
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
  padding: 1.2rem 1.3rem;
  /* Frosted card so the aurora glows softly through each tile. */
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
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
  /* Lift + soft violet halo on hover. */
  box-shadow:
    var(--box-shadow-container),
    0 0 0 1px rgba(124, 92, 255, 0.25),
    0 10px 36px -10px rgba(124, 92, 255, 0.5);
  transform: translateY(-4px);
  color: var(--color-text);
}

.tool-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand-strong);
  border: 1px solid rgba(124, 92, 255, 0.22);
  transition:
    background var(--transition),
    color var(--transition),
    box-shadow var(--transition);
}

.tool:hover .tool-icon {
  /* Icon tile lights up to the aurora gradient on hover. */
  background: var(--gradient-violet);
  color: #fff;
  box-shadow: 0 6px 20px -6px rgba(124, 92, 255, 0.7);
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

/* ---------------------------------------------------------------------------
 * Footer strip
 * ------------------------------------------------------------------------- */
.home-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
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
