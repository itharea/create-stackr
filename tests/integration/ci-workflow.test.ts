import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';

/**
 * Phase 6: --ci-workflow opts a fresh project into a generated
 * `.github/workflows/test.yml` with two jobs:
 *   - `component` runs the per-service test layer in a matrix
 *   - `e2e` (needs: component) runs the cross-service stack once
 *
 * Without the flag, the file is not emitted at all.
 */
describe('--ci-workflow', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-ci-workflow-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('--ci-workflow → file exists, parses as YAML, has component matrix + e2e needs:component', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'ci-workflow-on',
      'npm',
      { ciWorkflow: true }
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    const workflowPath = path.join(projectDir, '.github/workflows/test.yml');
    expect(await fs.pathExists(workflowPath)).toBe(true);

    const raw = await fs.readFile(workflowPath, 'utf-8');
    const parsed = YAML.parse(raw) as {
      jobs: {
        component: { strategy: { matrix: { service: string[] } } };
        e2e: { needs: string };
      };
    };

    expect(parsed.jobs.component).toBeDefined();
    expect(parsed.jobs.e2e).toBeDefined();
    expect(parsed.jobs.e2e.needs).toBe('component');

    const matrix = parsed.jobs.component.strategy.matrix.service;
    expect(Array.isArray(matrix)).toBe(true);
    for (const svc of config.services.filter((s) => s.backend.tests)) {
      expect(matrix).toContain(svc.name);
    }
  });

  it('without --ci-workflow → file not generated', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'ci-workflow-off',
      'npm',
      {}
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    expect(
      await fs.pathExists(path.join(projectDir, '.github/workflows/test.yml'))
    ).toBe(false);
  });

  it('--ci-workflow + --no-tests → file not generated (empty matrix would be invalid)', async () => {
    const config = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'ci-workflow-no-tests',
      'npm',
      { ciWorkflow: true, tests: false }
    );
    const projectDir = path.join(tempDir, config.projectName);
    await new MonorepoGenerator(config).generate(projectDir);

    expect(
      await fs.pathExists(path.join(projectDir, '.github/workflows/test.yml'))
    ).toBe(false);
  });
});
