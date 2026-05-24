import {
  Project,
  SyntaxKind,
  IndentationText,
  type ObjectLiteralExpression,
  type PropertyAssignment,
} from 'ts-morph';

import { capitalizeServiceName, snakeServiceName } from './capitalize.js';

const HAS_ACCOUNT_RE = /^has[A-Z]\w*Account$/;

/**
 * Additive merge for `<authService>/backend/lib/auth.ts`.
 *
 * Walks to `betterAuth({ user: { additionalFields: { … } } })` and inserts
 * a `has<Cap>Account` property for each target in `desiredTargets` that is
 * not already present. Existing properties (including `role`, other
 * `has<Cap>Account` entries, and anything the user added themselves) are
 * preserved untouched, as are imports, comments, and unrelated code.
 *
 * Pure: takes source text + targets, returns the new source text. Throws
 * a descriptive error if the expected structure is missing.
 */
export function mergeAuthLibTs(source: string, desiredTargets: readonly string[]): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
  const sf = project.createSourceFile('auth.ts', source);

  const call = sf
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((c) => c.getExpression().getText() === 'betterAuth');
  if (!call) {
    throw new Error(`mergeAuthLibTs: no betterAuth(...) call found in source`);
  }

  const args = call.getArguments();
  if (args.length === 0 || args[0].getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error(`mergeAuthLibTs: betterAuth() is not called with an object literal`);
  }

  const root = args[0] as ObjectLiteralExpression;
  const userObj = getObjectProperty(root, 'user');
  if (!userObj) {
    throw new Error(`mergeAuthLibTs: missing \`user\` property in betterAuth(...) call`);
  }
  const additionalFields = getObjectProperty(userObj, 'additionalFields');
  if (!additionalFields) {
    throw new Error(
      `mergeAuthLibTs: missing \`additionalFields\` under user in betterAuth(...) call`
    );
  }

  const existing = collectHasAccountNames(additionalFields);
  const toAdd = desiredTargets.filter((t) => !existing.has(`has${capitalizeServiceName(t)}Account`));
  if (toAdd.length === 0) return sf.getFullText();

  for (const target of toAdd) {
    const name = `has${capitalizeServiceName(target)}Account`;
    // Single-line initializer — ts-morph's multi-line indentation
    // compounds the parent indent with its own, which produces uneven
    // output. The single-line form is deterministic and parses cleanly;
    // users who prefer multi-line can run prettier/biome over the file.
    additionalFields.addPropertyAssignment({
      name,
      initializer: '{ type: "boolean", defaultValue: false, input: false }',
    });
  }

  return sf.getFullText();
}

/**
 * Additive merge for `<authService>/backend/drizzle/schema.ts`.
 *
 * Walks to `pgTable('user', { … })` and inserts a
 * `has<Cap>Account: boolean('has_<snake>_account').default(false).notNull()`
 * property for each missing target. Same preservation semantics as
 * `mergeAuthLibTs`.
 */
export function mergeAuthSchemaDrizzle(
  source: string,
  desiredTargets: readonly string[]
): string {
  const project = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
  const sf = project.createSourceFile('schema.ts', source);

  const call = sf.getDescendantsOfKind(SyntaxKind.CallExpression).find((c) => {
    if (c.getExpression().getText() !== 'pgTable') return false;
    const firstArg = c.getArguments()[0];
    if (!firstArg) return false;
    const text = firstArg.getText();
    return text === `'user'` || text === `"user"`;
  });
  if (!call) {
    throw new Error(`mergeAuthSchemaDrizzle: no pgTable('user', {...}) call found in source`);
  }

  const args = call.getArguments();
  if (args.length < 2 || args[1].getKind() !== SyntaxKind.ObjectLiteralExpression) {
    throw new Error(
      `mergeAuthSchemaDrizzle: pgTable('user', ...) second argument is not an object literal`
    );
  }
  const userTable = args[1] as ObjectLiteralExpression;

  const existing = collectHasAccountNames(userTable);
  const toAdd = desiredTargets.filter((t) => !existing.has(`has${capitalizeServiceName(t)}Account`));
  if (toAdd.length === 0) return sf.getFullText();

  for (const target of toAdd) {
    const name = `has${capitalizeServiceName(target)}Account`;
    const col = `has_${snakeServiceName(target)}_account`;
    userTable.addPropertyAssignment({
      name,
      initializer: `boolean('${col}').default(false).notNull()`,
    });
  }

  return sf.getFullText();
}

function getObjectProperty(
  obj: ObjectLiteralExpression,
  name: string
): ObjectLiteralExpression | null {
  const prop = obj.getProperty(name);
  if (!prop || prop.getKind() !== SyntaxKind.PropertyAssignment) return null;
  const init = (prop as PropertyAssignment).getInitializer();
  if (!init || init.getKind() !== SyntaxKind.ObjectLiteralExpression) return null;
  return init as ObjectLiteralExpression;
}

function collectHasAccountNames(obj: ObjectLiteralExpression): Set<string> {
  const out = new Set<string>();
  for (const p of obj.getProperties()) {
    if (p.getKind() !== SyntaxKind.PropertyAssignment) continue;
    const name = (p as PropertyAssignment).getName();
    if (HAS_ACCOUNT_RE.test(name)) out.add(name);
  }
  return out;
}
