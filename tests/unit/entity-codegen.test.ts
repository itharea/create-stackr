import { describe, it, expect } from 'vitest';
import {
  entityNames,
  validateEntityName,
  renderEntitySchemaTs,
  renderEntityRepository,
  renderEntityServiceTs,
} from '../../src/generators/entity-codegen.js';
import {
  addEntityTableDrizzle,
  addEntityModelPrisma,
} from '../../src/utils/ast-merge/entity-merge.js';

describe('entityNames + validateEntityName', () => {
  it('derives every casing from a single-word name', () => {
    expect(entityNames('comment')).toEqual({
      pascal: 'Comment',
      camel: 'comment',
      snake: 'comment',
      folder: 'comment',
    });
  });

  it('derives every casing from kebab / camel / snake input identically', () => {
    const expected = { pascal: 'OrderItem', camel: 'orderItem', snake: 'order_item', folder: 'order-item' };
    expect(entityNames('order-item')).toEqual(expected);
    expect(entityNames('orderItem')).toEqual(expected);
    expect(entityNames('order_item')).toEqual(expected);
  });

  it('rejects empty / non-identifier names', () => {
    expect(validateEntityName('').valid).toBe(false);
    expect(validateEntityName('   ').valid).toBe(false);
    expect(validateEntityName('1bad').valid).toBe(false);
    expect(validateEntityName('has space!').valid).toBe(false);
    expect(validateEntityName('comment').valid).toBe(true);
    expect(validateEntityName('order-item').valid).toBe(true);
  });
});

describe('schema.ts renderer', () => {
  const out = renderEntitySchemaTs(entityNames('order-item'));

  it('exports BOTH the TypeBox const and its Static type (the gate-able rule)', () => {
    expect(out).toContain('export const OrderItemSchema = Type.Object({');
    expect(out).toContain('export type OrderItem = Static<typeof OrderItemSchema>;');
  });

  it('ships a Create schema + input type for write payloads', () => {
    expect(out).toContain('export const CreateOrderItemSchema = Type.Object({');
    expect(out).toContain('export type CreateOrderItemInput = Static<typeof CreateOrderItemSchema>;');
  });
});

describe('repository.ts renderer', () => {
  it('drizzle: every catch rethrows ErrorFactory.databaseError and references schema.<camel>', () => {
    const out = renderEntityRepository('drizzle', entityNames('comment'));
    expect(out).toContain('import { db, schema } from "../../utils/db";');
    expect(out).toContain('schema.comment');
    // one databaseError rethrow per operation (list/get/create/delete)
    expect((out.match(/throw ErrorFactory\.databaseError\(/g) ?? []).length).toBe(4);
    expect(out).not.toContain('throw new Error');
    expect(out).not.toContain('throw error;');
  });

  it('prisma: uses the db.<camel> client accessor and rethrows databaseError', () => {
    const out = renderEntityRepository('prisma', entityNames('order-item'));
    expect(out).toContain('import { db } from "../../utils/db";');
    expect(out).toContain('db.orderItem.findMany()');
    expect((out.match(/throw ErrorFactory\.databaseError\(/g) ?? []).length).toBe(4);
  });
});

describe('service.ts renderer', () => {
  it('is ORM-agnostic and delegates to the repository', () => {
    const out = renderEntityServiceTs(entityNames('comment'));
    expect(out).toContain('import * as repository from "./repository";');
    expect(out).toContain('repository.listComments()');
    expect(out).not.toContain('utils/db'); // no direct DB access in the service layer
  });
});

describe('addEntityTableDrizzle', () => {
  const base = `import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const example = pgTable('example', {
  id: text('id').primaryKey(),
});
`;

  it('appends a new pgTable export, preserving the existing table', () => {
    const out = addEntityTableDrizzle(base, entityNames('order-item'));
    expect(out).toContain("export const orderItem = pgTable('order_item', {");
    expect(out).toContain("createdAt: timestamp('created_at'");
    expect(out).toContain("export const example = pgTable('example'"); // preserved
  });

  it('injects missing pg-core named imports', () => {
    const minimal = `import { pgTable } from 'drizzle-orm/pg-core';\nexport const example = pgTable('example', {});\n`;
    const out = addEntityTableDrizzle(minimal, entityNames('comment'));
    expect(out).toMatch(/import \{[^}]*\btext\b[^}]*\} from 'drizzle-orm\/pg-core'/);
    expect(out).toMatch(/import \{[^}]*\btimestamp\b[^}]*\} from 'drizzle-orm\/pg-core'/);
  });

  it('adds a pg-core import when none exists', () => {
    const out = addEntityTableDrizzle(`export const x = 1;\n`, entityNames('comment'));
    expect(out).toMatch(/import \{[^}]*pgTable[^}]*\} from "?'?drizzle-orm\/pg-core/);
  });

  it('throws on a name collision (existing const)', () => {
    expect(() => addEntityTableDrizzle(base, entityNames('example'))).toThrow(/already exists/);
  });
});

describe('addEntityModelPrisma', () => {
  const base = `generator client {
  provider = "prisma-client"
}

datasource db {
  provider = "postgresql"
}

model Example {
  id String @id @default(cuid())

  @@map("example")
}
`;

  it('appends a new model with @@map, preserving the existing model', () => {
    const out = addEntityModelPrisma(base, entityNames('order-item'));
    expect(out).toContain('model OrderItem {');
    expect(out).toContain('@@map("order_item")');
    expect(out).toContain('model Example {'); // preserved
  });

  it('throws on a model-name collision', () => {
    expect(() => addEntityModelPrisma(base, entityNames('example'))).toThrow(/already exists/);
  });
});
