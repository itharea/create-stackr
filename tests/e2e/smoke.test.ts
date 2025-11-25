import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../dist/index.js');

/**
 * Smoke tests - quick sanity checks that basic functionality works
 */
describe('Smoke Tests', () => {
  it('CLI should be executable', async () => {
    const result = await execa('node', [CLI_PATH, '--version'], {
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Semantic version
  }, 10000);

  it('CLI should show help', async () => {
    const result = await execa('node', [CLI_PATH, '--help'], {
      reject: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('create-fullstack-app');
    expect(result.stdout).toContain('options');
  }, 10000);

  it('CLI should validate project name', async () => {
    const result = await execa('node', [CLI_PATH, 'INVALID-NAME', '--defaults'], {
      reject: false,
      input: '\n', // Auto-answer any prompts
    });

    // Should fail with invalid name
    expect(result.exitCode).not.toBe(0);
  }, 15000);
});
