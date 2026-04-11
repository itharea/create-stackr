import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import ts from 'typescript';
import { globby } from 'globby';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { multiServiceConfig } from '../fixtures/configs/multi-service.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

/**
 * E2E — project generation. Walks the entire generated tree with a
 * battery of file-level assertions:
 *
 *   (a) no unreplaced `<%= %>` or `<% %>` in any generated .ts/.md/.json
 *   (b) every generated package.json is valid JSON
 *   (c) every generated .ts in `auth/backend/` and `<base>/backend/`
 *       parses with `ts.createSourceFile` (zero parse diagnostics)
 *   (d) docker-compose.yml and docker-compose.prod.yml parse via yaml.parse
 *   (e) stackr.config.json round-trips through loadStackrConfig
 */
describe('E2E — project generation file-level assertions (minimal)', () => {
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-project-min-'));
    const cfg = cloneInitConfig(minimalConfig);
    cfg.projectName = 'e2e-min';
    cfg.appScheme = 'e2emin';
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  }, 60000);

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('no unreplaced EJS tokens in any generated .ts/.md/.json', async () => {
    const files = await globby(['**/*.ts', '**/*.tsx', '**/*.md', '**/*.json'], {
      cwd: projectDir,
      onlyFiles: true,
      dot: true,
      gitignore: false,
      ignore: ['**/node_modules/**'],
    });
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const rel of files) {
      const contents = await fs.readFile(path.join(projectDir, rel), 'utf-8');
      if (/<%[=_-]?/.test(contents) || /%>/.test(contents)) {
        offenders.push(rel);
      }
    }
    expect(offenders, `Unrendered EJS in: ${offenders.join(', ')}`).toHaveLength(0);
  });

  it('every generated package.json is valid JSON', async () => {
    const files = await globby('**/package.json', {
      cwd: projectDir,
      onlyFiles: true,
      ignore: ['**/node_modules/**'],
    });
    expect(files.length).toBeGreaterThan(0);
    for (const rel of files) {
      const raw = await fs.readFile(path.join(projectDir, rel), 'utf-8');
      expect(() => JSON.parse(raw), `Invalid JSON in ${rel}`).not.toThrow();
    }
  });

  it('every generated .ts/.tsx file under */backend/ parses as TypeScript', async () => {
    const files = await globby(['**/backend/**/*.ts', '**/backend/**/*.tsx'], {
      cwd: projectDir,
      onlyFiles: true,
      dot: true,
      ignore: ['**/node_modules/**'],
    });
    expect(files.length).toBeGreaterThan(0);
    const parseErrors: string[] = [];
    for (const rel of files) {
      const content = await fs.readFile(path.join(projectDir, rel), 'utf-8');
      const sourceFile = ts.createSourceFile(
        rel,
        content,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ false,
        ts.ScriptKind.TSX
      );
      // parseDiagnostics is an internal property populated by the parser.
      const diagnostics = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] })
        .parseDiagnostics;
      if (diagnostics && diagnostics.length > 0) {
        parseErrors.push(
          `${rel}: ${diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`
        );
      }
    }
    expect(parseErrors, parseErrors.join('\n')).toHaveLength(0);
  });

  it('docker-compose.yml and docker-compose.prod.yml parse as YAML', async () => {
    const devRaw = await fs.readFile(path.join(projectDir, 'docker-compose.yml'), 'utf-8');
    const prodRaw = await fs.readFile(path.join(projectDir, 'docker-compose.prod.yml'), 'utf-8');
    const dev = YAML.parse(devRaw);
    const prod = YAML.parse(prodRaw);
    expect(dev).toBeTruthy();
    expect(prod).toBeTruthy();
    expect(dev.services).toBeTruthy();
  });

  it('stackr.config.json round-trips through loadStackrConfig', async () => {
    const loaded = await loadStackrConfig(projectDir);
    expect(loaded).toBeTruthy();
    expect(loaded!.projectName).toBe('e2e-min');
    expect(loaded!.services.map((s) => s.name).sort()).toEqual(['auth', 'core']);
  });

  it('per-service .env.example files exist for every service', async () => {
    const loaded = await loadStackrConfig(projectDir);
    for (const svc of loaded!.services) {
      const envExample = path.join(projectDir, svc.name, 'backend', '.env.example');
      expect(await fs.pathExists(envExample), `missing ${svc.name}/backend/.env.example`).toBe(
        true
      );
    }
  });

  it('auth/backend lib/auth.ts uses the right ORM flavor (no .prisma/.drizzle suffix)', async () => {
    const authLib = path.join(projectDir, 'auth/backend/lib/auth.ts');
    expect(await fs.pathExists(authLib)).toBe(true);
    // Ensure there are no dangling .prisma.ts or .drizzle.ts files in the
    // auth/backend subtree
    const files = await globby(
      ['auth/backend/**/*.prisma.ts', 'auth/backend/**/*.drizzle.ts'],
      { cwd: projectDir, onlyFiles: true, ignore: ['**/node_modules/**'] }
    );
    expect(files, files.join(', ')).toHaveLength(0);
  });
});

describe('E2E — project generation file-level assertions (multi-service)', () => {
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-project-multi-'));
    projectDir = path.join(tempDir, multiServiceConfig.projectName);
    await new MonorepoGenerator(multiServiceConfig).generate(projectDir);
  }, 60000);

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('all 4 services exist with their own backend/ dirs', async () => {
    for (const svc of multiServiceConfig.services) {
      expect(
        await fs.pathExists(path.join(projectDir, svc.name, 'backend')),
        `missing ${svc.name}/backend`
      ).toBe(true);
    }
  });

  it('no unreplaced EJS tokens in any .ts/.md/.json file', async () => {
    const files = await globby(['**/*.ts', '**/*.tsx', '**/*.md', '**/*.json'], {
      cwd: projectDir,
      onlyFiles: true,
      dot: true,
      ignore: ['**/node_modules/**'],
    });
    const offenders: string[] = [];
    for (const rel of files) {
      const contents = await fs.readFile(path.join(projectDir, rel), 'utf-8');
      if (/<%[=_-]?/.test(contents) || /%>/.test(contents)) {
        offenders.push(rel);
      }
    }
    expect(offenders, offenders.join(', ')).toHaveLength(0);
  });

  it('docker-compose.yml parses and has one rest_api service per monorepo service', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'docker-compose.yml'), 'utf-8');
    const parsed = YAML.parse(raw);
    for (const svc of multiServiceConfig.services) {
      expect(Object.keys(parsed.services)).toContain(`${svc.name}_rest_api`);
    }
  });
});
