import { getSchema, printSchema, type Field, type Model } from '@mrleebo/prisma-ast';

import { capitalizeServiceName } from './capitalize.js';

const HAS_ACCOUNT_RE = /^has[A-Z]\w*Account$/;

/**
 * Additive merge for `<authService>/backend/prisma/schema.prisma`.
 *
 * Walks the schema CST, finds the `User` model, and inserts a
 * `has<Cap>Account Boolean @default(false)` field for each missing
 * target. Comments, unrelated fields, attributes, and existing
 * `has<Cap>Account` entries are preserved.
 *
 * Pure: takes source text + targets, returns the new source text.
 */
export function mergeAuthSchemaPrisma(
  source: string,
  desiredTargets: readonly string[]
): string {
  const schema = getSchema(source);

  const userModel = schema.list.find(
    (b): b is Model => b.type === 'model' && b.name === 'User'
  );
  if (!userModel) {
    throw new Error(`mergeAuthSchemaPrisma: no \`model User\` block found in source`);
  }

  const existing = new Set<string>();
  for (const p of userModel.properties) {
    if (p.type !== 'field') continue;
    if (HAS_ACCOUNT_RE.test(p.name)) existing.add(p.name);
  }

  const toAdd = desiredTargets.filter(
    (t) => !existing.has(`has${capitalizeServiceName(t)}Account`)
  );
  if (toAdd.length === 0) return source;

  for (const target of toAdd) {
    const name = `has${capitalizeServiceName(target)}Account`;
    const field: Field = {
      type: 'field',
      name,
      fieldType: 'Boolean',
      attributes: [
        {
          type: 'attribute',
          kind: 'field',
          name: 'default',
          args: [{ type: 'attributeArgument', value: 'false' }],
        },
      ],
    };
    userModel.properties.push(field);
  }

  return printSchema(schema);
}
