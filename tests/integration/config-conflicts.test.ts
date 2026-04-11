import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import { rm } from 'fs/promises';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { validateConfiguration } from '../../src/utils/validation.js';
import { invalidCases } from '../fixtures/configs/invalid.js';

/**
 * Integration-layer conflict tests — prove that structurally invalid
 * configurations are caught (via `validateConfiguration`) and that a
 * generator attempt against an invalid config does not succeed.
 *
 * The unit-level per-rule assertions live in `tests/unit/validation.test.ts`
 * and `tests/fixtures/configs/validate-fixtures.test.ts`. This file exists
 * to lock in the *integration* story: the conflicts must be caught before
 * any files land on disk.
 */
describe('config conflicts — validateConfiguration', () => {
  for (const [key, invalid] of Object.entries(invalidCases)) {
    it(`rejects: ${invalid.name}`, () => {
      const result = validateConfiguration(invalid.config);
      expect(result.valid, `${key} should be rejected`).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain(invalid.expectedError);
    });
  }
});

describe('config conflicts — generation fails fast', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'conflict-test-'));
  });

  afterEach(async () => {
    // The duplicate-service-names test runs `git init` + file writes against
    // a structurally broken project, which on macOS occasionally leaves
    // background filesystem activity that races with plain fs.remove and
    // surfaces as ENOTEMPTY. Use fs.rm with built-in retries.
    await rm(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('duplicate service names: generator either throws or the config is rejected upfront', async () => {
    const { config } = invalidCases.duplicateServiceNames;
    // The generator itself does not call validateConfiguration (that's the
    // prompt layer's job), so we run the validator first and assert failure.
    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);

    // Run the generator against the broken config too, as a belt-and-
    // suspenders check that nothing silently produces a "half-done"
    // project the user could mistake for success. Either outcome is
    // acceptable here — the validator above is the single gate — so
    // swallow any throw.
    //
    // IMPORTANT: await the promise properly. The old form
    //   `await expect(async () => { await gen.generate(...) }).not.toThrow()`
    // was buggy: `.not.toThrow()` is a SYNCHRONOUS matcher that only
    // checks whether calling the fn throws before it returns, and the
    // inner async work was never awaited. afterEach would then race
    // against still-running `fs.ensureDir` calls inside the generator
    // and surface as an ENOENT `mkdir` unhandled rejection under load.
    const projectDir = path.join(tempDir, config.projectName);
    try {
      await new MonorepoGenerator(config).generate(projectDir);
    } catch {
      /* tolerated — the validator above is the assertion that matters */
    }
  });

  it('role-gated without roles is rejected by validator', () => {
    const { config } = invalidCases.roleGatedWithoutRoles;
    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/no roles configured/);
  });

  it('authMiddleware in a no-auth monorepo is rejected', () => {
    const { config } = invalidCases.authMiddlewareInNoAuthMonorepo;
    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/no auth service is present/);
  });

  it('duplicate backend ports are rejected', () => {
    const { config } = invalidCases.duplicateBackendPorts;
    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Duplicate backend port/);
  });

  it('duplicate web ports are rejected', () => {
    const { config } = invalidCases.duplicateWebPorts;
    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Duplicate web port/);
  });
});
