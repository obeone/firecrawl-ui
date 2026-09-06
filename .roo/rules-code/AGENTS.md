# Code-mode Rules (Non-Obvious Only)

- Always access endpoints through `this.$api`; direct instantiation will break auth refresh.
- After changing API config **must** call `refreshApiClients()`.
- Do not intercept 401 responses; rely on global error handler.
- Use alias `@/...` for internal imports to satisfy tsconfig paths.
