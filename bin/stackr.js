#!/usr/bin/env node

/**
 * CLI entry point for `stackr` — post-init operations binary.
 *
 * Runs commands like `stackr add service <name>` and
 * `stackr migrations ack <service>` inside an already-generated project.
 * Delegates to the built entrypoint at `dist/entrypoints/stackr.js`.
 */

import('../dist/entrypoints/stackr.js').catch((error) => {
  console.error('Failed to load stackr CLI:', error);
  process.exit(1);
});
