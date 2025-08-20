/**
 * Interfaces for crawl configuration.
 */

/**
 * Options for controlling the crawler behaviour.
 */
export interface CrawlerOptions {
  includes?: string[];
  excludes?: string[];
  maxDepth?: number;
  maxDiscoveryDepth?: number;
  ignoreSitemap?: boolean;
  ignoreQueryParameters?: boolean;
  limit?: number;
  delay?: number;
  allowExternalLinks?: boolean;
  navigateBacklinks?: boolean;
}

/**
 * Options describing how pages should be scraped.
 */
export interface ScrapeOptions {
  formats: string[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
}

/**
 * Form data shared across crawl configuration steps.
 */
export interface CrawlFormData {
  url: string;
  crawlerOptions: CrawlerOptions;
  scrapeOptions: ScrapeOptions;
}
