import { describe, it, expect } from 'vitest';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { multiServiceConfig } from '../fixtures/configs/multi-service.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { buildAIContextPlan } from '../../src/generators/ai-context.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

async function renderTemplate(relPath: string, ctx: Record<string, unknown>): Promise<string> {
  const tpl = await fs.readFile(path.join(REPO_ROOT, relPath), 'utf-8');
  return ejs.render(tpl, ctx);
}

/**
 * The PULL router (`templates/shared/AGENTS.md.ejs`, "walk upward and read
 * every DESIGN.md") was retired in favour of a PUSH backbone emitted by the
 * `ai-context` generator. These assertions lock the new shape: a lean root
 * AGENTS.md driven by the context-map, a CLAUDE.md `@AGENTS.md` bridge, and
 * NO surviving up-the-tree / PULL phrasing.
 */
describe('generated AGENTS.md backbone (ai-context)', () => {
  const plan = buildAIContextPlan('/proj', cloneInitConfig(multiServiceConfig));
  const find = (rel: string): string =>
    plan.find((e) => e.destPath === path.posix.join('/proj', rel) && e.action === 'write')
      ?.contents ?? '';

  it('emits a lean root AGENTS.md with the service map and the trust-anchor rule', () => {
    const root = find('AGENTS.md');
    expect(root).toContain(`# ${multiServiceConfig.projectName}`);
    for (const svc of multiServiceConfig.services) {
      expect(root, `root AGENTS.md missing service ${svc.name}`).toContain(svc.name);
    }
    expect(root).toMatch(/NEVER add `user`/);
    expect(root).toContain('/api/auth/get-session');
  });

  it('retires the PULL phrasing (no "walk upward" / "parent DESIGN.md" / internal paths)', () => {
    const root = find('AGENTS.md');
    expect(root).not.toMatch(/walk upward/i);
    expect(root).not.toMatch(/parent DESIGN\.md/);
    expect(root).not.toMatch(/monorepo-root/);
  });

  it('bridges Claude to AGENTS.md via an @import on the first line', () => {
    expect(find('CLAUDE.md')).toMatch(/^@AGENTS\.md/);
  });

  it('emits a backend subsystem AGENTS.md carrying the repository try/catch rule', () => {
    const backend = find('auth/backend/AGENTS.md');
    expect(backend).toMatch(/ErrorFactory\.databaseError/);
  });

  it('leaves no raw EJS markers in any emitted artifact', () => {
    for (const entry of plan) {
      if (entry.action === 'write' && entry.contents) {
        expect(entry.contents, `EJS marker in ${entry.destPath}`).not.toMatch(/<%[=_-]?/);
        expect(entry.contents, `EJS marker in ${entry.destPath}`).not.toMatch(/%>/);
      }
    }
  });
});

describe('generated DESIGN.md', () => {
  const ctx = {
    projectName: multiServiceConfig.projectName,
    packageManager: multiServiceConfig.packageManager,
    orm: multiServiceConfig.orm,
    appScheme: multiServiceConfig.appScheme,
    aiTools: multiServiceConfig.aiTools,
    services: multiServiceConfig.services,
    preset: multiServiceConfig.preset,
  };

  it('does not mention the create-stackr-internal `monorepo-root/` path', async () => {
    const rendered = await renderTemplate('templates/project/DESIGN.md.ejs', ctx);
    expect(rendered).not.toMatch(/monorepo-root/);
  });

  it('does not mention `project/` as a folder path', async () => {
    const rendered = await renderTemplate('templates/project/DESIGN.md.ejs', ctx);
    expect(rendered).not.toMatch(/(?:^|[\s"`'])project\//m);
  });

  it('contains a per-service tech stack section', async () => {
    const rendered = await renderTemplate('templates/project/DESIGN.md.ejs', ctx);
    expect(rendered).toMatch(/Tech stack/i);
    for (const svc of multiServiceConfig.services) {
      expect(rendered).toContain(svc.name);
    }
  });

  it('mentions per-service DB + Redis isolation', async () => {
    const rendered = await renderTemplate('templates/project/DESIGN.md.ejs', ctx);
    expect(rendered).toMatch(/own Postgres/i);
    expect(rendered).toMatch(/own Redis/i);
  });

  it('describes the auth cookie-forwarding pattern', async () => {
    const rendered = await renderTemplate('templates/project/DESIGN.md.ejs', ctx);
    expect(rendered).toContain('/api/auth/get-session');
  });

  it('renders without leaving any raw EJS markers', async () => {
    const rendered = await renderTemplate('templates/project/DESIGN.md.ejs', ctx);
    expect(rendered).not.toMatch(/<%[=_-]?/);
    expect(rendered).not.toMatch(/%>/);
  });
});

describe('generated README.md', () => {
  const ctx = {
    projectName: multiServiceConfig.projectName,
    packageManager: multiServiceConfig.packageManager,
    orm: multiServiceConfig.orm,
    appScheme: multiServiceConfig.appScheme,
    aiTools: multiServiceConfig.aiTools,
    services: multiServiceConfig.services,
    preset: multiServiceConfig.preset,
  };

  it('does not mention the create-stackr-internal `monorepo-root/` path', async () => {
    const rendered = await renderTemplate('templates/project/README.md.ejs', ctx);
    expect(rendered).not.toMatch(/monorepo-root/);
  });

  it('does not mention `project/` as a folder path', async () => {
    const rendered = await renderTemplate('templates/project/README.md.ejs', ctx);
    expect(rendered).not.toMatch(/(?:^|[\s"`'])project\//m);
  });

  it('lists every service in its Services section', async () => {
    const rendered = await renderTemplate('templates/project/README.md.ejs', ctx);
    for (const svc of multiServiceConfig.services) {
      expect(rendered).toContain(svc.name);
    }
  });
});
