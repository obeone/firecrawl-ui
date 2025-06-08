import eslintConfigPrettier from 'eslint-config-prettier/flat';
import vue from 'eslint-plugin-vue';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';

export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.vue', '**/*.js'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      vue,
      '@typescript-eslint': tsPlugin,
    },
    rules: {},
  },
  eslintConfigPrettier,
];
