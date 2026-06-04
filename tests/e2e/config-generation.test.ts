import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { TEST_CONFIGS } from '../fixtures/configs/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC_ENTRY = path.join(REPO_ROOT, 'src/entrypoints/create.ts');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules/.bin/tsx');

/**
 * E2E config generation — proves a generated project yields a valid tree
 * containing `stackr.config.json` with the expected services.
 *
 * The built-in default config is exercised via a real CLI spawn
 * (`tsx src/index.ts … --defaults`) — the only non-interactive path. The
 * richer fixture configs (auth + web/mobile/eventQueue/integrations) drive
 * `MonorepoGenerator.generate` directly — still an end-to-end
 * project-on-disk assertion, just without the subprocess.
 */
describe('E2E config generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-config-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('--defaults via CLI spawn produces a valid Drizzle project', async () => {
    const projectName = 'defaults-cli-e2e';

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
    expect(cfg!.orm).toBe('drizzle');

    const names = cfg!.services.map((s) => s.name).sort();
    expect(names).toContain('auth');
    expect(names).toContain('core');
  }, 90000);

  describe.each(TEST_CONFIGS.map((c) => [c.name, c.config] as const))(
    '%s (direct generator)',
    (_name, config) => {
      it('generates a valid project with expected services', async () => {
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
