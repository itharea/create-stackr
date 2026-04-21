import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Phase 5: `stackr add service` must refresh the monorepo-level e2e
 * artifacts so the new service appears (or doesn't) in the test
 * harness. Without this, e2e tests go stale the moment you add a
 * service, defeating the purpose of the scaffold.
 */
describe('stackr add service — monorepo-level e2e regen', () => {
  let fx: AddServiceFixture;

  afterEach(async () => {
    await fx?.cleanup();
  });

  it('tests: true → new service appears in clients.ts + stack-smoke.test.ts + test:e2e stays', async () => {
    fx = await createAddServiceFixture('add-e2e-new');
    await runAddService('scout', { install: false });

    const clients = await fs.readFile(
      path.join(fx.projectDir, 'tests/e2e/helpers/clients.ts'),
      'utf-8'
    );
    const smoke = await fs.readFile(
      path.join(fx.projectDir, 'tests/e2e/stack-smoke.test.ts'),
      'utf-8'
    );
    const waitFor = await fs.readFile(
      path.join(fx.projectDir, 'tests/e2e/helpers/wait-for-stack.ts'),
      'utf-8'
    );

    expect(clients).toContain('scoutClient');
    expect(clients).toContain('18080'); // first free base port after core=8080 → 18080 with +10000
    expect(smoke).toContain('scoutClient');
    expect(smoke).toContain("'scout: GET / → 200'");
    expect(waitFor).toContain('scoutClient');

    // Pre-existing services still render.
    expect(clients).toContain('coreClient');
    expect(clients).toContain('authClient');

    const pkg = JSON.parse(
      await fs.readFile(path.join(fx.projectDir, 'package.json'), 'utf-8')
    );
    expect(pkg.scripts['test:e2e']).toBe('./scripts/test-e2e.sh');
  });

  it('tests: false → new service is absent from clients.ts + stack-smoke.test.ts', async () => {
    fx = await createAddServiceFixture('add-e2e-notests');
    await runAddService('scout', { install: false, tests: false });

    const clients = await fs.readFile(
      path.join(fx.projectDir, 'tests/e2e/helpers/clients.ts'),
      'utf-8'
    );
    const smoke = await fs.readFile(
      path.join(fx.projectDir, 'tests/e2e/stack-smoke.test.ts'),
      'utf-8'
    );

    expect(clients).not.toContain('scoutClient');
    expect(smoke).not.toContain('scoutClient');
    // Pre-existing services still render.
    expect(clients).toContain('coreClient');
    expect(clients).toContain('authClient');
  });
});
