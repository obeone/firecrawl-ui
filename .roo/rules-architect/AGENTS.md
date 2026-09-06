# Architect-mode Rules (Non-Obvious Only)

- The application assumes API plugin (`src/plugins/api.ts`) is registered **before** any component renders to guarantee `$api` availability.
- Global error handler in `src/main.ts` couples router & API layer: keep this pattern when adding new global handlers.
