import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { buildServiceContext } from '../../src/generators/service-context.js';
import { shouldIncludeFile, getDestinationPath } from '../../src/utils/template.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { fullFeaturedConfig } from '../fixtures/configs/full-featured.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';

/**
 * Service-scoped web generator test. Absorbs the path-mapping /
 * shouldIncludeFile unit assertions from the deleted
 * `tests/unit/template-web.test.ts` AND the per-service web-generation
 * assertions from the deleted `tests/integration/web-generator.test.ts`.
 */
describe('path mapping (web / features)', () => {
  const targetDir = '/tmp/target';
  const core = minimalConfig.services.find((s) => s.name === 'core')!;
  const ctx = buildServiceContext(minimalConfig, core);

  it('maps services/base/web/next.config.ts to <serviceName>/web/next.config.ts', () => {
    const dst = getDestinationPath(
      'services/base/web/next.config.ts',
      targetDir,
      { serviceName: 'core' }
    );
    expect(dst).toBe(path.join(targetDir, 'core/web/next.config.ts'));
  });

  it('maps features/web/auth/app/(auth)/login/page.tsx.ejs to <svc>/web/src/app/(auth)/login/page.tsx', () => {
    const dst = getDestinationPath(
      'features/web/auth/app/(auth)/login/page.tsx.ejs',
      targetDir,
      { serviceName: 'core' }
    );
    expect(dst).toBe(path.join(targetDir, 'core/web/src/app/(auth)/login/page.tsx'));
  });

  it('maps features/web/auth/components/auth/oauth-buttons.tsx.ejs to <svc>/web/src/components/auth/oauth-buttons.tsx', () => {
    const dst = getDestinationPath(
      'features/web/auth/components/auth/oauth-buttons.tsx.ejs',
      targetDir,
      { serviceName: 'core' }
    );
    expect(dst).toBe(path.join(targetDir, 'core/web/src/components/auth/oauth-buttons.tsx'));
  });

  it('shouldIncludeFile excludes /web/ files when platforms has no web', () => {
    expect(shouldIncludeFile('services/base/web/next.config.ts', ctx)).toBe(false);
  });

  it('shouldIncludeFile includes /web/ files when the service has web enabled', () => {
    const webCfg = cloneInitConfig(fullFeaturedConfig);
    const webCore = webCfg.services.find((s) => s.name === 'core')!;
    const webCtx = buildServiceContext(webCfg, webCore);
    expect(shouldIncludeFile('services/base/web/next.config.ts', webCtx)).toBe(true);
  });

  it('shouldIncludeFile excludes features/web/auth when authentication is disabled', () => {
    const noAuthCfg = cloneInitConfig(minimalConfig);
    noAuthCfg.services = noAuthCfg.services.filter((s) => s.kind !== 'auth');
    noAuthCfg.services[0].backend.authMiddleware = 'none';
    noAuthCfg.services[0].web = { enabled: true, port: 3000 };
    const noAuthCtx = buildServiceContext(noAuthCfg, noAuthCfg.services[0]);
    expect(
      shouldIncludeFile('features/web/auth/app/(auth)/login/page.tsx.ejs', noAuthCtx)
    ).toBe(false);
  });

  it('shouldIncludeFile includes services/base/web files for auth services with web enabled', () => {
    // Regression guard: the symmetric kind filter used to drop every file
    // under services/base/** for auth services, which also stripped the
    // shared Next.js scaffolding under services/base/web/**. The filter is
    // now narrowed to services/base/backend/, so base web must flow through.
    const authWebCfg = cloneInitConfig(fullFeaturedConfig);
    const authSvc = authWebCfg.services.find((s) => s.kind === 'auth')!;
    const authCtx = buildServiceContext(authWebCfg, authSvc);
    expect(shouldIncludeFile('services/base/web/next.config.ts', authCtx)).toBe(true);
    expect(shouldIncludeFile('services/base/web/package.json.ejs', authCtx)).toBe(true);
    expect(shouldIncludeFile('services/base/web/tsconfig.json', authCtx)).toBe(true);
  });

  it('shouldIncludeFile still excludes services/base/backend files for auth services', () => {
    const authCfg = cloneInitConfig(fullFeaturedConfig);
    const authSvc = authCfg.services.find((s) => s.kind === 'auth')!;
    const authCtx = buildServiceContext(authCfg, authSvc);
    expect(shouldIncludeFile('services/base/backend/lib/constants.ts.ejs', authCtx)).toBe(false);
    expect(shouldIncludeFile('services/base/backend/package.json.ejs', authCtx)).toBe(false);
  });

  it('shouldIncludeFile still excludes services/auth/backend files for base services', () => {
    const baseCfg = cloneInitConfig(fullFeaturedConfig);
    const baseSvc = baseCfg.services.find((s) => s.kind === 'base')!;
    const baseCtx = buildServiceContext(baseCfg, baseSvc);
    expect(shouldIncludeFile('services/auth/backend/lib/auth.ts.ejs', baseCtx)).toBe(false);
    expect(shouldIncludeFile('services/auth/backend/package.json.ejs', baseCtx)).toBe(false);
  });
});

describe('project generator — web subtree', () => {
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    // Generate once per describe block to keep the suite fast.
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-web-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    cfg.projectName = 'test-web';
    cfg.appScheme = 'testweb';
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('creates core/web/ directory with src/app/, src/components/, src/lib/', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'core/web'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/web/src/app'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/web/src/components'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/web/src/lib'))).toBe(true);
  });

  it('lands next.config.ts / components.json / eslint.config.mjs / postcss.config.mjs / tsconfig.json in <svc>/web/', async () => {
    for (const f of [
      'next.config.ts',
      'components.json',
      'eslint.config.mjs',
      'postcss.config.mjs',
      'tsconfig.json',
    ]) {
      expect(
        await fs.pathExists(path.join(projectDir, 'core/web', f)),
        `missing core/web/${f}`
      ).toBe(true);
    }
  });

  it('web package.json name is <projectName>-<service.name>-web and parses as JSON', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'core/web/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    expect(pkg.name).toBe('test-web-core-web');
  });

  it('web package.json has conditional auth deps when authentication is enabled', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'core/web/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    const deps: Record<string, string> = pkg.dependencies ?? {};
    expect(deps.sonner).toBeDefined();
    // sessionManagement shim is always true today → zustand always present.
    expect(deps.zustand).toBeDefined();
  });

  it('generates login/register/forgot-password pages when auth + passwordReset', async () => {
    expect(
      await fs.pathExists(path.join(projectDir, 'core/web/src/app/(auth)/login/page.tsx'))
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'core/web/src/app/(auth)/register/page.tsx'))
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(projectDir, 'core/web/src/app/(auth)/forgot-password/page.tsx')
      )
    ).toBe(true);
  });

  it('generates the OAuth buttons component (providers gated inside)', async () => {
    expect(
      await fs.pathExists(
        path.join(projectDir, 'core/web/src/components/auth/oauth-buttons.tsx')
      )
    ).toBe(true);
  });

  it('generates shadcn UI components under core/web/src/components/ui/', async () => {
    const buttonPath = path.join(projectDir, 'core/web/src/components/ui/button.tsx');
    expect(await fs.pathExists(buttonPath)).toBe(true);
  });

  it('globals.css contains dark-mode variables', async () => {
    const globalsPath = path.join(projectDir, 'core/web/src/app/globals.css');
    expect(await fs.pathExists(globalsPath)).toBe(true);
    const contents = await fs.readFile(globalsPath, 'utf-8');
    expect(contents).toMatch(/dark/i);
  });

  it('does NOT generate a zustand-backed auth-store.ts (react-19 regression lock)', async () => {
    const deletedPath = path.join(projectDir, 'core/web/src/store/auth-store.ts');
    expect(await fs.pathExists(deletedPath)).toBe(false);
  });

  it('generates web + mobile under the same service prefix when both enabled', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'core/web'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/mobile'))).toBe(true);
  });
});

describe('project generator — web-only service (mobile disabled)', () => {
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-webonly-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.mobile = null;
    cfg.projectName = 'test-web-only';
    cfg.appScheme = 'testwebonly';
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('generates core/web but not core/mobile', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'core/web'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/mobile'))).toBe(false);
  });
});

describe('project generator — auth/web subtree (admin dashboard)', () => {
  // Regression coverage for #52: when the auth service has adminDashboard
  // enabled, auth/web must be scaffolded with the same root Next.js shell
  // (package.json, tsconfig, next.config, shadcn ui, etc.) as core/web.
  // Previously a too-broad kind filter in shouldIncludeFile stripped every
  // file under services/base/web/** for auth services, leaving auth/web/
  // with only the auth feature pages layered from features/web/auth/**.
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-authweb-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    cfg.projectName = 'test-auth-web';
    cfg.appScheme = 'testauthweb';
    // fullFeaturedConfig already sets adminDashboard: true and populates
    // auth.web from the authEntry factory, so no extra mutation is needed.
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('creates auth/web/ directory with src/app/, src/components/, src/lib/', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'auth/web'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/app'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/components'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/lib'))).toBe(true);
  });

  it('lands next.config.ts / components.json / eslint.config.mjs / postcss.config.mjs / tsconfig.json in auth/web/', async () => {
    for (const f of [
      'next.config.ts',
      'components.json',
      'eslint.config.mjs',
      'postcss.config.mjs',
      'tsconfig.json',
    ]) {
      expect(
        await fs.pathExists(path.join(projectDir, 'auth/web', f)),
        `missing auth/web/${f}`
      ).toBe(true);
    }
  });

  it('lands package.json / .env.example / .gitignore / .prettierrc / .prettierignore in auth/web/', async () => {
    for (const f of [
      'package.json',
      '.env.example',
      '.gitignore',
      '.prettierrc',
      '.prettierignore',
    ]) {
      expect(
        await fs.pathExists(path.join(projectDir, 'auth/web', f)),
        `missing auth/web/${f}`
      ).toBe(true);
    }
  });

  it('auth/web package.json name is <projectName>-auth-web and parses as JSON', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'auth/web/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    expect(pkg.name).toBe('test-auth-web-auth-web');
    expect(pkg.scripts?.dev).toBe('next dev');
    expect(pkg.dependencies?.next).toBeDefined();
    expect(pkg.dependencies?.react).toBeDefined();
  });

  it('lands the root layout.tsx and globals.css in auth/web/src/app/', async () => {
    expect(
      await fs.pathExists(path.join(projectDir, 'auth/web/src/app/layout.tsx'))
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'auth/web/src/app/globals.css'))
    ).toBe(true);
  });

  it('generates shadcn UI primitives under auth/web/src/components/ui/', async () => {
    for (const f of ['button.tsx', 'card.tsx', 'input.tsx', 'label.tsx']) {
      expect(
        await fs.pathExists(path.join(projectDir, 'auth/web/src/components/ui', f)),
        `missing auth/web/src/components/ui/${f}`
      ).toBe(true);
    }
  });

  it('still renders the auth service backend (no regression from narrowed kind filter)', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'auth/backend'))).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'auth/backend/package.json'))
    ).toBe(true);
  });

  it('does not render the base backend tree into auth/ (kind filter still guards backends)', async () => {
    // Smoke check: auth/backend's package.json must be the auth-service
    // variant, not the base backend variant — the narrowed kind filter
    // should still keep services/base/backend/** out of the auth service.
    const raw = await fs.readFile(
      path.join(projectDir, 'auth/backend/package.json'),
      'utf-8'
    );
    const pkg = JSON.parse(raw);
    expect(pkg.name).toBe('test-auth-web-auth-backend');
  });
});
