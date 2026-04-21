import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Phase 6: every backend with tests enabled ships a `tests/DESIGN.md` and
 * `tests/BEST_PRACTICES.md` rendered from the per-kind template. Anchors
 * are header strings — pinning them catches drift instead of smoothing
 * over silently.
 */
describe('tests/DESIGN.md and tests/BEST_PRACTICES.md', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-tests-docs-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    async function generate(): Promise<{ projectDir: string; config: InitConfig }> {
      const body = loadPreset(presetName);
      const config = applyCliOptionsToPreset(
        body,
        `tests-docs-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);
      return { projectDir, config };
    }

    it('every test-enabled backend has DESIGN.md + BEST_PRACTICES.md with all required anchors', async () => {
      const { projectDir, config } = await generate();

      for (const svc of config.services.filter((s) => s.backend.tests)) {
        const testsDir = path.join(projectDir, svc.name, 'backend/tests');
        const designPath = path.join(testsDir, 'DESIGN.md');
        const bpPath = path.join(testsDir, 'BEST_PRACTICES.md');

        expect(await fs.pathExists(designPath), `${svc.name}: DESIGN.md missing`).toBe(true);
        expect(await fs.pathExists(bpPath), `${svc.name}: BEST_PRACTICES.md missing`).toBe(true);

        const design = await fs.readFile(designPath, 'utf-8');
        for (const anchor of [
          '## One test compose, two profiles',
          '## Layers',
          '## Data tiers (Goldberg §6)',
          '## Parallelism',
          '## What\'s mocked vs. real, by layer',
          '## Port summary (reference)',
        ]) {
          expect(design, `${svc.name}: DESIGN.md missing anchor "${anchor}"`).toContain(anchor);
        }

        // Per-service port row — `| <name> | <devPort> | <dbPort> | <redisPort> | <appPort> |`
        const portRow = `| ${svc.name} | ${svc.backend.port} `;
        expect(design, `${svc.name}: DESIGN.md missing port table row`).toContain(portRow);

        const bp = await fs.readFile(bpPath, 'utf-8');
        for (const anchor of [
          '## The Arrange / Act / Assert shape',
          '## Rules of thumb',
          '## When to mock vs run real',
          '## Adding a new queue test',
        ]) {
          expect(bp, `${svc.name}: BEST_PRACTICES.md missing anchor "${anchor}"`).toContain(anchor);
        }
      }
    });
  });

  it('--no-tests → neither file is generated', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'tests-docs-notests',
      'npm',
      { tests: false }
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    for (const svc of config.services) {
      expect(
        await fs.pathExists(
          path.join(projectDir, svc.name, 'backend/tests/DESIGN.md')
        )
      ).toBe(false);
      expect(
        await fs.pathExists(
          path.join(projectDir, svc.name, 'backend/tests/BEST_PRACTICES.md')
        )
      ).toBe(false);
    }
  });
});
