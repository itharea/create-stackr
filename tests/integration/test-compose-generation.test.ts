import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import type { InitConfig } from '../../src/types/index.js';
import { TEST_PORT_OFFSET } from '../../src/utils/port-allocator.js';

/**
 * End-to-end: every preset writes a `docker-compose.test.yml` whose shape
 * matches the phase 2 contract — two profiles, +10000 host ports, and
 * cross-service `AUTH_SERVICE_URL` wiring on base services.
 */
describe('MonorepoGenerator — docker-compose.test.yml generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-compose-gen-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    async function generate(): Promise<{ projectDir: string; config: InitConfig }> {
      const body = loadPreset(presetName);
      const config: InitConfig = applyCliOptionsToPreset(
        body,
        `test-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);
      return { projectDir, config };
    }

    it('writes docker-compose.test.yml containing *_db_test + *_redis_test for every service with tests', async () => {
      const { projectDir, config } = await generate();
      const parsed = YAML.parse(
        await fs.readFile(path.join(projectDir, 'docker-compose.test.yml'), 'utf-8')
      );
      const keys = Object.keys(parsed.services);
      for (const svc of config.services.filter((s) => s.backend.tests)) {
        expect(keys).toContain(`${svc.name}_db_test`);
        expect(keys).toContain(`${svc.name}_redis_test`);
        expect(keys).toContain(`${svc.name}_db_migrate`);
        expect(keys).toContain(`${svc.name}_rest_api`);
      }
    });

    it('host ports are exactly dev + TEST_PORT_OFFSET on every app container', async () => {
      const { projectDir, config } = await generate();
      const parsed = YAML.parse(
        await fs.readFile(path.join(projectDir, 'docker-compose.test.yml'), 'utf-8')
      );
      for (const svc of config.services.filter((s) => s.backend.tests)) {
        const api = parsed.services[`${svc.name}_rest_api`];
        expect(api.ports).toEqual([
          `127.0.0.1:${svc.backend.port + TEST_PORT_OFFSET}:${svc.backend.port}`,
        ]);
      }
    });

    it('base-service AUTH_SERVICE_URL points at <auth>_rest_api:<auth dev port>', async () => {
      const { projectDir, config } = await generate();
      const auth = config.services.find((s) => s.kind === 'auth');
      if (!auth) {
        return; // preset has no auth service
      }
      const parsed = YAML.parse(
        await fs.readFile(path.join(projectDir, 'docker-compose.test.yml'), 'utf-8')
      );
      for (const base of config.services.filter((s) => s.kind === 'base' && s.backend.tests)) {
        const env = parsed.services[`${base.name}_rest_api`].environment;
        const envStr = typeof env === 'string' ? env : JSON.stringify(env);
        expect(envStr).toContain(
          `http://${auth.name}_rest_api:${auth.backend.port}`
        );
      }
    });
  });
});
