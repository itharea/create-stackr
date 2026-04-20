import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';

/**
 * With every service opting out of tests (mirrors `--no-tests` at init),
 * the generator must NOT write `docker-compose.test.yml`.
 */
describe('MonorepoGenerator — --no-tests equivalent', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-compose-notests-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('does not emit docker-compose.test.yml when every service has tests: false', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    for (const svc of cfg.services) {
      svc.backend.tests = false;
    }
    const projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'docker-compose.test.yml'))).toBe(false);

    // Dev + prod composes are still emitted.
    expect(await fs.pathExists(path.join(projectDir, 'docker-compose.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'docker-compose.prod.yml'))).toBe(true);
  });

  it('still emits docker-compose.test.yml when at least one service keeps tests: true', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    // auth stays true; core flips to false.
    cfg.services.find((s) => s.name === 'core')!.backend.tests = false;

    const projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'docker-compose.test.yml'))).toBe(true);
  });
});
