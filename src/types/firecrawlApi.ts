/**
 * Named aliases over the types generated from Firecrawl's official v2 OpenAPI
 * spec (`firecrawl-v2.generated.ts`, refreshed with `npm run api:types`).
 *
 * The adapter in `src/services/firecrawl.ts` imports these names rather than
 * the deep `components`/`operations` paths, so a spec refresh that renames or
 * removes something fails here, in one place, at type-check time.
 */

import type { components, operations } from './firecrawl-v2.generated';

/** JSON body of a request or response object from the generated spec. */
type JsonContent<T> = T extends { content: { 'application/json': infer Body } } ? Body : never;

/** JSON request body of a generated operation. */
type RequestBody<Op> = Op extends { requestBody?: infer Body }
  ? JsonContent<NonNullable<Body>>
  : never;

/** JSON body of the 200 response of a generated operation. */
type OkBody<Op> = Op extends { responses: { 200: infer Response } } ? JsonContent<Response> : never;

/** Every named schema of the v2 spec. */
export type V2Schemas = components['schemas'];

/** Scrape options shared by scrape, crawl, batch scrape, search and extract. */
export type V2ScrapeOptions = V2Schemas['ScrapeOptions'];

/** `POST /v2/scrape` request body. */
export type V2ScrapeRequest = RequestBody<operations['scrapeAndExtractFromUrl']>;

/** `POST /v2/crawl` request body. */
export type V2CrawlRequest = RequestBody<operations['crawlUrls']>;

/** `POST /v2/batch/scrape` request body. */
export type V2BatchScrapeRequest = RequestBody<operations['scrapeAndExtractFromUrls']>;

/** `POST /v2/map` request body. */
export type V2MapRequest = RequestBody<operations['mapUrls']>;

/** `POST /v2/search` request body. */
export type V2SearchRequest = RequestBody<operations['searchAndScrape']>;

/** A scraped document, as returned by `POST /v2/scrape`. */
export type V2Document = NonNullable<V2Schemas['ScrapeResponse']['data']>;

/** `POST /v2/crawl` response. */
export type V2CrawlStarted = V2Schemas['CrawlResponse'];

/** `POST /v2/batch/scrape` response. */
export type V2BatchScrapeStarted = V2Schemas['BatchScrapeResponseObj'];

/** `GET /v2/crawl/{id}` response. */
export type V2CrawlStatus = V2Schemas['CrawlStatusResponseObj'];

/** `GET /v2/batch/scrape/{id}` response. */
export type V2BatchScrapeStatus = V2Schemas['BatchScrapeStatusResponseObj'];

/** `GET /v2/crawl/{id}/errors` and `GET /v2/batch/scrape/{id}/errors` response. */
export type V2CrawlErrors = V2Schemas['CrawlErrorsResponseObj'];

/** `POST /v2/extract` response. */
export type V2ExtractStarted = V2Schemas['ExtractResponse'];

/** `GET /v2/extract/{id}` response. */
export type V2ExtractStatus = V2Schemas['ExtractStatusResponse'];

/** `POST /v2/map` response. */
export type V2MapResponse = V2Schemas['MapResponse'];

/** `GET /v2/team/queue-status` response. */
export type V2QueueStatus = OkBody<operations['getQueueStatus']>;

/** `GET /v2/team/credit-usage` response. */
export type V2CreditUsageResponse = OkBody<operations['getCreditUsage']>;

/** `GET /v2/team/token-usage` response. */
export type V2TokenUsageResponse = OkBody<operations['getTokenUsage']>;
