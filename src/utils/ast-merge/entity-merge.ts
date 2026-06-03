import { Project, SyntaxKind, IndentationText } from 'ts-morph';
import { getSchema, type Model } from '@mrleebo/prisma-ast';

import type { EntityNames } from '../../generators/entity-codegen.js';

/**
 * Additive merge for a service's `drizzle/schema.ts`: append a new
 * `export const <camel> = pgTable('<snake>', { … })` so the generated
 * `repository.ts` (which references `schema.<camel>`) type-checks.
 *
 * Uses ts-morph for collision detection + import management (clean, single-line
 * import edits), then TEXT-APPENDS the new table block so existing tables,
 * comments, and formatting are preserved byte-for-byte. Throws on collision.
 */
export function addEntityTableDrizzle(source: string, names: EntityNames): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
  const sf = project.createSourceFile('schema.ts', source);

  if (sf.getVariableDeclaration(names.camel)) {
    throw new Error(
      `addEntityTableDrizzle: an export named "${names.camel}" already exists in schema.ts`
    );
  }
  const tableExists = sf.getDescendantsOfKind(SyntaxKind.CallExpression).some((c) => {
    if (c.getExpression().getText() !== 'pgTable') return false;
    const arg0 = c.getArguments()[0];
    if (!arg0) return false;
    const text = arg0.getText();
    return text === `'${names.snake}'` || text === `"${names.snake}"`;
  });
  if (tableExists) {
    throw new Error(`addEntityTableDrizzle: a pgTable('${names.snake}') already exists in schema.ts`);
  }

  ensureDrizzlePgCoreImports(sf);
  const withImports = sf.getFullText().replace(/\s+$/, '');

  const block = `export const ${names.camel} = pgTable('${names.snake}', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});`;

  return `${withImports}\n\n${block}\n`;
}

/** Ensure the `drizzle-orm/pg-core` import provides pgTable/text/timestamp. */
function ensureDrizzlePgCoreImports(sf: import('ts-morph').SourceFile): void {
  const needed = ['pgTable', 'text', 'timestamp'];
  const imp = sf.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'drizzle-orm/pg-core');
  if (!imp) {
    sf.addImportDeclaration({ moduleSpecifier: 'drizzle-orm/pg-core', namedImports: needed });
    return;
  }
  const existing = new Set(imp.getNamedImports().map((n) => n.getName()));
  for (const name of needed) {
    if (!existing.has(name)) imp.addNamedImport(name);
  }
}

/**
 * Additive merge for a service's `prisma/schema.prisma`: append a new
 * `model <Pascal> { … @@map("<snake>") }`. Collision is detected via the prisma
 * CST (`getSchema`); the block is then TEXT-APPENDED so existing models keep
 * their exact formatting. Throws on collision.
 */
export function addEntityModelPrisma(source: string, names: EntityNames): string {
  const schema = getSchema(source);
  const exists = schema.list.some(
    (b): b is Model => b.type === 'model' && b.name === names.pascal
  );
  if (exists) {
    throw new Error(`addEntityModelPrisma: a "model ${names.pascal}" already exists in schema.prisma`);
  }

  const block = `model ${names.pascal} {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("${names.snake}")
}`;

  return `${source.replace(/\s+$/, '')}\n\n${block}\n`;
}
