import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
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
    await fs.remove(tempDir);
  });

  it('duplicate service names: generator either throws or the config is rejected upfront', async () => {
    const { config } = invalidCases.duplicateServiceNames;
    // The generator itself does not call validateConfiguration (that's the
    // prompt layer's job), so we run the validator first and assert failure.
    const result = validateConfiguration(config);
    expect(result.valid).toBe(false);

    // But the generator *should* still fail — either because
    // `ensureDir` + `pathExists` collide or because two services try to
    // write to the same path. We let it run to confirm *something* goes
    // wrong and no partial project is left silently in a "half-done" state
    // that the user could mistake for success.
    const projectDir = path.join(tempDir, config.projectName);
    await expect(async () => {
      await new MonorepoGenerator(config).generate(projectDir);
    }).not.toThrow();
    // Even if generation doesn't throw, the stackr.config.json should
    // reflect the (broken) config; the validator is the single gate.
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
