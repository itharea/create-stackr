import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import { AI_TOOL_FILES } from '../../src/types/index.js';
import type { AITool, InitConfig } from '../../src/types/index.js';
import { multiServiceConfig } from '../fixtures/configs/multi-service.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

describe('MonorepoGenerator — preset end-to-end', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    async function generateIntoTemp(): Promise<{
      projectDir: string;
      config: InitConfig;
    }> {
      const body = loadPreset(presetName);
      const config: InitConfig = applyCliOptionsToPreset(
        body,
        `test-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      const generator = new MonorepoGenerator(config);
      await generator.generate(projectDir);
      return { projectDir, config };
    }

    it('generates every service directory', async () => {
      const { projectDir, config } = await generateIntoTemp();
      for (const svc of config.services) {
        expect(
          await fs.pathExists(path.join(projectDir, svc.name, 'backend')),
          `missing ${svc.name}/backend`
        ).toBe(true);
        if (svc.web?.enabled) {
          expect(await fs.pathExists(path.join(projectDir, svc.name, 'web'))).toBe(true);
        }
        if (svc.mobile?.enabled) {
          expect(await fs.pathExists(path.join(projectDir, svc.name, 'mobile'))).toBe(true);
        }
      }
    });

    it('writes a stackr.config.json that round-trips through loadStackrConfig', async () => {
      const { projectDir, config } = await generateIntoTemp();
      const onDisk = await loadStackrConfig(projectDir);
      expect(onDisk).toBeTruthy();
      expect(onDisk!.projectName).toBe(config.projectName);
      expect(onDisk!.services.map((s) => s.name).sort()).toEqual(
        config.services.map((s) => s.name).sort()
      );
    });

    it('writes a docker-compose.yml that parses and has one <svc>_rest_api per service', async () => {
      const { projectDir, config } = await generateIntoTemp();
      const compose = await fs.readFile(path.join(projectDir, 'docker-compose.yml'), 'utf-8');
      const parsed = YAML.parse(compose);
      const serviceKeys = Object.keys(parsed.services ?? {});
      for (const svc of config.services) {
        expect(serviceKeys).toContain(`${svc.name}_rest_api`);
      }
    });

    it('writes docker-compose.prod.yml that parses', async () => {
      const { projectDir } = await generateIntoTemp();
      const prod = await fs.readFile(path.join(projectDir, 'docker-compose.prod.yml'), 'utf-8');
      const parsed = YAML.parse(prod);
      expect(parsed).toBeTruthy();
    });

    it('every service entry has backend.tests === true by default', async () => {
      const { projectDir } = await generateIntoTemp();
      const onDisk = await loadStackrConfig(projectDir);
      expect(onDisk.services.length).toBeGreaterThan(0);
      for (const svc of onDisk.services) {
        expect(svc.backend.tests, `${svc.name} should have backend.tests === true`).toBe(true);
      }
    });
  });
});

describe('MonorepoGenerator — multi-service fixture', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-multi-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('generates 4-service layout with isolated backend dirs', async () => {
    const projectDir = path.join(tempDir, multiServiceConfig.projectName);
    const generator = new MonorepoGenerator(multiServiceConfig);
    await generator.generate(projectDir);

    for (const svc of multiServiceConfig.services) {
      expect(
        await fs.pathExists(path.join(projectDir, svc.name, 'backend')),
        `missing ${svc.name}/backend`
      ).toBe(true);
    }
  });

  it('non-auth services receive AUTH_SERVICE_URL in docker-compose, auth does not', async () => {
    const projectDir = path.join(tempDir, multiServiceConfig.projectName);
    await new MonorepoGenerator(multiServiceConfig).generate(projectDir);

    const compose = await fs.readFile(path.join(projectDir, 'docker-compose.yml'), 'utf-8');
    const parsed = YAML.parse(compose);
    for (const svc of multiServiceConfig.services) {
      const dockerSvc = JSON.stringify(parsed.services[`${svc.name}_rest_api`] ?? {});
      if (svc.kind === 'auth') {
        expect(dockerSvc).not.toContain('AUTH_SERVICE_URL');
      } else {
        expect(dockerSvc).toContain('AUTH_SERVICE_URL');
      }
    }
  });

  it('drops no project-shell files — project-shell templates land at project root', async () => {
    const projectDir = path.join(tempDir, multiServiceConfig.projectName);
    await new MonorepoGenerator(multiServiceConfig).generate(projectDir);

    expect(await fs.pathExists(path.join(projectDir, 'README.md'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'DESIGN.md'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'scripts/setup.mjs'))).toBe(true);

    // Leaked-subdirectory regression guard
    expect(await fs.pathExists(path.join(projectDir, 'project'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, 'monorepo-root'))).toBe(false);
  });
});

describe('MonorepoGenerator — AI tool file generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-ai-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  async function generateWithAiTools(aiTools: AITool[]): Promise<string> {
    const cfg = cloneInitConfig(multiServiceConfig);
    cfg.projectName = `ai-${aiTools.length === 0 ? 'none' : aiTools.join('-')}`;
    cfg.aiTools = aiTools;
    const projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
    return projectDir;
  }

  it('codex alone generates AGENTS.md and nothing else', async () => {
    const projectDir = await generateWithAiTools(['codex']);
    expect(await fs.pathExists(path.join(projectDir, 'AGENTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'CLAUDE.md'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, '.windsurfrules'))).toBe(false);
  });

  it('codex + claude generates both AGENTS.md and CLAUDE.md', async () => {
    const projectDir = await generateWithAiTools(['codex', 'claude']);
    expect(await fs.pathExists(path.join(projectDir, 'AGENTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'CLAUDE.md'))).toBe(true);
  });

  it('empty aiTools generates none of the four files', async () => {
    const projectDir = await generateWithAiTools([]);
    for (const fileName of Object.values(AI_TOOL_FILES)) {
      expect(await fs.pathExists(path.join(projectDir, fileName))).toBe(false);
    }
  });

  it('all four tools generates all four files', async () => {
    const projectDir = await generateWithAiTools(['codex', 'claude', 'cursor', 'windsurf']);
    for (const fileName of Object.values(AI_TOOL_FILES)) {
      expect(await fs.pathExists(path.join(projectDir, fileName))).toBe(true);
    }
  });

  it('all rendered AI tool files share the same content (single source of truth)', async () => {
    const projectDir = await generateWithAiTools(['codex', 'claude', 'cursor', 'windsurf']);
    // All 4 files must come from templates/shared/AGENTS.md.ejs and must
    // contain the fix-#2 regression-lock phrases.
    for (const fileName of Object.values(AI_TOOL_FILES)) {
      const contents = await fs.readFile(path.join(projectDir, fileName), 'utf-8');
      expect(contents).toMatch(/upward/i);
      expect(contents).toMatch(/parent DESIGN\.md/);
      expect(contents).not.toMatch(/monorepo-root/);
    }
  });
});
