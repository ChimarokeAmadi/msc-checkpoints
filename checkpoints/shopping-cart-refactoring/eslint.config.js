// ESLint rules used to find code smells (run with: npm run lint)
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Best practices
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-redeclare': 'error',
      'no-shadow': 'error',
      // Code smells: long or complicated functions, deep nesting, cryptic names
      complexity: ['warn', 8],
      'max-depth': ['warn', 3],
      'max-lines-per-function': ['warn', { max: 40, skipComments: true, skipBlankLines: true }],
      'max-params': ['warn', 4],
      'id-length': ['warn', { min: 2, exceptions: ['_', 'i', 'a', 'b', 'c'] }],
    },
  },
  {
    // Tests and demos may be longer
    files: ['test/**', '**/demo.js', '**/extras.js'],
    rules: { 'max-lines-per-function': 'off' },
  },
];
