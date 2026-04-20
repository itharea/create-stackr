import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';

/**
 * Phase 3 refactored `controllers/rest-api/server.ts` from a
 * module-level singleton (`export default server`) to an async factory
 * (`export async function buildServer()`). Tests rely on the factory to
 * spin up isolated in-process servers via `app.inject()`. Lock down
 * both ends of the rename so a regression shows up immediately.
 */
describe('buildServer() factory refactor', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-build-server-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    it('every backend exports buildServer and its index.ts imports it', async () => {
      const body = loadPreset(presetName);
      const config = applyCliOptionsToPreset(
        body,
        `buildserver-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);

      for (const svc of config.services) {
        const serverFile = path.join(
          projectDir,
          svc.name,
          'backend/controllers/rest-api/server.ts'
        );
        const indexFile = path.join(
          projectDir,
          svc.name,
          'backend/controllers/rest-api/index.ts'
        );
        const server = await fs.readFile(serverFile, 'utf-8');
        const index = await fs.readFile(indexFile, 'utf-8');

        expect(server).toMatch(/export async function buildServer\s*\(/);
        expect(server).not.toMatch(/^export default server\b/m);
        expect(index).toContain('import { buildServer } from "./server"');
        expect(index).not.toMatch(/import server from ['"]\.\/server['"]/);
      }
    });
  });
});
