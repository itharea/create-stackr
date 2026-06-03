/**
 * ---------------------------------------------------------------------------
 * Domain-entity codegen — pure string builders for `stackr add entity`.
 * ---------------------------------------------------------------------------
 *
 * These render the `domain/<entity>/{schema,repository,service}.ts` trio that
 * the codegen writes. They are correct-by-construction against stackr's backend
 * conventions (the GATE-ABLE subset):
 *   - `schema.ts` exports BOTH `XSchema = Type.Object(...)` and
 *     `type X = Static<typeof XSchema>`.
 *   - every repository DB op sits in its own try/catch that rethrows
 *     `ErrorFactory.databaseError({ operation, ...context, originalError })`.
 *   - the service layer is ORM-agnostic and delegates persistence to the repo.
 *
 * The ORM table itself is merged into the service's schema by
 * `src/utils/ast-merge/entity-merge.ts`, so the generated `repository.ts`
 * type-checks once a migration/generate is run.
 *
 * Pure — no file I/O — so the command layer can stage + validate before commit.
 */

import type { ORMChoice } from '../types/index.js';

/** The casings of one entity name, derived once from raw user input. */
export interface EntityNames {
  /** PascalCase — types, Prisma model, identifier prefixes. `OrderItem`. */
  pascal: string;
  /** camelCase — Drizzle `export const`, Prisma client accessor. `orderItem`. */
  camel: string;
  /** snake_case — Drizzle `pgTable('…')` + Prisma `@@map`. `order_item`. */
  snake: string;
  /** kebab-case — the `domain/<folder>/` directory name. `order-item`. */
  folder: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Split a raw entity name into lowercase words across kebab/snake/camel
 *  boundaries. `"orderItem"` / `"order-item"` / `"order_item"` → `['order','item']`. */
function splitWords(raw: string): string[] {
  return raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/**
 * Validate a raw entity name. Each word must be alphanumeric and start with a
 * letter (so it is a safe TS identifier, table name, and directory name).
 */
export function validateEntityName(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: false, error: 'name is empty' };
  }
  const words = splitWords(raw);
  if (words.length === 0) {
    return { valid: false, error: 'name has no usable characters' };
  }
  for (const w of words) {
    if (!/^[a-z][a-z0-9]*$/.test(w)) {
      return {
        valid: false,
        error: `segment "${w}" must be alphanumeric and start with a letter (use kebab, snake, or camelCase, e.g. "comment" or "order-item")`,
      };
    }
  }
  return { valid: true };
}

/** Compute every casing of an entity name. Call only after `validateEntityName`. */
export function entityNames(raw: string): EntityNames {
  const words = splitWords(raw);
  const pascal = words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  const camel = pascal[0].toLowerCase() + pascal.slice(1);
  return { pascal, camel, snake: words.join('_'), folder: words.join('-') };
}

// ===========================================================================
// schema.ts (TypeBox — ORM-agnostic)
// ===========================================================================

export function renderEntitySchemaTs(n: EntityNames): string {
  return `import { Static, Type } from "@sinclair/typebox";

/**
 * TypeBox schema for the \`${n.camel}\` entity. Routes MUST import this schema
 * rather than inlining a \`Type.Object(...)\`. Add fields as your domain grows.
 */
export const ${n.pascal}Schema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type ${n.pascal} = Static<typeof ${n.pascal}Schema>;

/** Payload for creating a ${n.camel} — the server assigns id + timestamps. */
export const Create${n.pascal}Schema = Type.Object({
  name: Type.String(),
});

export type Create${n.pascal}Input = Static<typeof Create${n.pascal}Schema>;
`;
}

// ===========================================================================
// repository.ts (ORM-branched)
// ===========================================================================

function renderEntityRepositoryDrizzle(n: EntityNames): string {
  const idKey = `${n.camel}Id`;
  return `import { eq } from 'drizzle-orm';
import { db, schema } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";
import type { Create${n.pascal}Input } from "./schema";

/**
 * ${n.pascal} repository (Drizzle). Pure DB operations only — each catch
 * rethrows \`ErrorFactory.databaseError\` so the route error-handler can
 * normalize it. Token/expiry/multi-step logic belongs in \`service.ts\`.
 */

export const list${n.pascal}s = async () => {
  try {
    return await db.select().from(schema.${n.camel});
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'list${n.pascal}s',
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

export const get${n.pascal} = async (id: string) => {
  try {
    const [row] = await db
      .select()
      .from(schema.${n.camel})
      .where(eq(schema.${n.camel}.id, id))
      .limit(1);
    return row ?? null;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'get${n.pascal}',
      ${idKey}: id,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

export const create${n.pascal} = async (data: Create${n.pascal}Input) => {
  try {
    const [row] = await db.insert(schema.${n.camel}).values(data).returning();
    return row;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'create${n.pascal}',
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

export const delete${n.pascal} = async (id: string): Promise<void> => {
  try {
    await db.delete(schema.${n.camel}).where(eq(schema.${n.camel}.id, id));
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'delete${n.pascal}',
      ${idKey}: id,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};
`;
}

function renderEntityRepositoryPrisma(n: EntityNames): string {
  const idKey = `${n.camel}Id`;
  return `import { db } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";
import type { Create${n.pascal}Input } from "./schema";

/**
 * ${n.pascal} repository (Prisma). Pure DB operations only — each catch
 * rethrows \`ErrorFactory.databaseError\` so the route error-handler can
 * normalize it. Token/expiry/multi-step logic belongs in \`service.ts\`.
 */

export const list${n.pascal}s = async () => {
  try {
    return await db.${n.camel}.findMany();
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'list${n.pascal}s',
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

export const get${n.pascal} = async (id: string) => {
  try {
    return await db.${n.camel}.findUnique({ where: { id } });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'get${n.pascal}',
      ${idKey}: id,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

export const create${n.pascal} = async (data: Create${n.pascal}Input) => {
  try {
    return await db.${n.camel}.create({ data });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'create${n.pascal}',
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};

export const delete${n.pascal} = async (id: string): Promise<void> => {
  try {
    await db.${n.camel}.delete({ where: { id } });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'delete${n.pascal}',
      ${idKey}: id,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};
`;
}

export function renderEntityRepository(orm: ORMChoice, n: EntityNames): string {
  return orm === 'drizzle' ? renderEntityRepositoryDrizzle(n) : renderEntityRepositoryPrisma(n);
}

// ===========================================================================
// service.ts (ORM-agnostic orchestration)
// ===========================================================================

export function renderEntityServiceTs(n: EntityNames): string {
  return `import * as repository from "./repository";
import type { Create${n.pascal}Input } from "./schema";

/**
 * ${n.pascal} service — business logic that orchestrates repository calls.
 * ORM-agnostic: persistence is delegated to ./repository. Put validation,
 * multi-step operations, and external calls here; keep route handlers thin.
 */

export const list${n.pascal}s = () => repository.list${n.pascal}s();

export const get${n.pascal} = (id: string) => repository.get${n.pascal}(id);

export const create${n.pascal} = (data: Create${n.pascal}Input) =>
  repository.create${n.pascal}(data);

export const delete${n.pascal} = (id: string) => repository.delete${n.pascal}(id);
`;
}
