import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Phase 5 Part C: per-service `tests/unit/` is deliberately minimal —
 * exactly one `errors.test.ts` per tests-enabled backend, and no
 * regression into trivial-helper tests that would just add noise.
 */
describe('MonorepoGenerator — unit/ scaffold', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-unit-scaffold-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    async function generate(): Promise<{ projectDir: string; config: InitConfig }> {
      const body = loadPreset(presetName);
      const config: InitConfig = applyCliOptionsToPreset(
        body,
        `unit-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);
      return { projectDir, config };
    }

    it('tests-enabled backends ship tests/unit/utils/errors.test.ts — and nothing else', async () => {
      const { projectDir, config } = await generate();

      for (const svc of config.services.filter((s) => s.backend.tests)) {
        const backend = path.join(projectDir, svc.name, 'backend');
        expect(
          await fs.pathExists(path.join(backend, 'tests/unit/utils/errors.test.ts')),
          `${svc.name} errors.test.ts`
        ).toBe(true);

        // Explicit negative — prevent regression into cut tests.
        expect(
          await fs.pathExists(path.join(backend, 'tests/unit/helpers/unique.test.ts')),
          `${svc.name} unique.test.ts should NOT exist`
        ).toBe(false);
      }
    });
  });

  it('--no-tests backend has no tests/unit at all', async () => {
    const body = loadPreset('minimal');
    const config: InitConfig = applyCliOptionsToPreset(
      body,
      'unit-notests',
      'npm',
      { tests: false }
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    for (const svc of config.services) {
      expect(
        await fs.pathExists(path.join(projectDir, svc.name, 'backend/tests/unit'))
      ).toBe(false);
    }
  });
});
