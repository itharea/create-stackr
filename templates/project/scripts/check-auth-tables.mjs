#!/usr/bin/env node
/**
 * Enforces the auth trust-anchor boundary for **Prisma** projects: only the
 * `auth` service may declare the `user` / `session` / `account` / `verification`
 * models. Run from the monorepo root (`node scripts/check-auth-tables.mjs`).
 *
 * Drizzle projects are covered by the ast-grep rule
 * `.stackr/sg-rules/no-auth-tables-outside-auth.yml`, so this script finds no
 * `schema.prisma` files there and exits 0 — keeping the boundary enforced for
 * both ORMs. The auth service name is read from `stackr.config.json`.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cfgPath = path.join(root, 'stackr.config.json');
if (!fs.existsSync(cfgPath)) process.exit(0);

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
} catch {
  process.exit(0);
}

const services = Array.isArray(cfg.services) ? cfg.services : [];
const authNames = new Set(services.filter((s) => s.kind === 'auth').map((s) => s.name));

// `model User {`, `model Session {`, etc. — comment lines are stripped first so
// the schema's doc banner ("User / session tables live in the auth service")
// never trips the check.
const FORBIDDEN = /^\s*model\s+(User|Session|Account|Verification)\b/m;
const violations = [];

for (const svc of services) {
  if (authNames.has(svc.name)) continue;
  const schemaPath = path.join(root, svc.name, 'backend', 'prisma', 'schema.prisma');
  if (!fs.existsSync(schemaPath)) continue;
  const code = fs.readFileSync(schemaPath, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const match = code.match(FORBIDDEN);
  if (match) {
    violations.push(`${svc.name}: prisma model ${match[1]} — auth-owned table outside the auth service`);
  }
}

if (violations.length > 0) {
  console.error(
    'Auth-table boundary violation (only the `auth` service may own user/session/account/verification):'
  );
  for (const v of violations) console.error(`  - ${v}`);
  console.error('Verify sessions via ${AUTH_SERVICE_URL}/api/auth/get-session instead of a local table.');
  process.exit(1);
}

process.exit(0);
