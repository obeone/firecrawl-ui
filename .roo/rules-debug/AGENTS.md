# Debug-mode Rules (Non-Obvious Only)

- A 401 immediately triggers a router redirect; pause navigation or disable global handler when inspecting auth failures.
- Clear `localStorage` keys `firecrawl_apiUrl` & `firecrawl_apiKey` to reproduce first-run state.
