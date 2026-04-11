#!/usr/bin/env node

/**
 * CLI entry point for `create-stackr` — the init binary.
 *
 * Invoked via `npm init stackr` / `npx create-stackr`. Delegates to the
 * built entrypoint at `dist/entrypoints/create.js`.
 */

import('../dist/entrypoints/create.js').catch((error) => {
  console.error('Failed to load create-stackr CLI:', error);
  process.exit(1);
});
