/**
 * ESLint configuration file for the project.
 *
 * This configuration supports linting for TypeScript, Vue, and JavaScript files.
 * It uses the Vue ESLint parser and TypeScript parser, along with relevant plugins.
 * The configuration also integrates Prettier to disable conflicting ESLint rules.
 */

import eslintConfigPrettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';

export default [
  {
    // Ignore linting for files in node_modules directory
    ignores: ['node_modules/**'],
  },
  {
    // Apply these settings to TypeScript, Vue, and JavaScript files
    files: ['**/*.ts', '**/*.vue', '**/*.js'],
    languageOptions: {
      // Use Vue parser to support Vue SFC files
      parser: vueParser,
      parserOptions: {
        // Use TypeScript parser for script blocks inside Vue files and TS files
        parser: tsParser,
        ecmaVersion: 2020, // Support modern ECMAScript features up to ES2020
        sourceType: 'module', // Enable ECMAScript modules
      },
    },
    plugins: {
      vue, // Vue.js specific linting rules
      '@typescript-eslint': tsPlugin, // TypeScript specific linting rules
    },
    rules: {
      // Custom rules can be added here
    },
  },
  // Integrate Prettier configuration to disable ESLint rules that conflict with Prettier formatting
  eslintConfigPrettier,
];
