import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  getDestinationPath,
  renderTemplate,
  shouldIncludeFile,
} from '../../src/utils/template.js';
import { buildServiceContext } from '../../src/generators/service-context.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

describe('getDestinationPath', () => {
  const targetDir = '/tmp/target';

  it('maps services/base/backend/** to <serviceName>/backend/**', () => {
    const dst = getDestinationPath(
      'services/base/backend/package.json.ejs',
      targetDir,
      { serviceName: 'core' }
    );
    expect(dst).toBe(path.join(targetDir, 'core/backend/package.json'));
  });

  it('maps services/auth/backend/** to <serviceName>/backend/**', () => {
    const dst = getDestinationPath(
      'services/auth/backend/lib/auth.drizzle.ts.ejs',
      targetDir,
      { serviceName: 'auth' }
    );
    expect(dst).toBe(path.join(targetDir, 'auth/backend/lib/auth.ts'));
  });

  it('maps services/base/mobile/** to <serviceName>/mobile/**', () => {
    const dst = getDestinationPath(
      'services/base/mobile/app.json',
      targetDir,
      { serviceName: 'scout' }
    );
    expect(dst).toBe(path.join(targetDir, 'scout/mobile/app.json'));
  });

  it('maps services/base/web/** to <serviceName>/web/**', () => {
    const dst = getDestinationPath(
      'services/base/web/next.config.js',
      targetDir,
      { serviceName: 'admin' }
    );
    expect(dst).toBe(path.join(targetDir, 'admin/web/next.config.js'));
  });

  it('strips ORM suffix for the non-active ORM', () => {
    const dst = getDestinationPath(
      'services/base/backend/utils/db.drizzle.ts',
      targetDir,
      { serviceName: 'core' }
    );
    expect(dst).toBe(path.join(targetDir, 'core/backend/utils/db.ts'));
  });

  it('maps shared/** to the project root (no service prefix)', () => {
    const dst = getDestinationPath('shared/AGENTS.md.ejs', targetDir, { serviceName: 'core' });
    expect(dst).toBe(path.join(targetDir, 'AGENTS.md'));
  });

  it('parameterizes by different service names', () => {
    const dstA = getDestinationPath('services/base/backend/package.json.ejs', targetDir, {
      serviceName: 'scout',
    });
    const dstB = getDestinationPath('services/base/backend/package.json.ejs', targetDir, {
      serviceName: 'manage',
    });
    expect(dstA).not.toBe(dstB);
    expect(dstA).toContain('scout/');
    expect(dstB).toContain('manage/');
  });
});

describe('shouldIncludeFile', () => {
  it('skips .gitkeep files', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    expect(shouldIncludeFile('services/base/backend/domain/.gitkeep', ctx)).toBe(false);
  });

  it('includes backend files for any service', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    expect(shouldIncludeFile('services/base/backend/package.json.ejs', ctx)).toBe(true);
  });

  it('excludes prisma files when orm=drizzle', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext({ ...minimalConfig, orm: 'drizzle' }, core);
    expect(shouldIncludeFile('services/base/backend/prisma/schema.prisma.ejs', ctx)).toBe(false);
    expect(shouldIncludeFile('services/base/backend/drizzle/schema.drizzle.ts.ejs', ctx)).toBe(true);
  });

  it('excludes mobile/web when platforms are not selected', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    // minimal has no mobile or web
    expect(shouldIncludeFile('services/base/mobile/app.json', ctx)).toBe(false);
    expect(shouldIncludeFile('services/base/web/next.config.js', ctx)).toBe(false);
  });

  it('excludes services/auth/** when rendering a base service', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    expect(shouldIncludeFile('services/auth/backend/lib/auth.drizzle.ts.ejs', ctx)).toBe(false);
  });

  it('excludes services/base/** when rendering the auth service', () => {
    const auth = minimalConfig.services.find((s) => s.kind === 'auth')!;
    const ctx = buildServiceContext(minimalConfig, auth);
    expect(shouldIncludeFile('services/base/backend/controllers/rest-api/plugins/auth.ts.ejs', ctx)).toBe(false);
  });

  it('skips shared/AGENTS.md (rendered separately by the monorepo root pass)', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    expect(shouldIncludeFile('shared/AGENTS.md.ejs', ctx)).toBe(false);
  });

  it('excludes domain/device-session and routes/device-sessions for non-auth services', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const coreCtx = buildServiceContext(minimalConfig, core);
    expect(
      shouldIncludeFile('services/base/backend/domain/device-session/model.ts.ejs', coreCtx)
    ).toBe(false);
    expect(
      shouldIncludeFile(
        'services/base/backend/controllers/rest-api/routes/device-sessions/index.ts.ejs',
        coreCtx
      )
    ).toBe(false);
  });

  it('includes device-session files for the auth service', () => {
    const auth = minimalConfig.services.find((s) => s.kind === 'auth')!;
    const authCtx = buildServiceContext(minimalConfig, auth);
    expect(
      shouldIncludeFile('services/auth/backend/domain/device-session/model.ts.ejs', authCtx)
    ).toBe(true);
  });

  it('sdkInitializer returns false when no SDK integrations are enabled', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    expect(
      shouldIncludeFile('services/base/backend/services/sdkInitializer/index.ts.ejs', ctx)
    ).toBe(false);
  });

  it('sdkInitializer returns true when at least one SDK integration is enabled', () => {
    const cfg = cloneInitConfig(minimalConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.integrations.revenueCat.enabled = true;
    const ctx = buildServiceContext(cfg, core);
    expect(
      shouldIncludeFile('services/base/backend/services/sdkInitializer/index.ts.ejs', ctx)
    ).toBe(true);
  });

  it('excludes features/mobile/auth when mobile is enabled but auth is disabled', () => {
    // Construct a mobile-enabled service with authMiddleware 'none' so the
    // platform check passes but features.authentication.enabled is false.
    const cfg = cloneInitConfig(minimalConfig);
    // Remove the auth service so `authentication.enabled` is guaranteed false
    // regardless of middleware.
    cfg.services = cfg.services.filter((s) => s.kind !== 'auth');
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.backend.authMiddleware = 'none';
    core.mobile = { enabled: true };
    const ctx = buildServiceContext(cfg, core);
    expect(ctx.platforms).toContain('mobile');
    expect(ctx.features.authentication.enabled).toBe(false);
    expect(
      shouldIncludeFile('features/mobile/auth/login/index.tsx.ejs', ctx)
    ).toBe(false);
  });

  it('excludes forgot-password/reset-password files when passwordReset is disabled', () => {
    const cfg = cloneInitConfig(minimalConfig);
    const auth = cfg.services.find((s) => s.kind === 'auth')!;
    auth.authConfig!.passwordReset = false;
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.mobile = { enabled: true };
    const ctx = buildServiceContext(cfg, core);
    expect(
      shouldIncludeFile('features/mobile/auth/forgot-password/index.tsx.ejs', ctx)
    ).toBe(false);
    expect(
      shouldIncludeFile('features/mobile/auth/reset-password/index.tsx.ejs', ctx)
    ).toBe(false);
  });
});

describe('renderTemplate', () => {
  it('rejects with "Template not found" when the file does not exist', async () => {
    await expect(
      renderTemplate('definitely/does/not/exist.ejs', {})
    ).rejects.toThrow(/Template not found/);
  });
});
