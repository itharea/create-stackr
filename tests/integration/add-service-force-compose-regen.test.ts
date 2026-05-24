import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * AST-based compose regen handles minimal / non-stackr-managed compose
 * files additively. Replaces the previous test for --force-regen of
 * missing marker blocks, which no longer apply (the marker mechanism is
 * gone — every regen is an additive AST merge).
 */
describe('stackr add service — compose AST merge against atypical files', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('compose-atypical');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Replace docker-compose.yml with a minimal user-authored scaffold
    // that has NO stackr-managed structure: just one custom service and
    // no volumes section at all.
    await fs.writeFile(
      path.join(fx.projectDir, 'docker-compose.yml'),
      'services:\n  placeholder:\n    image: busybox\n',
      'utf-8'
    );
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('adds the new service additively, preserving the user placeholder', async () => {
    await runAddService('scout', { install: false });

    const compose = await fs.readFile(
      path.join(fx.projectDir, 'docker-compose.yml'),
      'utf-8'
    );

    // AST regen leaves no marker comments behind.
    expect(compose).not.toContain('# >>> stackr managed');
    expect(compose).not.toContain('# <<< stackr managed');

    const parsed = YAML.parse(compose);
    const serviceKeys = Object.keys(parsed.services);
    // User's placeholder survives untouched.
    expect(serviceKeys).toContain('placeholder');
    expect(parsed.services.placeholder.image).toBe('busybox');
    // New service entries land cleanly.
    expect(serviceKeys).toContain('scout_rest_api');
    expect(serviceKeys).toContain('scout_db');
    expect(serviceKeys).toContain('scout_redis');
    // Volumes section appears because newConfig requires it.
    expect(parsed.volumes).toBeTruthy();
    expect(Object.keys(parsed.volumes)).toContain('scout_postgres_data');
  });
});
