import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { loadPreset, PRESETS } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import type { InitConfig } from '../../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC_ENTRY = path.join(REPO_ROOT, 'src/entrypoints/create.ts');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules/.bin/tsx');

/**
 * E2E preset generation — proves every preset yields a valid project
 * tree containing `stackr.config.json` with the expected services.
 *
 * The minimal preset is exercised via a real CLI spawn (`tsx src/index.ts`)
 * with `--defaults` because that's the only preset the CLI can run
 * non-interactively today. Full-featured and analytics-focused presets
 * still require prompts for aiTools / packageManager when invoked via
 * `--template`, so for those we drive `MonorepoGenerator.generate`
 * directly — still an end-to-end project-on-disk assertion, just without
 * the subprocess.
 */
describe('E2E preset generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-preset-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('minimal preset via CLI spawn (--defaults) produces a valid project', async () => {
    const projectName = 'minimal-cli-e2e';

    const result = await execa(TSX_BIN, [SRC_ENTRY, projectName, '--defaults'], {
      cwd: tempDir,
      reject: false,
      timeout: 60000,
    });

    expect(result.exitCode, `CLI stderr: ${result.stderr}`).toBe(0);

    const projectDir = path.join(tempDir, projectName);
    expect(await fs.pathExists(projectDir)).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'stackr.config.json'))).toBe(true);

    const cfg = await loadStackrConfig(projectDir);
    expect(cfg).toBeTruthy();
    expect(cfg!.projectName).toBe(projectName);

    const names = cfg!.services.map((s) => s.name).sort();
    expect(names).toContain('auth');
    expect(names).toContain('core');
  }, 90000);

  describe.each(PRESETS.map((p) => [p.name] as const))(
    '%s preset (direct generator)',
    (presetName) => {
      it('generates a valid project with expected services', async () => {
        const body = loadPreset(presetName);
        const config: InitConfig = applyCliOptionsToPreset(
          body,
          `preset-${presetName.toLowerCase()}`,
          'npm',
          {}
        );
        const projectDir = path.join(tempDir, config.projectName);

        await new MonorepoGenerator(config).generate(projectDir);

        expect(await fs.pathExists(path.join(projectDir, 'stackr.config.json'))).toBe(true);

        const cfg = await loadStackrConfig(projectDir);
        expect(cfg).toBeTruthy();
        expect(cfg!.projectName).toBe(config.projectName);

        // Every expected service exists on disk as its own directory
        for (const svc of config.services) {
          expect(
            await fs.pathExists(path.join(projectDir, svc.name, 'backend')),
            `missing ${svc.name}/backend`
          ).toBe(true);
        }

        // stackr.config.json matches the input services exactly
        expect(cfg!.services.map((s) => s.name).sort()).toEqual(
          config.services.map((s) => s.name).sort()
        );
      });
    }
  );
});
