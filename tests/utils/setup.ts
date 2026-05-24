/**
 * Vitest global setup file
 *
 * NOTE: This file runs once per test file, NOT globally.
 * For test-specific mocks, import and call setupCommonMocks()
 * in individual test files' beforeAll() hooks.
 *
 * This file is for environment setup only.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Skip `git init` + `git add` + `git commit` inside `MonorepoGenerator`.
// Background git activity (gc / pack writes / fsmonitor) races with
// per-test `fs.remove(tempDir)` cleanup on Linux CI and produces flaky
// ENOTEMPTY failures on `.git/objects/`. See src/utils/git.ts.
process.env.STACKR_SKIP_GIT_INIT = '1';

// Increase timeout for slow operations
import { beforeAll } from 'vitest';
beforeAll(() => {
  // Any global environment setup here
});

/**
 * Example usage in test files:
 *
 * import { beforeAll } from 'vitest';
 * import { setupCommonMocks } from '../utils/mocks.js';
 *
 * beforeAll(() => {
 *   setupCommonMocks();
 * });
 */
