# Firecrawl UI

Firecrawl UI is a Vue 3 application for interacting with the [Firecrawl API](https://firecrawl.dev/).
It allows you to scrape pages, launch crawls and extract structured data through a simple web interface.

## Features

- Scrape individual URLs
- Launch crawling jobs with custom depth
- Extract data using Firecrawl's AI tools
- Configure and store your API key locally
- View or export results

## Requirements

- Node.js 18 or newer
- npm 8 or newer

## Installation

```sh
npm install
```

## Environment Variables
Set the following variables to configure API access:

- `VITE_FIRECRAWL_API_KEY` - your Firecrawl API key
- `VITE_FIRECRAWL_API_BASE_URL` - base URL of the Firecrawl API

Create a `.env` file in the project root with these variables:

```sh
VITE_FIRECRAWL_API_KEY=your_api_key
VITE_FIRECRAWL_API_BASE_URL=https://api.firecrawl.dev/v1
```

These variables are read in `src/config/api.ts`.


## Development

Run the dev server with hot reload:

```sh
npm run dev
```

## Production Build

Compile and minify the application:

```sh
npm run build
```

Preview the built app locally:

```sh
npm run preview
```

## Docker

Build the Docker image:

```sh
docker build -t firecrawl-ui .
```

Run the container and expose the Nginx server:

```sh
docker run -p 8080:8080 firecrawl-ui
```

A prebuilt image is also published and can be pulled from:

- `ghcr.io/obeone/firecrawl-ui`
- `docker.io/obeoneorg/firecrawl-ui`

## API Specification

The OpenAPI document describing all endpoints is available in `openapi.yaml`.

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.
