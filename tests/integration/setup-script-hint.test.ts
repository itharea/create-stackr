import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';

/**
 * Phase 6: setup.mjs's "Next steps" footer surfaces the test commands when
 * any service has tests enabled, and stays silent when --no-tests was
 * passed. The hint is rendered into the same single block as the existing
 * 1–4 items so the footer remains one continuous list.
 */
describe('setup.mjs — test commands hint', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-setup-hint-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('default preset (tests on) → setup.mjs contains the "Run tests:" hint', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'setup-hint-tests',
      'npm',
      {}
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    const setupMjs = await fs.readFile(
      path.join(projectDir, 'scripts/setup.mjs'),
      'utf-8'
    );
    expect(setupMjs).toContain('Run tests:');
    expect(setupMjs).toContain('npm run test');
    expect(setupMjs).toContain('run test:e2e');
  });

  it('--no-tests → setup.mjs has no "Run tests" line', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'setup-hint-notests',
      'npm',
      { tests: false }
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    const setupMjs = await fs.readFile(
      path.join(projectDir, 'scripts/setup.mjs'),
      'utf-8'
    );
    expect(setupMjs).not.toContain('Run tests:');
    expect(setupMjs).not.toContain('run test:e2e');
  });
});
