<script setup lang="ts">
/**
 * AboutView.vue
 *
 * Informational page for Firecrawl UI. Presents the project, what each tool
 * does (as an icon card grid matching the HomeView launcher language), and
 * links out to Firecrawl, its docs, and the GitHub repository.
 */

/**
 * A product capability rendered as an icon card.
 *
 * @property title - Short capability name (matches the tool where relevant).
 * @property desc - One-line description of what it does.
 * @property paths - Lucide-style SVG path `d` strings for the icon.
 */
interface Capability {
  title: string;
  desc: string;
  paths: string[];
}

/** Capabilities shown as a card grid. Icons mirror the HomeView launcher. */
const capabilities: Capability[] = [
  {
    title: 'Scrape',
    desc: 'Turn a single page into markdown, HTML, links, a screenshot, or structured JSON extracted by an LLM.',
    paths: [
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      'M14 2v6h6',
      'M9 13h6',
      'M9 17h4',
    ],
  },
  {
    title: 'Crawl',
    desc: 'Follow a whole site and collect every page, with live progress and one-click bulk export.',
    paths: [
      'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
      'M3.6 9h16.8',
      'M3.6 15h16.8',
      'M12 3a13 13 0 0 1 0 18',
      'M12 3a13 13 0 0 0 0 18',
    ],
  },
  {
    title: 'Map',
    desc: "Discover a site's URLs to see its architecture before you crawl.",
    paths: [
      'M9 4 3.5 6.2A1 1 0 0 0 3 7.1v12.2a1 1 0 0 0 1.4.9L9 18l6 3 5.1-2.2a1 1 0 0 0 .6-.9V5.7a1 1 0 0 0-1.4-.9L15 7z',
      'M9 4v14',
      'M15 7v14',
    ],
  },
  {
    title: 'Extract',
    desc: "Pull structured data across many URLs. The legacy /v2/extract endpoint is deprecated; prefer Scrape's JSON format.",
    paths: [
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
      'M3.3 7 12 12l8.7-5',
      'M12 22V12',
    ],
  },
  {
    title: 'Search',
    desc: 'Query the web and get full-page content back, not just links.',
    paths: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.35-4.35'],
  },
  {
    title: 'Configure',
    desc: 'Point at the Firecrawl cloud or a self-hosted instance with your own API key.',
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
];

/**
 * An outbound resource link.
 *
 * @property label - Visible link label.
 * @property desc - Short context for the destination.
 * @property href - Absolute URL.
 */
interface ExternalLink {
  label: string;
  desc: string;
  href: string;
}

/** Outbound links: Firecrawl, its docs, and the project repository. */
const links: ExternalLink[] = [
  {
    label: 'Firecrawl',
    desc: 'The API and engine that power this UI',
    href: 'https://www.firecrawl.dev',
  },
  {
    label: 'API documentation',
    desc: 'Endpoints, options, and guides',
    href: 'https://docs.firecrawl.dev',
  },
  {
    label: 'GitHub repository',
    desc: 'Source, issues, and contributions',
    href: 'https://github.com/obeone/firecrawl-ui',
  },
];
</script>

<template>
  <div class="about-view">
    <!-- Hero: gradient title, tagline, and the primary outbound CTAs.
         A <div> (not <header>) so the app's global header/nav styles don't apply. -->
    <div class="hero">
      <h1>Firecrawl UI</h1>
      <p class="tagline">
        A fast, self-hostable interface for the Firecrawl API. Scrape, crawl, map, and extract the
        web from one place.
      </p>
      <div class="hero-actions">
        <a
          class="btn btn-primary"
          href="https://www.firecrawl.dev"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit Firecrawl
          <span aria-hidden="true">→</span>
        </a>
        <a
          class="btn btn-ghost"
          href="https://github.com/obeone/firecrawl-ui"
          target="_blank"
          rel="noopener noreferrer"
        >
          View on GitHub
        </a>
      </div>
    </div>

    <!-- Mission: one short paragraph, no filler. -->
    <section class="prose">
      <h2>Our mission</h2>
      <p>
        Firecrawl UI makes web data extraction approachable: paste a URL, pick a tool, and get
        clean, structured results. Everything runs on the Firecrawl API, against the cloud or your
        own self-hosted instance.
      </p>
    </section>

    <!-- Capabilities: icon card grid mirroring the HomeView launcher. -->
    <section class="capabilities">
      <h2>What you can do</h2>
      <div class="cap-grid">
        <article v-for="c in capabilities" :key="c.title" class="cap-card">
          <span class="cap-icon">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path v-for="(d, i) in c.paths" :key="i" :d="d" />
            </svg>
          </span>
          <h3>{{ c.title }}</h3>
          <p>{{ c.desc }}</p>
        </article>
      </div>
    </section>

    <!-- Powered by Firecrawl: credit + outbound resource links. -->
    <section class="links">
      <h2>Powered by Firecrawl</h2>
      <p class="links-lead">
        This project is a UI on top of Firecrawl. Warm thanks to Firecrawl and its community for the
        API and the open-source engine.
      </p>
      <div class="link-grid">
        <a
          v-for="l in links"
          :key="l.href"
          class="link-card"
          :href="l.href"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="link-label">
            {{ l.label }}
            <span aria-hidden="true">↗</span>
          </span>
          <span class="link-desc">{{ l.desc }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------------------------------------------------------------------------
 * AboutView — frosted glass content over the aurora, matching HomeView.
 * Icon cards, gradient hero, hover-lift on every interactive surface.
 * ------------------------------------------------------------------------- */

.about-view {
  /* Opt out of the .app-main > * flex:1 stretch so the page sizes to its
     content and .app-main handles the scroll (otherwise flex-shrink squashes
     tall content and the hero, which clips its overflow). */
  flex: none;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
}

/* ---------------------------------------------------------------------------
 * Hero — glass banner with aurora gradient title and outbound CTAs.
 * ------------------------------------------------------------------------- */
.hero {
  position: relative;
  text-align: center;
  background: var(--glass-fill-strong);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: 3.5rem 2rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--glass-shadow);
  overflow: hidden;
}

/* Aurora glow bleeding from the top, same as .page-container::before. */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--glow-aurora);
  pointer-events: none;
  z-index: 0;
}

.hero > * {
  position: relative;
  z-index: 1;
}

.hero h1 {
  /* Aurora gradient text, hero-only treatment. */
  background: var(--gradient-aurora);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  margin-bottom: 0.75rem;
}

.tagline {
  max-width: 46ch;
  margin: 0 auto;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--color-text-soft);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.75rem;
}

/* ---------------------------------------------------------------------------
 * Buttons — primary (violet sweep) and ghost (glass outline).
 * ------------------------------------------------------------------------- */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.3rem;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
}

.btn-primary {
  background: var(--gradient-violet);
  color: #fff;
  border: 1px solid transparent;
  box-shadow: var(--box-shadow-button);
}

.btn-primary:hover {
  background: var(--gradient-violet-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 28px -6px rgba(124, 92, 255, 0.6);
}

.btn-ghost {
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid var(--glass-border);
  color: var(--color-text);
}

.btn-ghost:hover {
  border-color: var(--violet-500);
  color: var(--brand-strong);
  transform: translateY(-2px);
}

/* ---------------------------------------------------------------------------
 * Shared section shell — glass card, hover-lift, section heading.
 * ------------------------------------------------------------------------- */
section {
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-card);
  padding: 1.75rem 2rem;
  margin-bottom: 1.25rem;
}

section > h2 {
  color: var(--brand-strong);
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
}

.prose p {
  color: var(--color-text);
  line-height: 1.7;
  margin: 0;
}

/* ---------------------------------------------------------------------------
 * Capabilities — responsive icon card grid, mirrors HomeView tool tiles.
 * ------------------------------------------------------------------------- */
.cap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}

.cap-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.25rem;
  border-radius: var(--radius-md);
  background: var(--glass-fill);
  border: 1px solid var(--glass-border);
  transition:
    border-color var(--transition),
    box-shadow var(--transition),
    transform var(--transition);
}

.cap-card:hover {
  border-color: var(--color-border-hover);
  box-shadow:
    0 0 0 1px rgba(124, 92, 255, 0.2),
    0 10px 32px -12px rgba(124, 92, 255, 0.45);
  transform: translateY(-3px);
}

/* Rounded icon chip with a soft brand fill and gradient-strong glyph. */
.cap-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.cap-icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.cap-card h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.cap-card p {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--color-text-soft);
  margin: 0;
}

/* ---------------------------------------------------------------------------
 * Links — "Powered by Firecrawl" outbound resource cards.
 * ------------------------------------------------------------------------- */
.links-lead {
  color: var(--color-text);
  line-height: 1.7;
  margin: 0 0 1.25rem;
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.link-card {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 1.15rem;
  border-radius: var(--radius-md);
  background: var(--glass-fill);
  border: 1px solid var(--glass-border);
  text-decoration: none;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast);
}

.link-card:hover {
  border-color: var(--violet-500);
  background: var(--brand-soft);
  transform: translateY(-2px);
}

.link-label {
  font-weight: 700;
  color: var(--color-heading);
}

.link-card:hover .link-label {
  color: var(--brand-strong);
}

.link-desc {
  font-size: 0.82rem;
  color: var(--color-text-mute);
}
</style>
