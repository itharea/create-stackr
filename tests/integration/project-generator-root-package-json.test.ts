import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { readStackrVersion } from '../../src/utils/version.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { fullFeaturedConfig } from '../fixtures/configs/full-featured.js';

/**
 * Regression coverage for #57 — v0.5 generated monorepos had no root
 * `package.json`, so the second CLI binary shipped by `create-stackr`
 * (`stackr`) was unreachable inside the generated project unless the
 * user happened to have it installed globally. These tests lock in:
 *
 *   1. A root `package.json` is now generated at the project root.
 *   2. It pins `create-stackr` as a devDependency at the current
 *      generator version via `^<stackrVersion>`, so `npm install` at
 *      the root drops `stackr` into `node_modules/.bin`.
 *   3. It exposes a `"stackr": "stackr"` script, so users can also run
 *      the binary via `<pkgmgr> run stackr -- <args>`.
 *   4. `setup.sh` runs a non-fatal root install before the per-service
 *      installs so `stackr` is available without any manual steps.
 *   5. `setup.sh` prints a clear fallback hint when the root install
 *      fails, and the README documents all three invocation paths.
 */

describe('MonorepoGenerator — root package.json', () => {
  let tempDir: string;
  let projectDir: string;
  const expectedVersion = readStackrVersion();

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-root-pkg-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    cfg.projectName = 'test-root-pkg';
    cfg.appScheme = 'testrootpkg';
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('writes package.json at the project root', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'package.json'))).toBe(
      true
    );
  });

  it('root package.json parses as JSON and has the expected top-level shape', async () => {
    const raw = await fs.readFile(
      path.join(projectDir, 'package.json'),
      'utf-8'
    );
    const pkg = JSON.parse(raw);
    expect(pkg.name).toBe('test-root-pkg');
    expect(pkg.version).toBe('0.1.0');
    expect(pkg.private).toBe(true);
    expect(typeof pkg.description).toBe('string');
  });

  it('root package.json pins create-stackr as a devDependency at the current generator version', async () => {
    const raw = await fs.readFile(
      path.join(projectDir, 'package.json'),
      'utf-8'
    );
    const pkg = JSON.parse(raw);
    expect(pkg.devDependencies).toBeDefined();
    expect(pkg.devDependencies['create-stackr']).toBe(`^${expectedVersion}`);
    // Nothing in `dependencies` — the root is dev-tooling only.
    expect(pkg.dependencies).toBeUndefined();
  });

  it('root package.json exposes a "stackr" npm script aliased to the binary', async () => {
    const raw = await fs.readFile(
      path.join(projectDir, 'package.json'),
      'utf-8'
    );
    const pkg = JSON.parse(raw);
    expect(pkg.scripts?.stackr).toBe('stackr');
  });

  it('project name is interpolated into package.json "name" across kebab-case', async () => {
    // Spot-check that EJS interpolation uses the projectName as-is.
    const kebabTempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'project-gen-root-pkg-kebab-')
    );
    try {
      const cfg = cloneInitConfig(fullFeaturedConfig);
      cfg.projectName = 'multi-word-project';
      cfg.appScheme = 'multiwordproject';
      const dir = path.join(kebabTempDir, cfg.projectName);
      await new MonorepoGenerator(cfg).generate(dir);
      const raw = await fs.readFile(path.join(dir, 'package.json'), 'utf-8');
      const pkg = JSON.parse(raw);
      expect(pkg.name).toBe('multi-word-project');
    } finally {
      await fs.remove(kebabTempDir);
    }
  });

  // ---------------------------------------------------------------------------
  // setup.mjs wiring
  // ---------------------------------------------------------------------------

  it('setup.mjs runs a root install inside an `if (existsSync("package.json"))` guard', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.mjs'),
      'utf-8'
    );
    expect(setup).toMatch(/existsSync\('package\.json'\)/);
    expect(setup).toMatch(/Installing monorepo-root devDependencies/);
    expect(setup).toMatch(/const PM = 'npm'/); // default packageManager in the fixture
  });

  it('setup.mjs root install failure path is non-fatal and prints a fallback hint', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.mjs'),
      'utf-8'
    );
    // The install branches on spawnSync status so a non-zero exit doesn't
    // abort the rest of setup.mjs — it logs the fallback and continues.
    expect(setup).toMatch(/r\.status === 0/);
    expect(setup).toMatch(/Root install failed/);
    // Global-install fallback is explicitly documented in the else branch.
    expect(setup).toMatch(/npm i -g create-stackr/);
  });

  it('setup.mjs next-steps points users at `npx stackr add service`', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.mjs'),
      'utf-8'
    );
    expect(setup).toMatch(/npx stackr add service/);
  });

  // ---------------------------------------------------------------------------
  // README wiring
  // ---------------------------------------------------------------------------

  it('README documents all three stackr invocation paths', async () => {
    const readme = await fs.readFile(
      path.join(projectDir, 'README.md'),
      'utf-8'
    );
    // (a) npx against the locally installed devDependency
    expect(readme).toMatch(/npx stackr add service wallet/);
    // (b) package.json script (accepts any package manager verb)
    expect(readme).toMatch(/run stackr -- add service wallet/);
    // (c) global install fallback
    expect(readme).toMatch(/npm i -g create-stackr/);
    // Root package.json is called out in the monorepo-layout diagram.
    expect(readme).toMatch(/package\.json\s+#\s+Root devDependencies/);
  });
});

describe('MonorepoGenerator — root package.json honors package manager choice', () => {
  it('emits a yarn install step when packageManager is yarn', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'project-gen-root-pkg-yarn-')
    );
    try {
      const cfg = cloneInitConfig(fullFeaturedConfig);
      cfg.packageManager = 'yarn';
      cfg.projectName = 'yarn-project';
      cfg.appScheme = 'yarnproject';
      const dir = path.join(tempDir, cfg.projectName);
      await new MonorepoGenerator(cfg).generate(dir);

      const setup = await fs.readFile(
        path.join(dir, 'scripts/setup.mjs'),
        'utf-8'
      );
      expect(setup).toMatch(/const PM = 'yarn'/);
      // package.json shape is identical — the devDependency is still on
      // create-stackr; package manager only affects how setup.mjs installs.
      const pkg = JSON.parse(
        await fs.readFile(path.join(dir, 'package.json'), 'utf-8')
      );
      expect(pkg.devDependencies['create-stackr']).toMatch(/^\^\d+\.\d+\.\d+$/);
    } finally {
      await fs.remove(tempDir);
    }
  });

  it('emits a bun install step when packageManager is bun', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'project-gen-root-pkg-bun-')
    );
    try {
      const cfg = cloneInitConfig(fullFeaturedConfig);
      cfg.packageManager = 'bun';
      cfg.projectName = 'bun-project';
      cfg.appScheme = 'bunproject';
      const dir = path.join(tempDir, cfg.projectName);
      await new MonorepoGenerator(cfg).generate(dir);

      const setup = await fs.readFile(
        path.join(dir, 'scripts/setup.mjs'),
        'utf-8'
      );
      expect(setup).toMatch(/const PM = 'bun'/);
    } finally {
      await fs.remove(tempDir);
    }
  });
});
