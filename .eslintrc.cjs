/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.config.js',
    '*.config.cjs',
    '*.config.ts',
    'migrations',
    'scripts/*.mjs',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    
    // React
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // Using TypeScript instead
    'react/display-name': 'off',
    
    // React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }], // Allow console.log for now
    'no-debugger': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error',
    
    // Temporarily disabled to avoid noise - enable gradually
    '@typescript-eslint/no-require-imports': 'off',
    'no-case-declarations': 'off',
    'no-empty': 'warn',
  },
  overrides: [
    // Server-specific rules
    {
      files: ['server/**/*.ts'],
      rules: {
        'no-console': 'off', // Server logging is expected
      },
    },
    // Test files
    {
      files: ['**/*.test.ts', '**/*.test.tsx', 'tests/**/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
