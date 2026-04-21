import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Phase 4: queue component tests + the bullmq helper ship only for
 * services where `backend.eventQueue === true`. The gate is kind-agnostic
 * — auth and base services both ship the same worker template today.
 */
describe('MonorepoGenerator — queue tests gating', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-queue-tests-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  async function generate(cfg: InitConfig): Promise<string> {
    const projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
    return projectDir;
  }

  function coreBackend(projectDir: string): string {
    return path.join(projectDir, 'core', 'backend');
  }

  function authBackend(projectDir: string): string {
    return path.join(projectDir, 'auth', 'backend');
  }

  it('core/backend with eventQueue: true ships queue tests + bullmq helper', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.backend.eventQueue = true;

    const projectDir = await generate(cfg);
    const backend = coreBackend(projectDir);

    expect(await fs.pathExists(path.join(backend, 'tests/component/queue/user-worker.test.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(backend, 'tests/helpers/bullmq.ts'))).toBe(true);
  });

  it('core/backend with eventQueue: false omits queue tests + bullmq helper', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.backend.eventQueue = false;

    const projectDir = await generate(cfg);
    const backend = coreBackend(projectDir);

    expect(await fs.pathExists(path.join(backend, 'tests/component/queue'))).toBe(false);
    expect(await fs.pathExists(path.join(backend, 'tests/helpers/bullmq.ts'))).toBe(false);
  });

  it('auth/backend with eventQueue: true ships queue tests + bullmq helper', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    const auth = cfg.services.find((s) => s.kind === 'auth')!;
    auth.backend.eventQueue = true;

    const projectDir = await generate(cfg);
    const backend = authBackend(projectDir);

    expect(await fs.pathExists(path.join(backend, 'tests/component/queue/user-worker.test.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(backend, 'tests/helpers/bullmq.ts'))).toBe(true);
  });

  it('auth/backend with eventQueue: false omits queue tests + bullmq helper', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    const auth = cfg.services.find((s) => s.kind === 'auth')!;
    auth.backend.eventQueue = false;

    const projectDir = await generate(cfg);
    const backend = authBackend(projectDir);

    expect(await fs.pathExists(path.join(backend, 'tests/component/queue'))).toBe(false);
    expect(await fs.pathExists(path.join(backend, 'tests/helpers/bullmq.ts'))).toBe(false);
  });
});
