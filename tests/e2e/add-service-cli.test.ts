import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const STACKR_ENTRY = path.join(REPO_ROOT, 'src/entrypoints/stackr.ts');
const TSX_BIN = path.join(REPO_ROOT, 'node_modules/.bin/tsx');

/**
 * End-to-end CLI spawn of `stackr add service` against a freshly-generated
 * minimal monorepo. Drives the full entrypoint → command → writes-to-disk
 * path via a subprocess so we catch any regressions that only surface
 * outside the in-process test harness.
 */
describe('E2E: stackr add service via CLI spawn', () => {
  let tempDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-add-service-'));
    projectDir = path.join(tempDir, 'e2e-add-service');
    const cfg = cloneInitConfig(minimalConfig);
    cfg.projectName = 'e2e-add-service';
    await new MonorepoGenerator(cfg).generate(projectDir);

    // Seed .env from .env.example so the env merge path runs.
    const envExample = path.join(projectDir, '.env.example');
    if (await fs.pathExists(envExample)) {
      await fs.copy(envExample, path.join(projectDir, '.env'));
    }
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('exits 0 and scaffolds the expected file tree', async () => {
    const result = await execa(TSX_BIN, [STACKR_ENTRY, 'add', 'service', 'wallet', '--no-install'], {
      cwd: projectDir,
      reject: false,
      timeout: 90000,
    });

    expect(result.exitCode, `stderr: ${result.stderr}`).toBe(0);
    expect(await fs.pathExists(path.join(projectDir, 'wallet/backend'))).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'wallet/backend/package.json'))
    ).toBe(true);

    const cfg = await loadStackrConfig(projectDir);
    expect(cfg.services.map((s) => s.name)).toContain('wallet');
    expect(cfg.pendingMigrations).toHaveLength(1);

    // The compose file has the new service entries
    const compose = await fs.readFile(
      path.join(projectDir, 'docker-compose.yml'),
      'utf-8'
    );
    expect(compose).toContain('wallet_rest_api');

    // Next-steps output includes the migrate hint box
    expect(result.stdout).toContain('Auth schema changed');
    expect(result.stdout).toContain('stackr migrations ack auth');
  }, 120000);

  it('migrations ack clears the pending entry via CLI spawn', async () => {
    // First add a service so we have a pending migration
    await execa(TSX_BIN, [STACKR_ENTRY, 'add', 'service', 'wallet', '--no-install'], {
      cwd: projectDir,
      reject: true,
      timeout: 90000,
    });

    const result = await execa(TSX_BIN, [STACKR_ENTRY, 'migrations', 'ack', 'auth'], {
      cwd: projectDir,
      reject: false,
      timeout: 30000,
    });
    expect(result.exitCode).toBe(0);

    const cfg = await loadStackrConfig(projectDir);
    expect(cfg.pendingMigrations ?? []).toHaveLength(0);
  }, 120000);
});
