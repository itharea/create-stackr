import { createRequire } from 'module';

/**
 * Read the current create-stackr version from the package's own
 * `package.json`. Used when stamping `stackrVersion` / `generatedBy` into
 * generated `stackr.config.json` files.
 *
 * `createRequire(import.meta.url)('../../package.json').version` is
 * preferred over `fs.readFile(new URL('../../package.json', import.meta.url))`
 * because:
 *
 * 1. It survives a future build step that bundles sources — bundlers
 *    understand `require()` statically and inline the version string; they
 *    don't necessarily understand `new URL(...)` relative to source files.
 * 2. It resolves identically from `src/utils/version.ts` (dev via tsx) and
 *    `dist/utils/version.js` (built), because both layouts put
 *    `package.json` two parents up from this file.
 *
 * Verified in the published tarball via `npm pack --dry-run`: `package.json`
 * ships at the expected path alongside `dist/` (npm always includes the
 * root `package.json` in the packed tarball).
 */
const require = createRequire(import.meta.url);

export function readStackrVersion(): string {
  // Loaded lazily so that a stub / test harness can mock this function via
  // module replacement without every transitive importer paying the cost on
  // module load.
  const pkg = require('../../package.json') as { version: string };
  return pkg.version;
}
