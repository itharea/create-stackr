import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { copyServiceTemplateFiles } from '../../src/utils/copy.js';
import { buildServiceContext } from '../../src/generators/service-context.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { drizzleConfig } from '../fixtures/configs/drizzle-config.js';

/**
 * Unit-ish test of the copy helper used by the per-service generator.
 * Asserts that files land under `<service.name>/backend/`, EJS is
 * rendered, and the prisma/drizzle split is honored.
 */
describe('copyServiceTemplateFiles', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await fs.mkdtemp(path.join(os.tmpdir(), 'copy-test-'));
  });

  afterEach(async () => {
    await fs.remove(targetDir);
  });

  it('copies backend files to <service.name>/backend/ and renders EJS', async () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    await copyServiceTemplateFiles(targetDir, ctx, 'services/base/backend');

    const pkgPath = path.join(targetDir, 'core/backend/package.json');
    expect(await fs.pathExists(pkgPath)).toBe(true);

    const raw = await fs.readFile(pkgPath, 'utf-8');
    // Fully-rendered: must not contain unreplaced EJS tokens
    expect(raw).not.toMatch(/<%[=_-]?/);
    expect(raw).not.toMatch(/%>/);

    const pkg = JSON.parse(raw);
    expect(pkg.name).toBe('test-minimal-core-backend');
  });

  it('maps by different service names on successive calls', async () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);

    // Write `core` subtree
    await copyServiceTemplateFiles(targetDir, ctx, 'services/base/backend');
    expect(await fs.pathExists(path.join(targetDir, 'core/backend/package.json'))).toBe(true);

    // Now write a second service's subtree by aliasing through a cloned
    // context with a different service name.
    const renamed = { ...ctx, service: { ...ctx.service, name: 'scout' } };
    await copyServiceTemplateFiles(targetDir, renamed, 'services/base/backend');
    expect(await fs.pathExists(path.join(targetDir, 'scout/backend/package.json'))).toBe(true);
  });

  it('honors prisma ORM filtering — drizzle files are excluded in prisma mode', async () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    await copyServiceTemplateFiles(targetDir, ctx, 'services/base/backend');

    // Prisma files land, drizzle doesn't
    expect(await fs.pathExists(path.join(targetDir, 'core/backend/prisma'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'core/backend/drizzle'))).toBe(false);
  });

  it('honors drizzle ORM filtering — prisma files are excluded in drizzle mode', async () => {
    const core = drizzleConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(drizzleConfig, core);
    await copyServiceTemplateFiles(targetDir, ctx, 'services/base/backend');

    expect(await fs.pathExists(path.join(targetDir, 'core/backend/drizzle'))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, 'core/backend/prisma'))).toBe(false);
  });

  it('no-ops silently when the subtree does not exist', async () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    await expect(
      copyServiceTemplateFiles(targetDir, ctx, 'services/does-not-exist')
    ).resolves.toBeUndefined();
  });

  it('does NOT emit any file containing an unrendered EJS token', async () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    await copyServiceTemplateFiles(targetDir, ctx, 'services/base/backend');

    const { globby } = await import('globby');
    const files = await globby('core/backend/**/*', {
      cwd: targetDir,
      onlyFiles: true,
      dot: true,
    });

    for (const rel of files) {
      const contents = await fs.readFile(path.join(targetDir, rel), 'utf-8');
      // binary-ish files might contain arbitrary bytes; skip if not printable
      if (/<%[=_-]?/.test(contents) || /%>/.test(contents)) {
        throw new Error(`Unrendered EJS token left in ${rel}`);
      }
    }
  });
});
