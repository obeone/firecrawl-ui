/**
 * ESLint configuration file for the project.
 *
 * This configuration sets the environment to support browser, Node.js, and ES2021 features.
 * It uses the latest ECMAScript version and module source type.
 * The configuration extends the recommended ESLint rules and enforces the following custom rules:
 * - 2-space indentation
 * - Mandatory semicolons
 * - Single quotes for strings
 * - Trailing commas in multiline constructs
 * - No space before function parentheses
 */

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: ['eslint:recommended'],
  rules: {
    indent: ['error', 2],
    semi: ['error', 'always'],
    quotes: ['error', 'single'],
    'comma-dangle': ['error', 'always-multiline'],
    'space-before-function-paren': ['error', 'never'],
  },
};
