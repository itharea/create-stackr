import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  loadStackrConfig,
  saveStackrConfig,
  migrateConfig,
  StackrConfigNotFoundError,
  InvalidStackrConfigError,
  UnsupportedConfigVersionError,
} from '../../src/utils/config-file.js';
import {
  STACKR_CONFIG_FILENAME,
  STACKR_CONFIG_KEY_ORDER,
  STACKR_CONFIG_VERSION,
  type StackrConfigFile,
} from '../../src/types/config-file.js';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import type { InitConfig } from '../../src/types/index.js';
import { authEntry, coreEntry } from '../../src/config/presets.js';
import { vi } from 'vitest';

vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ shouldCleanup: false }),
  },
}));

function makeCfg(overrides: Partial<StackrConfigFile> = {}): StackrConfigFile {
  return {
    version: 1,
    stackrVersion: '0.5.0-test',
    projectName: 'test-project',
    createdAt: '2026-04-10T00:00:00.000Z',
    packageManager: 'bun',
    orm: 'prisma',
    aiTools: ['codex'],
    appScheme: 'testproject',
    services: [
      {
        name: 'core',
        kind: 'base',
        backend: {
          port: 8080,
          eventQueue: false,
          imageUploads: false,
          authMiddleware: 'none',
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

describe('config-file utils', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'config-file-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('saveStackrConfig / loadStackrConfig round-trip', () => {
    it('round-trips a valid v1 config', async () => {
      const cfg = makeCfg();
      await saveStackrConfig(tempDir, cfg);

      const loaded = await loadStackrConfig(tempDir);
      expect(loaded).toEqual(cfg);
    });

    it('writes the file with a trailing newline', async () => {
      const cfg = makeCfg();
      await saveStackrConfig(tempDir, cfg);

      const raw = await fs.readFile(path.join(tempDir, STACKR_CONFIG_FILENAME), 'utf-8');
      expect(raw.endsWith('\n')).toBe(true);
    });

    it('emits top-level keys in STACKR_CONFIG_KEY_ORDER', async () => {
      // Deliberately construct the object with keys in a randomized order
      // to prove the replacer — not object literal order — controls output.
      const cfg: StackrConfigFile = {
        services: makeCfg().services,
        appScheme: 'testproject',
        aiTools: ['codex'],
        orm: 'prisma',
        packageManager: 'bun',
        createdAt: '2026-04-10T00:00:00.000Z',
        projectName: 'test-project',
        stackrVersion: '0.5.0-test',
        version: 1,
      };

      await saveStackrConfig(tempDir, cfg);
      const raw = await fs.readFile(path.join(tempDir, STACKR_CONFIG_FILENAME), 'utf-8');

      const observedOrder: string[] = [];
      for (const key of STACKR_CONFIG_KEY_ORDER) {
        const idx = raw.indexOf(`"${key}"`);
        if (idx >= 0) observedOrder.push(key);
      }

      // Every present key must appear in monotonically increasing position.
      const positions = observedOrder.map((k) => raw.indexOf(`"${k}"`));
      const sorted = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(sorted);
    });
  });

  describe('loadStackrConfig error handling', () => {
    it('throws StackrConfigNotFoundError when file is missing', async () => {
      await expect(loadStackrConfig(tempDir)).rejects.toBeInstanceOf(
        StackrConfigNotFoundError
      );
    });

    it('throws InvalidStackrConfigError when JSON is malformed', async () => {
      await fs.writeFile(path.join(tempDir, STACKR_CONFIG_FILENAME), '{ not json', 'utf-8');
      await expect(loadStackrConfig(tempDir)).rejects.toBeInstanceOf(
        InvalidStackrConfigError
      );
    });

    it('throws InvalidStackrConfigError when required field is missing', async () => {
      const broken = { ...makeCfg(), projectName: undefined };
      await fs.writeFile(
        path.join(tempDir, STACKR_CONFIG_FILENAME),
        JSON.stringify(broken),
        'utf-8'
      );
      await expect(loadStackrConfig(tempDir)).rejects.toBeInstanceOf(
        InvalidStackrConfigError
      );
    });

    it('throws UnsupportedConfigVersionError for unknown version', async () => {
      const futureCfg = { ...makeCfg(), version: 2 };
      await fs.writeFile(
        path.join(tempDir, STACKR_CONFIG_FILENAME),
        JSON.stringify(futureCfg),
        'utf-8'
      );
      await expect(loadStackrConfig(tempDir)).rejects.toBeInstanceOf(
        UnsupportedConfigVersionError
      );
    });
  });

  describe('migrateConfig', () => {
    it('accepts a valid v1 config unchanged', () => {
      const cfg = makeCfg();
      expect(migrateConfig(cfg)).toEqual(cfg);
    });

    it('throws UnsupportedConfigVersionError for v2', () => {
      const cfg = { ...makeCfg(), version: 2 };
      expect(() => migrateConfig(cfg)).toThrow(UnsupportedConfigVersionError);
    });

    it('throws on malformed input (non-object)', () => {
      expect(() => migrateConfig(null)).toThrow();
      expect(() => migrateConfig('string')).toThrow();
      expect(() => migrateConfig(42)).toThrow();
    });

    it('throws when required field is missing', () => {
      const missingProject = { ...makeCfg() } as Partial<StackrConfigFile>;
      delete missingProject.projectName;
      expect(() => migrateConfig(missingProject)).toThrow();
    });

    it('version constant matches the one the migrator accepts', () => {
      expect(STACKR_CONFIG_VERSION).toBe(1);
    });
  });

  /**
   * Secret-leak guard.
   *
   * `ProjectConfig.integrations` carries API keys (iosKey, androidKey,
   * appToken, apiKey). `stackr.config.json` is committed to git and must
   * never contain any of those fields. A future refactor that accidentally
   * spreads `projectConfig.integrations` back in would break this test.
   */
  describe('secret leak guard', () => {
    it('never writes integration API keys into stackr.config.json', async () => {
      const config: InitConfig = {
        projectName: 'leak-test',
        packageManager: 'npm',
        appScheme: 'leaktest',
        orm: 'prisma',
        aiTools: ['codex'],
        preset: 'full-featured',
        customized: false,
        services: [
          authEntry({
            providers: { emailPassword: true, google: true, apple: true, github: false },
            emailVerification: true,
            passwordReset: true,
            adminDashboard: true,
            provisioningTargets: ['core'],
          }),
          coreEntry({
            name: 'core',
            backend: {
              port: 8080,
              eventQueue: false,
              imageUploads: false,
              authMiddleware: 'standard',
            },
            web: { enabled: true, port: 3000 },
            mobile: { enabled: true },
            integrations: {
              revenueCat: {
                enabled: true,
                iosKey: 'SECRET_IOS_KEY_abc123',
                androidKey: 'SECRET_ANDROID_KEY_xyz789',
              },
              adjust: {
                enabled: true,
                appToken: 'SECRET_ADJUST_TOKEN_qqq',
                environment: 'production',
              },
              scate: { enabled: true, apiKey: 'SECRET_SCATE_KEY_ppp' },
              att: { enabled: true },
            },
          }),
        ],
      };

      const projectDir = path.join(tempDir, 'leak-test');
      const generator = new MonorepoGenerator(config);
      await generator.generate(projectDir);

      const raw = await fs.readFile(
        path.join(projectDir, STACKR_CONFIG_FILENAME),
        'utf-8'
      );

      expect(raw).not.toContain('SECRET_IOS_KEY_abc123');
      expect(raw).not.toContain('SECRET_ANDROID_KEY_xyz789');
      expect(raw).not.toContain('SECRET_ADJUST_TOKEN_qqq');
      expect(raw).not.toContain('SECRET_SCATE_KEY_ppp');

      expect(raw).not.toMatch(/"iosKey"/);
      expect(raw).not.toMatch(/"androidKey"/);
      expect(raw).not.toMatch(/"appToken"/);
      expect(raw).not.toMatch(/"apiKey"/);

      const parsed: StackrConfigFile = JSON.parse(raw);
      const coreService = parsed.services.find((s) => s.name === 'core');
      expect(coreService).toBeDefined();
      expect(coreService!.integrations?.revenueCat.enabled).toBe(true);
      expect(coreService!.integrations?.adjust.enabled).toBe(true);
      expect(coreService!.integrations?.scate.enabled).toBe(true);
      expect(coreService!.integrations?.att.enabled).toBe(true);
    });
  });
});
