import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/utils/setup.ts'],  // Environment setup (runs once per test file)
    // NOTE: vi.mock() calls must be at the top level of each test file
    // setupFiles is for environment config only, not for mocking
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js',
        '**/types/**',
        // Exclude CLI entry points (difficult to test in unit tests)
        '**/index.ts',
        '**/cli.ts',
        // Exclude unused utilities
        '**/logger.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 70,
        branches: 75,
        statements: 80,
      },
      all: true,
      include: ['src/**/*.ts'],
    },
    // Separate build verification tests (slow)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude build tests in watch mode
      ...(process.env.VITEST_WATCH ? ['**/tests/e2e/build-verification.test.ts'] : []),
    ],
  },
});
