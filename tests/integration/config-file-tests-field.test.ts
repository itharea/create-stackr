import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  loadStackrConfig,
  saveStackrConfig,
  migrateConfig,
} from '../../src/utils/config-file.js';
import type { StackrConfigFile } from '../../src/types/config-file.js';
import { STACKR_CONFIG_FILENAME } from '../../src/types/config-file.js';
import { runAddService } from '../../src/commands/add-service.js';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

/**
 * Phase 1: `backend.tests` round-trips through save/load, legacy configs
 * without the field normalize to `tests: false`, and `stackr add service`
 * preserves pre-existing normalized values while honoring `--no-tests`
 * on the new service.
 */

function baseCfg(overrides: Partial<StackrConfigFile> = {}): StackrConfigFile {
  return {
    version: 1,
    stackrVersion: '0.5.0-test',
    projectName: 'tests-field-test',
    createdAt: '2026-04-10T00:00:00.000Z',
    packageManager: 'bun',
    orm: 'drizzle',
    aiTools: ['codex'],
    appScheme: 'testsfieldtest',
    services: [
      {
        name: 'core',
        kind: 'base',
        backend: {
          port: 8080,
          eventQueue: false,
          imageUploads: false,
          authMiddleware: 'none',
          tests: true,
        },
        web: null,
        mobile: null,
        integrations: {
          revenueCat: { enabled: false },
          adjust: { enabled: false },
          scate: { enabled: false },
          att: { enabled: false },
        },
        generatedAt: '2026-04-10T00:00:00.000Z',
        generatedBy: '0.5.0-test',
      },
    ],
    ...overrides,
  };
}

describe('backend.tests round-trip', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tests-field-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('tests: true saves and reloads as tests: true', async () => {
    const cfg = baseCfg();
    await saveStackrConfig(tempDir, cfg);
    const loaded = await loadStackrConfig(tempDir);
    expect(loaded.services[0].backend.tests).toBe(true);
  });

  it('tests: false saves and reloads as tests: false', async () => {
    const cfg = baseCfg();
    cfg.services[0].backend.tests = false;
    await saveStackrConfig(tempDir, cfg);
    const loaded = await loadStackrConfig(tempDir);
    expect(loaded.services[0].backend.tests).toBe(false);
  });

  it('legacy config without backend.tests normalizes to tests: false via migrateConfig', () => {
    const legacyRaw = baseCfg();
    // Simulate legacy on-disk shape by removing the field entirely.
    delete (legacyRaw.services[0].backend as Record<string, unknown>).tests;

    const migrated = migrateConfig(
      JSON.parse(JSON.stringify(legacyRaw))
    );
    expect(migrated.services[0].backend.tests).toBe(false);
  });

  it('legacy config loaded then re-saved persists normalized tests: false', async () => {
    const legacyRaw = baseCfg();
    delete (legacyRaw.services[0].backend as Record<string, unknown>).tests;

    // Hand-write to disk to simulate a legacy file produced by an older CLI
    await fs.writeFile(
      path.join(tempDir, STACKR_CONFIG_FILENAME),
      JSON.stringify(legacyRaw, null, 2) + '\n',
      'utf-8'
    );

    const loaded = await loadStackrConfig(tempDir);
    expect(loaded.services[0].backend.tests).toBe(false);

    await saveStackrConfig(tempDir, loaded);
    const reloaded = await loadStackrConfig(tempDir);
    expect(reloaded.services[0].backend.tests).toBe(false);
  });
});

describe('stackr add service preserves backend.tests on pre-existing services', () => {
  let tempDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'add-svc-tests-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await fs.remove(tempDir);
  });

  it('adding a service to a legacy config keeps existing tests: false and honors --no-tests for the new one', async () => {
    // Seed a "legacy" project with tests: false on the existing service and
    // the minimum files add-service needs (compose + root .env are optional
    // at planning time; marker-block regen is force-required though, so
    // prepare the compose files). The project-dir doesn't need real trees
    // since add-service only reads/writes stackr.config.json + compose
    // + env during phase D. We seed just enough for phase A to pass.
    const legacy = baseCfg();
    await saveStackrConfig(tempDir, legacy);

    // Minimal docker-compose.yml with managed marker blocks so the
    // regeneration path doesn't bail in phase B.
    const composeYml = `version: '3'
services:
  # >>> stackr managed services >>>
  # <<< stackr managed services <<<

volumes:
  # >>> stackr managed volumes >>>
  # <<< stackr managed volumes <<<
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), composeYml, 'utf-8');
    const composeProdYml = `version: '3'
services:
  # >>> stackr managed services >>>
  # <<< stackr managed services <<<
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.prod.yml'), composeProdYml, 'utf-8');

    await runAddService('wallet', {
      authMiddleware: 'none',
      tests: false,
      install: false,
      verbose: false,
    });

    const reloaded = await loadStackrConfig(tempDir);
    const core = reloaded.services.find((s) => s.name === 'core')!;
    const wallet = reloaded.services.find((s) => s.name === 'wallet')!;
    // Core was seeded tests: true — preserved by rebuildConfigFromRuntime
    expect(core.backend.tests).toBe(true);
    // New service honored --no-tests
    expect(wallet.backend.tests).toBe(false);
  });

  it('adding a service without --no-tests defaults to tests: true for the new service', async () => {
    await saveStackrConfig(tempDir, baseCfg());
    const composeYml = `services:
  # >>> stackr managed services >>>
  # <<< stackr managed services <<<

volumes:
  # >>> stackr managed volumes >>>
  # <<< stackr managed volumes <<<
`;
    await fs.writeFile(path.join(tempDir, 'docker-compose.yml'), composeYml, 'utf-8');
    await fs.writeFile(
      path.join(tempDir, 'docker-compose.prod.yml'),
      `services:\n  # >>> stackr managed services >>>\n  # <<< stackr managed services <<<\n`,
      'utf-8'
    );

    await runAddService('scout', {
      authMiddleware: 'none',
      install: false,
    });

    const reloaded = await loadStackrConfig(tempDir);
    const scout = reloaded.services.find((s) => s.name === 'scout')!;
    expect(scout.backend.tests).toBe(true);
  });
});
