import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the `@/*` alias from tsconfig.json so tests import modules exactly
  // the way the app does.
  resolve: { tsconfigPaths: true },
  test: {
    include: ['tests/**/*.test.ts'],
    // The logic under test is pure or localStorage-backed; tests that need
    // storage install a stub on globalThis (see tests/helpers.ts). No DOM.
    environment: 'node',
  },
});
