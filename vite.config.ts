/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { injectCspMeta } from './src/config/csp';
import { resolveAppVersion } from './src/config/version';

/**
 * Vite configuration file.
 * Defines how the Vite development server and build process should behave.
 *
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  define: {
    // Shown on the About page; see src/config/version.ts for the sources.
    __APP_VERSION__: JSON.stringify(
      resolveAppVersion(process.env.APP_VERSION, () =>
        execSync('git describe --tags --always --dirty', {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }),
      ),
    ),
  },
  plugins: [
    // Vue plugin for Vite, enabling Vue 3 SFC support.
    vue(),
    // Content Security Policy <meta> tag, for builds only: the dev server
    // injects inline styles for HMR, which the policy would block.
    {
      name: 'firecrawl-ui:csp-meta',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler: (html: string) => injectCspMeta(html),
      },
    },
  ],
  resolve: {
    /**
     * Path aliases for easier imports.
     * Allows using '@' to refer to the 'src' directory.
     * Example: import MyComponent from '@/components/MyComponent.vue';
     */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
