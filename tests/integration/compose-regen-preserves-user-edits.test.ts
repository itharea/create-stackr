import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * RELEASE BLOCKER (plans/phase3_add_service_command.md §D.2).
 *
 * `stackr add service` regenerates docker-compose.yml by rewriting the
 * marker-managed services/volumes blocks. Anything OUTSIDE those marker
 * blocks — user-added comments, custom services, top-of-file headers,
 * extra top-level keys — must survive byte-identical across the rewrite.
 *
 * If this test fails, do not ship. Silent clobbering of user edits is
 * the worst-case failure mode for this subcommand.
 */
describe('compose regen — preserves user edits (RELEASE BLOCKER)', () => {
  let fx: AddServiceFixture;
  const TOP_COMMENT = '# --- user-added top-of-file comment ---';
  const CUSTOM_SVC = `
  # my hand-authored service
  my_custom_service:
    image: nginx:alpine
    ports:
      - "9999:80"
`;
  const USER_NETWORK = `

networks:
  my_custom_network:
    driver: bridge
`;
  const VOLUMES_POSTLUDE = `
  my_custom_volume:
    driver: local
`;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-preservation');

    // Hand-edit docker-compose.yml to add content OUTSIDE the managed blocks.
    const composePath = path.join(fx.projectDir, 'docker-compose.yml');
    const original = await fs.readFile(composePath, 'utf-8');

    // 1. Prepend a user comment
    // 2. Insert a custom service inside `services:` AFTER the managed block
    // 3. Append a custom network stanza at the end
    // 4. Insert a custom volume entry inside `volumes:` AFTER the managed block
    let modified = TOP_COMMENT + '\n' + original;

    // Add custom service just after the services marker block end
    modified = modified.replace(
      '# <<< stackr managed services <<<',
      '# <<< stackr managed services <<<' + CUSTOM_SVC
    );

    // Add custom volume just after the volumes marker block end
    modified = modified.replace(
      '# <<< stackr managed volumes <<<',
      '# <<< stackr managed volumes <<<' + VOLUMES_POSTLUDE
    );

    // Append networks at the very end
    modified = modified + USER_NETWORK;

    await fs.writeFile(composePath, modified, 'utf-8');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('survives a single add-service call with all four user edits intact', async () => {
    await runAddService('wallet', { install: false });

    const composePath = path.join(fx.projectDir, 'docker-compose.yml');
    const after = await fs.readFile(composePath, 'utf-8');

    // 1. User-added top-of-file comment still present
    expect(after).toContain(TOP_COMMENT);
    // 2. Custom service still present
    expect(after).toContain('my_custom_service');
    expect(after).toContain('nginx:alpine');
    expect(after).toContain('"9999:80"');
    // 3. User-added network still present
    expect(after).toContain('my_custom_network');
    expect(after).toContain('driver: bridge');
    // 4. User-added volume still present
    expect(after).toContain('my_custom_volume');

    // And the managed block contains the new service
    expect(after).toContain('wallet_db');
    expect(after).toContain('wallet_rest_api');
    expect(after).toContain('wallet_redis');

    // File still parses as valid YAML
    const parsed = YAML.parse(after);
    expect(parsed).toBeTruthy();
    expect(Object.keys(parsed.services)).toContain('wallet_rest_api');
    expect(Object.keys(parsed.services)).toContain('my_custom_service');
    expect(Object.keys(parsed.networks)).toContain('my_custom_network');
    expect(Object.keys(parsed.volumes)).toContain('my_custom_volume');
    expect(Object.keys(parsed.volumes)).toContain('wallet_postgres_data');
  });

  it('survives two successive add-service calls without clobbering', async () => {
    await runAddService('wallet', { install: false });
    // Clear the pending migration sentinel so the next call passes.
    const { runMigrationsAck } = await import('../../src/commands/migrations-ack.js');
    await runMigrationsAck('auth');
    await runAddService('treasury', { install: false });

    const after = await fs.readFile(
      path.join(fx.projectDir, 'docker-compose.yml'),
      'utf-8'
    );

    // All user edits still present after two rewrites
    expect(after).toContain(TOP_COMMENT);
    expect(after).toContain('my_custom_service');
    expect(after).toContain('my_custom_network');
    expect(after).toContain('my_custom_volume');

    // Both new services present in the managed block
    expect(after).toContain('wallet_rest_api');
    expect(after).toContain('treasury_rest_api');

    const parsed = YAML.parse(after);
    expect(Object.keys(parsed.services)).toContain('wallet_rest_api');
    expect(Object.keys(parsed.services)).toContain('treasury_rest_api');
    expect(Object.keys(parsed.services)).toContain('my_custom_service');
  });
});
