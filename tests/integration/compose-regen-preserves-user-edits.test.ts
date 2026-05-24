import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * RELEASE BLOCKER.
 *
 * `stackr add service` regenerates docker-compose.yml via AST additive
 * merge. Hand-edits to the file — user-added services, networks,
 * top-of-file comments, AND modifications to managed services (e.g.
 * bumping `auth_db`'s image tag) — must all survive the rewrite.
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

    // Hand-edit docker-compose.yml. We add four kinds of user edits:
    //
    //   1. Top-of-file user comment
    //   2. Custom user service inside `services:`
    //   3. Custom user network stanza
    //   4. Custom user volume inside `volumes:`
    //   5. Customization to a managed service (auth_db image tag bump)
    //
    // Each must survive the AST additive merge.
    const composePath = path.join(fx.projectDir, 'docker-compose.yml');
    const original = await fs.readFile(composePath, 'utf-8');

    let modified = TOP_COMMENT + '\n' + original;

    // Append a custom service inside `services:` (after the last managed entry)
    // by inserting before the blank line that separates services from volumes.
    modified = modified.replace(/\n(\nvolumes:)/, `\n${CUSTOM_SVC}$1`);

    // Append a custom volume inside `volumes:` (end of the volumes map)
    modified = modified.replace(/(\nvolumes:\n[^]+?)(\n*$)/, `$1${VOLUMES_POSTLUDE}$2`);

    // Append a networks stanza at the very end
    modified = modified.trimEnd() + '\n' + USER_NETWORK;

    // Bump a managed service's image to verify managed-block customizations
    // also survive (this is the key UX win of AST over marker rewrites).
    modified = modified.replace('image: postgres:16-alpine', 'image: postgres:17-alpine');

    await fs.writeFile(composePath, modified, 'utf-8');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('survives a single add-service call with all five user edits intact', async () => {
    await runAddService('wallet', { install: false });

    const composePath = path.join(fx.projectDir, 'docker-compose.yml');
    const after = await fs.readFile(composePath, 'utf-8');

    // 1. User-added top-of-file comment still present
    expect(after).toContain(TOP_COMMENT);
    // 2. Custom service still present
    expect(after).toContain('my_custom_service');
    expect(after).toContain('nginx:alpine');
    // 3. User-added network still present
    expect(after).toContain('my_custom_network');
    expect(after).toContain('driver: bridge');
    // 4. User-added volume still present
    expect(after).toContain('my_custom_volume');
    // 5. Managed-service customization (the KEY AST-merge win) survives
    expect(after).toContain('postgres:17-alpine');

    // And the new service lands cleanly
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
    expect(after).toContain('postgres:17-alpine');

    // Both new services present
    expect(after).toContain('wallet_rest_api');
    expect(after).toContain('treasury_rest_api');

    const parsed = YAML.parse(after);
    expect(Object.keys(parsed.services)).toContain('wallet_rest_api');
    expect(Object.keys(parsed.services)).toContain('treasury_rest_api');
    expect(Object.keys(parsed.services)).toContain('my_custom_service');
  });
});
