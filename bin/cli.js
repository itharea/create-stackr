#!/usr/bin/env node

/**
 * CLI entry point
 * This file is the executable that gets called when running:
 * npx create-fullstack-app
 */

import('../dist/index.js').catch((error) => {
  console.error('Failed to load CLI:', error);
  process.exit(1);
});
