import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { vi } from 'vitest';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Shared setup for `stackr add service` integration tests.
 *
 * Creates a tempdir containing a freshly-generated minimal monorepo
 * (auth + core via MonorepoGenerator), writes a fake root `.env` from
 * the `.env.example`, and mocks `process.cwd()` so that runAddService
 * walks up to the tempdir as the project root.
 */
export interface AddServiceFixture {
  tempDir: string;
  projectDir: string;
  cleanup: () => Promise<void>;
  config: InitConfig;
  restoreCwd: () => void;
}

export async function createAddServiceFixture(
  projectName = 'test-monorepo',
  overrides: Partial<InitConfig> = {}
): Promise<AddServiceFixture> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'add-service-test-'));
  const config = { ...cloneInitConfig(minimalConfig), projectName, ...overrides };
  const projectDir = path.join(tempDir, projectName);

  await new MonorepoGenerator(config).generate(projectDir);

  // Copy .env.example → .env so env-merge tests have something to work with.
  const envExample = path.join(projectDir, '.env.example');
  if (await fs.pathExists(envExample)) {
    await fs.copy(envExample, path.join(projectDir, '.env'));
  }

  const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectDir);

  return {
    tempDir,
    projectDir,
    config,
    restoreCwd: () => cwdSpy.mockRestore(),
    cleanup: async () => {
      cwdSpy.mockRestore();
      await fs.remove(tempDir);
    },
  };
}
