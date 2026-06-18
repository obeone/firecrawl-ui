# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev        # Start dev server with hot reload (http://localhost:5173)
npm run build      # Production build (output: dist/)
npm run preview    # Preview production build locally
npm run lint       # ESLint on .ts, .tsx, .js, .jsx, .vue files
npm run format     # Prettier formatting
```

There are no automated tests in this project (`npm test` is a no-op).

Before submitting changes, verify with:

```sh
npm ci
npx prettier --check .
npx eslint .
```

## Architecture

This is a Vue 3 + TypeScript + Vite SPA that provides a UI for the Firecrawl API.

### API Adapter (`src/services/firecrawl.ts`)

Hand-written adapter layer that targets the Firecrawl **API v2** (`/v2/*` endpoints). `createFirecrawlApiClients()` builds a set of legacy-compatible clients (`crawling`, `extraction`, `mapping`, `scraping`, `search`) that translate the payloads the views build into v2 requests and normalize v2 responses back into the shapes the views expect. The v2 spec lives in `openapi_v2.yaml` for reference.

### API Configuration (`src/config/api.ts`)

Manages runtime API config. Priority order for credentials: `localStorage` > `VITE_*` env vars > hardcoded defaults. Call `updateApiConfig()` to persist changes at runtime. The base URL is normalized (any trailing `/v1` or `/v2` is stripped) so the adapter builds requests from the service root.

### API Plugin (`src/plugins/api.ts`)

Vue plugin that builds the Firecrawl adapter clients via `createFirecrawlApiClients()` and provides them to the app via `inject('api', ...)` and `app.config.globalProperties.$api`. Call `refreshApiClients()` after changing API config to reinitialize the clients.

### Routing (`src/router/index.ts`)

Uses `createWebHashHistory` (hash-based URLs, e.g. `/#/scrape`). Routes map directly to views in `src/views/`.

### Views vs Components

- `src/views/` — page-level components mounted by the router
- `src/components/` — reusable components; `ApiKeyInput` is registered globally

### Environment Variables

```sh
VITE_FIRECRAWL_API_KEY=your_api_key
VITE_FIRECRAWL_API_BASE_URL=https://api.firecrawl.dev
```

Create a `.env` file in the project root. These are optional — the app also stores config in `localStorage` via the settings page.

### Docker

Multi-stage build: Node 24 slim for building, `nginxinc/nginx-unprivileged:stable-alpine` for serving. Nginx listens on port 8080. Custom `nginx.conf` routes all unknown paths to `index.html` for client-side routing.

## Code Conventions

- TypeScript: 2-space indentation, semicolons required, explicit types, `const`/`let` only
- JSDoc/TSDoc on all classes and functions (args, return types, exceptions)
- Prettier for formatting, ESLint for linting — run both before committing
- PR title format: `[firecrawl-ui] <Title>`
