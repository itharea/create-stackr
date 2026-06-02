import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const AST_GREP = path.join(REPO_ROOT, 'node_modules', '.bin', 'ast-grep');

/**
 * Plan non-negotiable #2 — verify the enforcement layer with the REAL binary
 * against a generated tree. YAML parsing + matcher-string presence is not
 * verification; we run `ast-grep scan` and the Prisma node-script and assert
 * exit codes against pristine code and planted bad fixtures.
 */
describe('enforcement layer (real ast-grep + node script)', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'enforce-'));
  }, 60000);

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  async function generate(orm: 'drizzle' | 'prisma', name: string): Promise<string> {
    const cfg = cloneInitConfig(minimalConfig);
    cfg.orm = orm;
    cfg.projectName = name;
    cfg.aiTools = ['codex'];
    const dir = path.join(tempDir, name);
    await new MonorepoGenerator(cfg).generate(dir);
    return dir;
  }

  function astGrep(cwd: string): { code: number; out: string } {
    const res = spawnSync(AST_GREP, ['scan'], { cwd, encoding: 'utf8' });
    return { code: res.status ?? -1, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
  }

  it('ast-grep passes (no errors) on a pristine drizzle project', async () => {
    expect(await fs.pathExists(AST_GREP), '@ast-grep/cli devDep must be installed').toBe(true);
    const dir = await generate('drizzle', 'pristine-drizzle');
    const { code, out } = astGrep(dir);
    expect(out).not.toMatch(/error\[/);
    expect(code).toBe(0);
  }, 60000);

  it('repo-catch rule fires (error) on a repository catch that does not rethrow databaseError', async () => {
    const dir = await generate('drizzle', 'bad-repo');
    const repo = path.join(dir, 'core/backend/domain/widget/repository.ts');
    await fs.outputFile(
      repo,
      [
        'export async function findWidget(id: string) {',
        '  try {',
        '    return await db.query(id);',
        '  } catch (error) {',
        '    throw error; // VIOLATION: not ErrorFactory.databaseError',
        '  }',
        '}',
        '',
      ].join('\n')
    );
    const { code, out } = astGrep(dir);
    expect(out).toMatch(/repo-catch-database-error/);
    expect(code).not.toBe(0);
  }, 60000);

  it('no-auth-tables rule fires (error) when a base service declares a user table (drizzle)', async () => {
    const dir = await generate('drizzle', 'bad-schema');
    const schema = path.join(dir, 'core/backend/drizzle/schema.ts');
    await fs.appendFile(
      schema,
      "\nexport const user = pgTable('user', { id: text('id').primaryKey() });\n"
    );
    const { code, out } = astGrep(dir);
    expect(out).toMatch(/no-auth-tables-outside-auth/);
    expect(code).not.toBe(0);
  }, 60000);

  it('Prisma auth-table node script: passes pristine, fails when a base service adds model User', async () => {
    const dir = await generate('prisma', 'prisma-auth');
    const run = () => spawnSync('node', ['scripts/check-auth-tables.mjs'], { cwd: dir, encoding: 'utf8' });

    const pristine = run();
    expect(pristine.status, pristine.stderr).toBe(0);

    const schema = path.join(dir, 'core/backend/prisma/schema.prisma');
    await fs.appendFile(schema, '\nmodel User {\n  id String @id @default(cuid())\n}\n');
    const violated = run();
    expect(violated.status).toBe(1);
    expect(`${violated.stderr}${violated.stdout}`).toMatch(/User/);
  }, 60000);
});
