import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Phase 5: the monorepo-level `<project>/tests/e2e/` package, the
 * `scripts/test-e2e.sh` wrapper, and the `test:e2e` script in the root
 * `package.json` all ship whenever at least one service opts into tests.
 * cross-service-auth.test.ts is an additional gate: auth peer + a base
 * service with tests enabled + non-`none` authMiddleware.
 */
describe('MonorepoGenerator — monorepo-level e2e scaffold', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-e2e-scaffold-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    async function generate(): Promise<{ projectDir: string; config: InitConfig }> {
      const body = loadPreset(presetName);
      const config: InitConfig = applyCliOptionsToPreset(
        body,
        `e2e-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);
      return { projectDir, config };
    }

    it('tests/e2e package + scripts/test-e2e.sh + root test:e2e all land on disk', async () => {
      const { projectDir, config } = await generate();
      const hasTests = config.services.some((s) => s.backend.tests);
      expect(hasTests).toBe(true); // default preset state

      const e2eDir = path.join(projectDir, 'tests/e2e');
      expect(await fs.pathExists(path.join(e2eDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(e2eDir, 'tsconfig.json'))).toBe(true);
      expect(await fs.pathExists(path.join(e2eDir, 'vitest.config.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(e2eDir, 'helpers/clients.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(e2eDir, 'helpers/wait-for-stack.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(e2eDir, 'helpers/cookies.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(e2eDir, 'helpers/unique.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(e2eDir, 'stack-smoke.test.ts'))).toBe(true);

      // cross-service-auth is gated on auth + base-with-tests + non-'none' mw.
      const hasAuth = config.services.some((s) => s.kind === 'auth');
      const hasGatedBase = config.services.some(
        (s) => s.kind === 'base' && s.backend.tests && s.backend.authMiddleware !== 'none'
      );
      const crossSvcAuth = path.join(e2eDir, 'cross-service-auth.test.ts');
      if (hasAuth && hasGatedBase) {
        expect(await fs.pathExists(crossSvcAuth)).toBe(true);
      } else {
        expect(await fs.pathExists(crossSvcAuth)).toBe(false);
      }

      const scriptPath = path.join(projectDir, 'scripts/test-e2e.sh');
      expect(await fs.pathExists(scriptPath)).toBe(true);
      const stat = await fs.stat(scriptPath);
      // Owner-exec bit set.
      expect((stat.mode & 0o100) !== 0).toBe(true);

      const pkg = JSON.parse(
        await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8')
      );
      expect(pkg.scripts['test:e2e']).toBe('./scripts/test-e2e.sh');
    });

    it('e2e package.json declares vitest + axios devDeps', async () => {
      const { projectDir } = await generate();
      const pkg = JSON.parse(
        await fs.readFile(path.join(projectDir, 'tests/e2e/package.json'), 'utf-8')
      );
      expect(pkg.devDependencies.vitest).toBeDefined();
      expect(pkg.devDependencies.axios).toBeDefined();
      expect(pkg.scripts.test).toBe('vitest run');
    });
  });

  it('--no-tests preset → no tests/e2e, no test-e2e.sh, no test:e2e script', async () => {
    const body = loadPreset('minimal');
    const config: InitConfig = applyCliOptionsToPreset(
      body,
      'e2e-notests',
      'npm',
      { tests: false }
    );
    // Safety check — applyCliOptionsToPreset should have flipped every
    // service.backend.tests to false.
    expect(config.services.every((s) => !s.backend.tests)).toBe(true);

    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'tests/e2e'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'scripts/test-e2e.sh'))).toBe(false);

    const pkg = JSON.parse(
      await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8')
    );
    expect(pkg.scripts['test:e2e']).toBeUndefined();
  });
});
