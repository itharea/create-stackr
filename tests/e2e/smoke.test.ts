import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../dist/index.js');

/**
 * Smoke tests — quick sanity checks that the built CLI is callable and
 * reports basic diagnostics. Requires `bun run build` to have produced
 * `dist/index.js`; skips if dist is missing so a fresh checkout can still
 * run the rest of the test suite.
 */
describe('Smoke Tests', () => {
  const distExists = fs.existsSync(CLI_PATH);
  const maybeIt = distExists ? it : it.skip;

  maybeIt('CLI should be executable', async () => {
    const result = await execa('node', [CLI_PATH, '--version'], {
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  }, 10000);

  maybeIt('CLI should show help', async () => {
    const result = await execa('node', [CLI_PATH, '--help'], {
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('create-stackr');
    expect(result.stdout.toLowerCase()).toContain('option');
  }, 10000);

  maybeIt('CLI should validate project name', async () => {
    const result = await execa('node', [CLI_PATH, 'INVALID-NAME', '--defaults'], {
      reject: false,
      input: '\n',
    });

    expect(result.exitCode).not.toBe(0);
  }, 15000);
});
