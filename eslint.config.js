// eslint.config.js
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // 您可以根據需要自定義規則
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
    ignores: ['node_modules/**', 'dist/**', '.wrangler/**'],
  },
];
