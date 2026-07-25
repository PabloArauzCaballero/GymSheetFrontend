import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Root ESLint flat config for the shared `packages/*`. Each app (apps/web) keeps
 * its own framework-specific config, which ESLint prefers when linting inside it.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'apps/**', '.turbo/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
