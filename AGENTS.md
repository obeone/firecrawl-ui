# AGENTS.md

Canonical project instructions for coding agents. Maintain shared guidance here.

## Commands

```sh
npm run dev        # Start dev server with hot reload (http://localhost:5173)
npm run build      # Production build (output: dist/)
npm run preview    # Preview production build locally
npm run typecheck  # vue-tsc type check (no emit)
npm run lint       # ESLint (typescript-eslint + eslint-plugin-vue), zero warnings
npm test           # Vitest unit tests (src/**/*.test.ts)
npm run format     # Prettier formatting
```

Before submitting changes, verify with (CI runs the same steps and blocks on
each of them):

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
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

## Additional agent and contributor instructions

### Coding Conventions

#### General Principles

- **Language:**
  All code, comments, docstrings, variable and function names must be in English.
- **Documentation:**
  Every class, function/method, and file should be fully documented (docstrings/JSDoc), including:
  - Arguments (type + description)
  - Return values
  - Exceptions (if any)

- **Comments:**
  Use inline comments for non-obvious logic only.
  All comments must be clear, concise, and in English.

---

#### Formatting

| Aspect          | Python                     | JavaScript / TypeScript    |
| :-------------- | :------------------------- | :------------------------- |
| **Indentation** | 4 spaces, no tabs          | 2 spaces, no tabs          |
| **Line Length** | Prefer 88–100 chars        | Prefer 100–120 chars       |
| **Spacing**     | Blank lines between blocks | Blank lines between blocks |
| **Files**       | End files with a newline   | End files with a newline   |
| **Operators**   | Spaces around operators    | Spaces around operators    |

---

#### Naming

| Element       | Python (PEP8)      | JavaScript/TypeScript               |
| ------------- | ------------------ | ----------------------------------- |
| Variables     | `snake_case`       | `camelCase`                         |
| Functions     | `snake_case`       | `camelCase`                         |
| Classes       | `CamelCase`        | `PascalCase`                        |
| Constants     | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE`                  |
| Interfaces    | –                  | `IPascalCase` (optional convention) |
| Types/Aliases | –                  | `PascalCase`                        |

---

#### Python-specific

- Use [type hints](https://docs.python.org/3/library/typing.html) for all function arguments and return values.
- Use docstrings (`"""Summary..."""`) for all modules, classes, and functions.
- Prefer list/dict comprehensions over loops for simple cases.
- Avoid global variables.
- Use virtual environments.
- Format with [`black`](https://black.readthedocs.io/) and check with [`ruff`](https://docs.astral.sh/ruff/).
- Always run static type checks (e.g., with `mypy`).

---

#### JavaScript/TypeScript-specific

- Use [JSDoc](https://jsdoc.app/) or [TSDoc](https://tsdoc.org/) for documentation.
- Always use semicolons (`;`).
- Prefer `const` and `let` over `var`.
- Use `===`/`!==` for comparison.
- For TypeScript, type everything explicitly.
- Prefer arrow functions except for class methods.
- Use ES modules (`import`/`export`) by default.
- Format with [Prettier](https://prettier.io/) and lint with [ESLint](https://eslint.org/).

---

#### Example Python Function

```python
def add_numbers(a: int, b: int) -> int:
    """
    Add two integers.

    Args:
        a (int): The first integer.
        b (int): The second integer.

    Returns:
        int: The sum of a and b.
    """
    return a + b  # Simple addition
```

---

#### Example TypeScript Function

```typescript
/**
 * Add two numbers together.
 *
 * @param a - The first number
 * @param b - The second number
 * @returns The sum of a and b
 */
function addNumbers(a: number, b: number): number {
  return a + b; // Simple addition
}
```

### Testing

Always test the code with:

- `npm ci`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

### Branch naming

Title in English

### PR instructions

Title format: [<project_name>] <Title>
