import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';

/**
 * Phase 6: scripts/test-all.mjs wraps the per-backend `<pm> run test`
 * iteration on top of the docker-compose.test.yml `component` profile.
 * It must:
 *   - exist on disk
 *   - include a per-service TEST_SERVICES entry for every service whose
 *     backend.tests is true
 *   - bring up the `component` profile and tear it down on CI
 *   - be omitted entirely when --no-tests was passed
 */
describe('scripts/test-all.mjs', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-test-all-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('default preset → script exists and iterates every test-enabled service', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'test-all-default',
      'npm',
      {}
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    const scriptPath = path.join(projectDir, 'scripts/test-all.mjs');
    expect(await fs.pathExists(scriptPath)).toBe(true);

    const contents = await fs.readFile(scriptPath, 'utf-8');
    expect(contents).toContain(
      "'--profile',\n    'component',\n    'up',\n    '-d',\n    '--wait'"
    );
    expect(contents).toContain("'down'");
    expect(contents).toContain('process.env.CI');

    for (const svc of config.services.filter((s) => s.backend.tests)) {
      expect(contents).toContain(`'${svc.name}'`);
    }
  });

  it('--no-tests → script not generated', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'test-all-notests',
      'npm',
      { tests: false }
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'scripts/test-all.mjs'))).toBe(false);

    const pkg = JSON.parse(
      await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8')
    );
    expect(pkg.scripts.test).toBeUndefined();
  });

  it('default preset → root package.json has both "test" and "test:e2e" scripts', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'test-all-pkg',
      'npm',
      {}
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    const pkg = JSON.parse(
      await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8')
    );
    expect(pkg.scripts.test).toBe('node scripts/test-all.mjs');
    expect(pkg.scripts['test:e2e']).toBe('node scripts/test-e2e.mjs');
  });
});
