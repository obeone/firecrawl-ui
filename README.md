# Firecrawl UI

This project is a Vue 3 application built with Vite. The application consumes the Firecrawl API defined in `openapi.yaml`.

## Project setup

Install dependencies with:

```sh
npm install
```

### Development server

```sh
npm run dev
```

### Production build

```sh
npm run build
```

The entry point is [`src/main.ts`](src/main.ts). Vite is configured via [`vite.config.ts`](vite.config.ts).

### Running tests

```sh
npm run test
```

### Configuration

Set the API base URL and key via environment variables in a `.env` file:

```
VITE_FIRECRAWL_API_BASE_URL=https://api.firecrawl.dev/v1
VITE_FIRECRAWL_API_KEY=your_api_key
```

### Checking credit usage

Visit `/account` in the app to view remaining credits for your API key. Previous checks can be found on `/account/history`.

### Regenerating the client

To regenerate the API client from `openapi.yaml` you can use `openapi-generator`:

```sh
npx openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o src/api-client
```
