import { describe, it, expect } from 'vitest';
import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { multiServiceConfig } from '../fixtures/configs/multi-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

async function renderTemplate(relPath: string, ctx: Record<string, unknown>): Promise<string> {
  const tpl = await fs.readFile(path.join(REPO_ROOT, relPath), 'utf-8');
  return ejs.render(tpl, ctx);
}

/**
 * Regression lock for the phase-2-fixes docs rewrite (fix #2).
 *
 * If anyone reintroduces `monorepo-root/` into the generated docs, or
 * drops the up-the-tree traversal language, these assertions fail.
 */
describe('generated AGENTS.md', () => {
  const ctx = {
    projectName: multiServiceConfig.projectName,
    packageManager: multiServiceConfig.packageManager,
    orm: multiServiceConfig.orm,
    aiTools: multiServiceConfig.aiTools,
    services: multiServiceConfig.services,
    guidelineFileName: 'AGENTS.md',
  };

  it('does not mention the create-stackr-internal `monorepo-root/` path', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    expect(rendered).not.toMatch(/monorepo-root/);
  });

  it('does not mention the `project/` create-stackr-internal path', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    // Match the folder name as a path (e.g. `project/`), not as a common word
    // (e.g. "project root"). Look for `project/` path-tokens only.
    expect(rendered).not.toMatch(/(?:^|[\s"`'])project\//m);
  });

  it('contains up-the-tree traversal language ("upward")', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    expect(rendered).toMatch(/upward/i);
  });

  it('mentions reading parent DESIGN.md files', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    expect(rendered).toMatch(/parent DESIGN\.md/);
  });

  it('instructs agents to read "as deeply as" the task requires', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    expect(rendered).toMatch(/as deeply as/);
  });

  it('mentions up-the-tree reading at least twice', async () => {
    // "upward" must appear in the hierarchy/usage section AND the closing
    // principle — the phase-2 rewrite only said it once.
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    const matches = rendered.match(/upward/gi) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('lists every service in services[] by name', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    for (const svc of multiServiceConfig.services) {
      expect(rendered).toContain(svc.name);
    }
  });

  it('renders without leaving any raw EJS markers', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    expect(rendered).not.toMatch(/<%[=_-]?/);
    expect(rendered).not.toMatch(/%>/);
  });

  it('contains DESIGN.md / BEST_PRACTICES.md closing principle', async () => {
    const rendered = await renderTemplate('templates/shared/AGENTS.md.ejs', ctx);
    expect(rendered).toMatch(/DESIGN\.md\s*=/);
    expect(rendered).toMatch(/BEST_PRACTICES\.md\s*=/);
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
