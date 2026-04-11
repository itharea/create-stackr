/**
 * Public module entry — kept for backwards compatibility.
 *
 * Phase 3 moved the `create-stackr` Commander setup into
 * `src/entrypoints/create.ts`. The binary at `bin/create-stackr.js`
 * imports that entrypoint directly. This file stays as a safe re-export
 * so anything that still imports from `create-stackr`'s package entry
 * point (e.g. test helpers, downstream tooling) resolves the main CLI
 * function without triggering Commander's `parse()` side effect.
 */

export { runCreateFlow, runCLI } from './cli.js';
export type { InitConfig, ServiceConfig, CLIOptions } from './types/index.js';
