/**
 * Generate the single pinned mobile app the eval runs against: one app from a
 * fixed stackr commit, generated once and reused across every run.
 *
 * TypeScript so the hand-built `InitConfig` is shape-checked (`npm run
 * typecheck:eval`). Run directly with `node` (native type-stripping) after a
 * build (it imports the BUILT generators from dist/, not src):
 *
 *   npm run build
 *   node eval/harness/generate-app.ts
 *
 * Produces:
 *   .work/app            — the generated monorepo (auth + a mobile-enabled core)
 *   .work/scorer-config  — a snapshot of sgconfig.yml + .stackr/sg-rules taken
 *                          BEFORE any condition strips them, so the scorer is
 *                          condition-independent (and drift-free: the rules come
 *                          straight from the built ai-context generator).
 *
 * THROWAWAY. Pin the stackr commit by checking it out (and rebuilding) before
 * running; the SHA is recorded in .work/provenance.json.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import type { InitConfig } from '../../src/types/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const WORK = process.env.EVAL_WORKDIR ?? path.resolve(HERE, '..', '.work');
const APP = path.join(WORK, 'app');
const SCORER = path.join(WORK, 'scorer-config');
const ORM = (process.env.EVAL_ORM as 'drizzle' | 'prisma') ?? 'drizzle';

const distMonorepo = path.join(REPO_ROOT, 'dist', 'generators', 'monorepo.js');
const distPresets = path.join(REPO_ROOT, 'dist', 'config', 'presets.js');
if (!fs.existsSync(distMonorepo) || !fs.existsSync(distPresets)) {
  console.error('Built generators not found. Run `npm run build` first, then re-run this script.');
  process.exit(1);
}

const { MonorepoGenerator } = await import(pathToFileURL(distMonorepo).href);
const { authEntry, coreEntry, noIntegrations } = await import(pathToFileURL(distPresets).href);

// Recursive copy without pulling in fs-extra.
async function copyDir(src: string, dest: string): Promise<void> {
  await fsp.mkdir(dest, { recursive: true });
  for (const entry of await fsp.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fsp.copyFile(s, d);
  }
}

// Mirrors the minimal --defaults shape, but with mobile ON, drizzle (so the
// no-auth-tables ast-grep rule also emits), and ALL aiTools selected so every
// salience + enforcement artifact is present for the conditions to toggle.
const cfg: InitConfig = {
  projectName: 'eval-mobile',
  packageManager: 'npm',
  appScheme: 'm0eval',
  orm: ORM,
  aiTools: ['claude', 'codex', 'cursor', 'windsurf'],
  preset: 'minimal',
  customized: true,
  services: [
    authEntry({
      emailVerification: false,
      passwordReset: true,
      adminDashboard: false,
      provisioningTargets: ['core'],
    }),
    coreEntry({
      name: 'core',
      backend: { port: 8080, eventQueue: false, imageUploads: false, authMiddleware: 'standard' },
      web: null,
      mobile: { enabled: true },
      integrations: noIntegrations(),
    }),
  ],
};

await fsp.rm(APP, { recursive: true, force: true });
await fsp.mkdir(WORK, { recursive: true });

await new MonorepoGenerator(cfg).generate(APP);

// Sanity: the mobile subsystem + its enforcement rules must be present.
const mustExist = [
  path.join(APP, 'core', 'mobile'),
  path.join(APP, 'sgconfig.yml'),
  path.join(APP, '.stackr', 'sg-rules', 'mobile-no-hardcoded-color.yml'),
  path.join(APP, '.stackr', 'sg-rules', 'mobile-animated-native-driver.yml'),
  path.join(APP, '.stackr', 'sg-rules', 'mobile-no-direct-fetch.yml'),
];
for (const p of mustExist) {
  if (!fs.existsSync(p)) throw new Error(`Expected artifact missing after generation: ${p}`);
}

// Condition-independent scorer config (taken before any strip).
await fsp.rm(SCORER, { recursive: true, force: true });
await fsp.mkdir(SCORER, { recursive: true });
await fsp.copyFile(path.join(APP, 'sgconfig.yml'), path.join(SCORER, 'sgconfig.yml'));
await copyDir(path.join(APP, '.stackr'), path.join(SCORER, '.stackr'));

await fsp.writeFile(
  path.join(WORK, 'provenance.json'),
  JSON.stringify(
    {
      generatedFrom: 'eval/harness/generate-app.ts',
      orm: ORM,
      aiTools: cfg.aiTools,
      note: 'Pin the stackr commit by checking it out + rebuilding before generating; record its SHA here.',
    },
    null,
    2
  )
);

console.log('✓ generated app   →', APP);
console.log('✓ scorer config   →', SCORER);
console.log('Next: node eval/harness/run.ts --setup');
