/**
 * Shared navigation model for the application shell.
 *
 * A single source of truth consumed by both the icon rail (App.vue) and the
 * command palette (CommandPalette.vue), so routes, labels, icons and
 * descriptions never drift between the two surfaces.
 */

/**
 * A navigable destination within the app.
 *
 * @property to - Router path the entry points to.
 * @property label - Short human-readable label.
 * @property description - One-line summary shown in the command palette.
 * @property keywords - Extra terms used to match palette queries.
 * @property paths - SVG path `d` strings composing a 24x24 lucide-style icon.
 */
export interface NavItem {
  to: string;
  label: string;
  description: string;
  keywords: string[];
  paths: string[];
}

/**
 * Ordered list of primary navigation destinations.
 */
export const navItems: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    description: 'Overview and quick access',
    keywords: ['dashboard', 'start', 'overview'],
    paths: ['M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z'],
  },
  {
    to: '/scrape',
    label: 'Scrape',
    description: 'Extract data from a single page',
    keywords: ['page', 'extract', 'markdown', 'html'],
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
    description: 'Crawl a whole site at scale',
    keywords: ['spider', 'site', 'recursive', 'bulk'],
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
    description: 'Pull content and metadata from URLs',
    keywords: ['metadata', 'structured', 'fields'],
    paths: [
      'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
      'M3.3 7 12 12l8.7-5',
      'M12 22V12',
    ],
  },
  {
    to: '/map',
    label: 'Map',
    description: "Visualize a site's link structure",
    keywords: ['graph', 'links', 'sitemap', 'structure'],
    paths: [
      'M9 4 3.5 6.2A1 1 0 0 0 3 7.1v12.2a1 1 0 0 0 1.4.9L9 18l6 3 5.1-2.2a1 1 0 0 0 .6-.9V5.7a1 1 0 0 0-1.4-.9L15 7z',
      'M9 4v14',
      'M15 7v14',
    ],
  },
  {
    to: '/search',
    label: 'Search',
    description: 'Search across collected results',
    keywords: ['find', 'query', 'filter'],
    paths: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'm21 21-4.3-4.3'],
  },
  {
    to: '/api-config',
    label: 'API Config',
    description: 'API keys and endpoint',
    keywords: ['settings', 'key', 'token', 'endpoint', 'configuration'],
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
    description: 'About Firecrawl UI',
    keywords: ['info', 'help', 'documentation'],
    paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 16v-4', 'M12 8h.01'],
  },
];
