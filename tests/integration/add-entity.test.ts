import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddEntity } from '../../src/commands/add-entity.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * `stackr add entity` codegen — correct-by-construction. Verifies the new
 * domain trio is written, the ORM table is merged into the service schema, and
 * a pending migration is recorded. Uses the same fixture as add-service.
 */
describe('stackr add entity', () => {
  let fixture: AddServiceFixture | null = null;

  afterEach(async () => {
    if (fixture) await fixture.cleanup();
    fixture = null;
  });

  it('scaffolds the domain trio and merges the Drizzle table', async () => {
    fixture = await createAddServiceFixture('ent-drizzle', { orm: 'drizzle' });
    const { projectDir } = fixture;

    await runAddEntity('core', 'order-item');

    const dir = path.join(projectDir, 'core/backend/domain/order-item');
    expect(await fs.pathExists(path.join(dir, 'schema.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'repository.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'service.ts'))).toBe(true);

    const schemaTs = await fs.readFile(path.join(dir, 'schema.ts'), 'utf-8');
    expect(schemaTs).toContain('export const OrderItemSchema = Type.Object({');
    expect(schemaTs).toContain('export type OrderItem = Static<typeof OrderItemSchema>;');

    const repo = await fs.readFile(path.join(dir, 'repository.ts'), 'utf-8');
    expect(repo).toContain('schema.orderItem');
    expect(repo).toMatch(/throw ErrorFactory\.databaseError/);

    // The table is merged into the service's drizzle schema (preserving example).
    const dz = await fs.readFile(path.join(projectDir, 'core/backend/drizzle/schema.ts'), 'utf-8');
    expect(dz).toContain("export const orderItem = pgTable('order_item', {");
    expect(dz).toContain("pgTable('example'");

    // A pending migration was recorded against the service.
    const cfg = await loadStackrConfig(projectDir);
    expect(cfg.pendingMigrations?.some((m) => m.service === 'core' && /order_item/.test(m.reason))).toBe(true);
  });

  it('merges a Prisma model with @@map and uses the db.<camel> accessor', async () => {
    fixture = await createAddServiceFixture('ent-prisma', { orm: 'prisma' });
    const { projectDir } = fixture;

    await runAddEntity('core', 'comment');

    const repo = await fs.readFile(
      path.join(projectDir, 'core/backend/domain/comment/repository.ts'),
      'utf-8'
    );
    expect(repo).toContain('db.comment.findMany()');

    const prisma = await fs.readFile(
      path.join(projectDir, 'core/backend/prisma/schema.prisma'),
      'utf-8'
    );
    expect(prisma).toContain('model Comment {');
    expect(prisma).toContain('@@map("comment")');
    expect(prisma).toContain('model Example {'); // preserved
  });

  it('refuses an unknown service', async () => {
    fixture = await createAddServiceFixture('ent-badsvc', { orm: 'drizzle' });
    await expect(runAddEntity('nope', 'comment')).rejects.toThrow(/No service named "nope"/);
  });

  it('refuses a duplicate entity (the domain dir already exists)', async () => {
    fixture = await createAddServiceFixture('ent-dup', { orm: 'drizzle' });
    await runAddEntity('core', 'comment');
    await expect(runAddEntity('core', 'comment')).rejects.toThrow(/already exists/);
  });

  it('rejects an invalid entity name without touching disk', async () => {
    fixture = await createAddServiceFixture('ent-invalid', { orm: 'drizzle' });
    const { projectDir } = fixture;
    await expect(runAddEntity('core', '1bad')).rejects.toThrow(/Invalid entity name/);
    expect(await fs.pathExists(path.join(projectDir, 'core/backend/domain/1bad'))).toBe(false);
  });
});
