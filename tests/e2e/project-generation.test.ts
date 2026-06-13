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
import { fullFeaturedConfig } from '../fixtures/configs/full-featured.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

/**
 * Case-sensitive existence check, segment by segment from `rootDir`.
 * fs.existsSync lies on case-insensitive filesystems (macOS/Windows): it returns
 * true for `button.tsx` when the file on disk is `Button.tsx`. Walking readdir and
 * comparing each segment exactly catches the casing mismatches that break Linux CI.
 */
function existsCaseSensitive(absPath: string, rootDir: string): boolean {
  const rel = path.relative(rootDir, absPath);
  if (rel === '') return true;
  if (rel.startsWith('..')) return fs.existsSync(absPath); // outside root — give up, fall back
  let cur = rootDir;
  for (const seg of rel.split(path.sep)) {
    if (!seg) continue;
    let entries: string[];
    try {
      entries = fs.readdirSync(cur);
    } catch {
      return false;
    }
    if (!entries.includes(seg)) return false;
    cur = path.join(cur, seg);
  }
  return true;
}

/**
 * Resolve a module specifier (relative or the `@/` alias) against a mobile project
 * root to the first existing file, trying the usual extensions. Returns null for bare
 * (node_modules) specifiers and for unresolved imports — only internal imports matter
 * for the casing check. Mirrors the mobile tsconfig paths: `@/*` → `src/*`,
 * `@/assets/*` → `assets/*`.
 */
function resolveMobileImport(spec: string, fileDir: string, mobileRoot: string): string | null {
  let base: string;
  if (spec.startsWith('@/assets/')) base = path.join(mobileRoot, 'assets', spec.slice('@/assets/'.length));
  else if (spec.startsWith('@/')) base = path.join(mobileRoot, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(fileDir, spec);
  else return null; // bare specifier → external package
  const candidates = ['', '.ts', '.tsx', '.js', '.jsx', '.json'].map((e) => base + e).concat(
    ['/index.ts', '/index.tsx', '/index.js', '/index.jsx'].map((e) => base + e)
  );
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      /* not present */
    }
  }
  return null; // unresolved — not a casing problem (out of scope without full tsc)
}

const IMPORT_SPECIFIER_RE = /(?:from|require\(|import\()\s*['"]([^'"]+)['"]/g;

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
    const files = await globby(['**/*.ts', '**/*.tsx', '**/*.md', '**/*.json', '**/*.mjs', '**/*.yml'], {
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
    const files = await globby(['**/*.ts', '**/*.tsx', '**/*.md', '**/*.json', '**/*.mjs', '**/*.yml'], {
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

/**
 * E2E — generated mobile app guard (full-featured: auth + Google/Apple + a core
 * service with web/mobile + every integration). Lightweight stand-in for a full
 * `tsc --noEmit` (no install): catches the two classes that have bitten the mobile
 * template — filename/import casing mismatches (break Linux CI / EAS) and syntax
 * errors / unrendered EJS in mobile sources.
 *
 * NOTE: this does NOT run a full type-check, so deep type errors (removed RN/Expo
 * API surface, etc.) are not gated here — only casing and parseability.
 */
describe('E2E — generated mobile app casing + parse guard (full-featured)', () => {
  let tempDir: string;
  let projectDir: string;
  let mobileRoots: string[] = [];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-project-mobile-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
    mobileRoots = cfg.services
      .filter((s) => s.mobile?.enabled)
      .map((s) => path.join(projectDir, s.name, 'mobile'));
  }, 60000);

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('generates at least one mobile app', async () => {
    expect(mobileRoots.length).toBeGreaterThan(0);
    for (const root of mobileRoots) {
      expect(await fs.pathExists(path.join(root, 'app.json')), `missing ${root}/app.json`).toBe(true);
    }
  });

  it('every internal mobile import resolves with exact filename casing', async () => {
    const offenders: string[] = [];
    let checkedFiles = 0;
    for (const mobileRoot of mobileRoots) {
      const files = await globby(['**/*.ts', '**/*.tsx'], {
        cwd: mobileRoot,
        onlyFiles: true,
        dot: true,
        ignore: ['**/node_modules/**', '**/.expo/**'],
      });
      for (const rel of files) {
        checkedFiles++;
        const abs = path.join(mobileRoot, rel);
        const content = await fs.readFile(abs, 'utf-8');
        const fileDir = path.dirname(abs);
        for (const m of content.matchAll(IMPORT_SPECIFIER_RE)) {
          const spec = m[1];
          const hit = resolveMobileImport(spec, fileDir, mobileRoot);
          if (hit && !existsCaseSensitive(hit, mobileRoot)) {
            offenders.push(
              `${path.relative(projectDir, abs)} -> '${spec}' resolves only case-insensitively to ${path.relative(mobileRoot, hit)}`
            );
          }
        }
      }
    }
    expect(checkedFiles).toBeGreaterThan(0);
    expect(offenders, `Casing mismatches:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('every generated mobile .ts/.tsx file parses as TypeScript', async () => {
    const parseErrors: string[] = [];
    let checkedFiles = 0;
    for (const mobileRoot of mobileRoots) {
      const files = await globby(['**/*.ts', '**/*.tsx'], {
        cwd: mobileRoot,
        onlyFiles: true,
        dot: true,
        ignore: ['**/node_modules/**', '**/.expo/**'],
      });
      for (const rel of files) {
        checkedFiles++;
        const content = await fs.readFile(path.join(mobileRoot, rel), 'utf-8');
        const sourceFile = ts.createSourceFile(
          rel,
          content,
          ts.ScriptTarget.Latest,
          /* setParentNodes */ false,
          ts.ScriptKind.TSX
        );
        const diagnostics = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] })
          .parseDiagnostics;
        if (diagnostics && diagnostics.length > 0) {
          parseErrors.push(
            `${rel}: ${diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`
          );
        }
      }
    }
    expect(checkedFiles).toBeGreaterThan(0);
    expect(parseErrors, parseErrors.join('\n')).toHaveLength(0);
  });
});
