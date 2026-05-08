import { defineConfig } from 'eslint/config';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default defineConfig([
  {
    files: ['apps/**/src/**/*.ts', 'packages/**/src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/**/src/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]);