/**
 * ESLint flat configuration.
 *
 * - typescript-eslint `recommended` for TypeScript, in `.ts` files and in
 *   `<script lang="ts">` blocks of Vue single-file components.
 * - eslint-plugin-vue `flat/recommended` for Vue 3 templates and SFCs.
 * - `no-console` so debugging output (and request payloads) cannot ship;
 *   `console.warn` and `console.error` stay allowed for real diagnostics.
 * - eslint-config-prettier last, to turn off rules that conflict with Prettier.
 */

import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'node_modules/',
    'dist/',
    'coverage/',
    '.history/',
    // Generated from the v2 OpenAPI spec by `npm run api:types`.
    'src/types/firecrawl-v2.generated.ts',
  ]),
  tseslint.configs.recommended,
  pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  eslintConfigPrettier,
);
