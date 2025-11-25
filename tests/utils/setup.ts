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
