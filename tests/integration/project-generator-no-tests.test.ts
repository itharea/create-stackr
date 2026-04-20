import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';

/**
 * With `--no-tests` (every service opts out), phase 3 must leave zero
 * test artifacts in the generated project: no `tests/` subtree, no
 * `vitest.config.ts`, no `.env.test`, no test scripts or devDeps.
 */
describe('MonorepoGenerator — --no-tests leaves no test artifacts', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-no-tests-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('omits the tests/ subtree and vitest config in every backend', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    for (const svc of cfg.services) {
      svc.backend.tests = false;
    }
    const projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);

    for (const svc of cfg.services) {
      const backend = path.join(projectDir, svc.name, 'backend');
      expect(await fs.pathExists(path.join(backend, 'tests'))).toBe(false);
      expect(await fs.pathExists(path.join(backend, 'vitest.config.ts'))).toBe(false);
      expect(await fs.pathExists(path.join(backend, '.env.test'))).toBe(false);

      const pkg = JSON.parse(await fs.readFile(path.join(backend, 'package.json'), 'utf-8'));
      expect(pkg.scripts.test).toBeUndefined();
      expect(pkg.scripts['test:watch']).toBeUndefined();
      expect(pkg.scripts['test:coverage']).toBeUndefined();
      expect(pkg.devDependencies.vitest).toBeUndefined();
      expect(pkg.devDependencies['@vitest/coverage-v8']).toBeUndefined();
      expect(pkg.devDependencies.nock).toBeUndefined();
      expect(pkg.devDependencies['is-ci']).toBeUndefined();
      expect(pkg.devDependencies.execa).toBeUndefined();
    }

    expect(await fs.pathExists(path.join(projectDir, 'docker-compose.test.yml'))).toBe(false);
  });
});
