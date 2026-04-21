import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import { TEST_PORT_OFFSET } from '../../src/utils/port-allocator.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Phase 5: every axios client in `tests/e2e/helpers/clients.ts` must
 * point at its service's app container on the `+10000` test-compose
 * port. A drift here would silently break cross-service tests without
 * the test runner ever talking to the e2e stack.
 */
describe('tests/e2e/helpers/clients.ts — baseURL alignment', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-e2e-ports-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    it('each <service>Client uses dev port + TEST_PORT_OFFSET', async () => {
      const body = loadPreset(presetName);
      const config: InitConfig = applyCliOptionsToPreset(
        body,
        `e2e-ports-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);

      const clientsSrc = await fs.readFile(
        path.join(projectDir, 'tests/e2e/helpers/clients.ts'),
        'utf-8'
      );

      for (const svc of config.services.filter((s) => s.backend.tests)) {
        const expectedPort = svc.backend.port + TEST_PORT_OFFSET;
        const pattern = new RegExp(
          `export const ${svc.name}Client[\\s\\S]*?baseURL:\\s*'http:\\/\\/127\\.0\\.0\\.1:${expectedPort}'`
        );
        expect(
          pattern.test(clientsSrc),
          `${svc.name}Client should target http://127.0.0.1:${expectedPort} — got:\n${clientsSrc}`
        ).toBe(true);
      }
    });
  });
});
