import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {
  buildAIContextPlan,
  writeAIContextPlan,
  type AIContextArtifact,
} from '../../src/generators/ai-context.js';
import {
  CONTEXT_RULES,
  selectProjectRules,
  selectServiceRules,
  subsystemsForService,
} from '../../src/config/context-map.js';
import type { InitConfig } from '../../src/types/index.js';
import { multiServiceConfig } from '../fixtures/configs/multi-service.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

const ROOT = '/proj';

function planFor(overrides: Partial<InitConfig>): AIContextArtifact[] {
  const cfg = cloneInitConfig(multiServiceConfig);
  Object.assign(cfg, overrides);
  return buildAIContextPlan(ROOT, cfg);
}

function write(plan: AIContextArtifact[], rel: string): string | undefined {
  return plan.find((e) => e.destPath === path.join(ROOT, rel) && e.action === 'write')?.contents;
}
function hasWrite(plan: AIContextArtifact[], rel: string): boolean {
  return write(plan, rel) !== undefined;
}
function hasDelete(plan: AIContextArtifact[], rel: string): boolean {
  return plan.some((e) => e.destPath === path.join(ROOT, rel) && e.action === 'delete');
}

// ===========================================================================
// context-map selectors
// ===========================================================================
describe('context-map selectors', () => {
  it('selectProjectRules returns only project-scope rules', () => {
    const rules = selectProjectRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.scope === 'project')).toBe(true);
  });

  it('omits web/mobile rules for a backend-only service', () => {
    const rules = selectServiceRules({ kind: 'base', platforms: [], orm: 'drizzle' });
    expect(rules.some((r) => r.subsystem === 'backend')).toBe(true);
    expect(rules.some((r) => r.subsystem === 'web')).toBe(false);
    expect(rules.some((r) => r.subsystem === 'mobile')).toBe(false);
  });

  it('includes web + mobile rules when both platforms are present', () => {
    const rules = selectServiceRules({ kind: 'base', platforms: ['web', 'mobile'], orm: 'drizzle' });
    expect(rules.some((r) => r.subsystem === 'web')).toBe(true);
    expect(rules.some((r) => r.subsystem === 'mobile')).toBe(true);
  });

  it('subsystemsForService always includes backend and reflects platforms', () => {
    expect(subsystemsForService({ kind: 'auth', platforms: [], orm: 'prisma' })).toEqual(['backend']);
    expect(subsystemsForService({ kind: 'base', platforms: ['web'], orm: 'prisma' })).toEqual([
      'backend',
      'web',
    ]);
  });

  it('every rule has at least one bullet and a non-empty id', () => {
    for (const r of CONTEXT_RULES) {
      expect(r.id.length, r.id).toBeGreaterThan(0);
      expect(r.ruleSummary.length, r.id).toBeGreaterThan(0);
    }
  });
});

// ===========================================================================
// buildAIContextPlan — artifact set + gating
// ===========================================================================
describe('buildAIContextPlan — baseline + gating', () => {
  it('always emits the AGENTS.md + CLAUDE.md baseline and the ast-grep config', () => {
    const plan = planFor({ aiTools: [] });
    expect(hasWrite(plan, 'AGENTS.md')).toBe(true);
    expect(hasWrite(plan, 'CLAUDE.md')).toBe(true);
    expect(hasWrite(plan, 'sgconfig.yml')).toBe(true);
    expect(hasWrite(plan, '.stackr/sg-rules/repo-catch-database-error.yml')).toBe(true);
  });

  it('emits one AGENTS.md per service plus its subsystems', () => {
    const plan = planFor({});
    // Fixture shape: scout = mobile only; manage = web only; core + auth = backend only.
    expect(hasWrite(plan, 'scout/AGENTS.md')).toBe(true);
    expect(hasWrite(plan, 'scout/backend/AGENTS.md')).toBe(true);
    expect(hasWrite(plan, 'scout/mobile/AGENTS.md')).toBe(true);
    expect(hasWrite(plan, 'scout/web/AGENTS.md')).toBe(false);
    expect(hasWrite(plan, 'manage/web/AGENTS.md')).toBe(true);
    expect(hasWrite(plan, 'manage/mobile/AGENTS.md')).toBe(false);
    expect(hasWrite(plan, 'core/mobile/AGENTS.md')).toBe(false);
  });

  it('gates push glob rules + retires the legacy flat files, with deletes when a tool is absent', () => {
    const none = planFor({ aiTools: ['codex'] });
    // legacy flat files are always retired (never written, always deleted)
    expect(hasWrite(none, '.cursorrules')).toBe(false);
    expect(hasDelete(none, '.cursorrules')).toBe(true);
    expect(hasDelete(none, '.windsurfrules')).toBe(true);
    // no glob-rule dirs when neither tool is selected
    expect(hasWrite(none, '.cursor/rules/backend-domain.mdc')).toBe(false);
    expect(hasDelete(none, '.cursor/rules')).toBe(true);
    expect(hasDelete(none, '.windsurf/rules')).toBe(true);
    expect(hasDelete(none, '.claude/settings.json')).toBe(true);

    const all = planFor({ aiTools: ['codex', 'claude', 'cursor', 'windsurf'] });
    expect(hasWrite(all, '.cursorrules')).toBe(false);
    expect(hasDelete(all, '.cursorrules')).toBe(true);
    expect(hasWrite(all, '.cursor/rules/backend-domain.mdc')).toBe(true);
    expect(hasWrite(all, '.windsurf/rules/backend-domain.md')).toBe(true);
    expect(hasWrite(all, '.claude/settings.json')).toBe(true);
    expect(hasWrite(all, '.claude/hooks/check-edited.mjs')).toBe(true);
  });

  it('ignores unknown/legacy tool strings', () => {
    const cfg = cloneInitConfig(multiServiceConfig);
    const plan = buildAIContextPlan(ROOT, cfg, {
      aiTools: ['cursor', 'bogus-tool' as never],
    });
    expect(hasWrite(plan, '.cursor/rules/backend-domain.mdc')).toBe(true);
    expect(hasDelete(plan, '.windsurf/rules')).toBe(true);
  });

  it('emits the Drizzle no-auth-tables rule only for drizzle projects with an auth + non-auth split', () => {
    const drizzle = planFor({ orm: 'drizzle' });
    expect(hasWrite(drizzle, '.stackr/sg-rules/no-auth-tables-outside-auth.yml')).toBe(true);
    // its `files` list names every non-auth service and never the auth service
    const rule = write(drizzle, '.stackr/sg-rules/no-auth-tables-outside-auth.yml')!;
    expect(rule).toContain('core/backend/drizzle/');
    expect(rule).not.toMatch(/^\s*-\s*"auth\/backend\/drizzle/m);

    const prisma = planFor({ orm: 'prisma' });
    expect(hasWrite(prisma, '.stackr/sg-rules/no-auth-tables-outside-auth.yml')).toBe(false);
    expect(hasDelete(prisma, '.stackr/sg-rules/no-auth-tables-outside-auth.yml')).toBe(true);
  });

  it('emits the three mobile sg-rules when a service has mobile, deletes them otherwise', () => {
    const withMobile = planFor({}); // fixture: scout has mobile
    expect(hasWrite(withMobile, '.stackr/sg-rules/mobile-animated-native-driver.yml')).toBe(true);
    expect(hasWrite(withMobile, '.stackr/sg-rules/mobile-no-direct-fetch.yml')).toBe(true);
    expect(hasWrite(withMobile, '.stackr/sg-rules/mobile-no-hardcoded-color.yml')).toBe(true);

    const cfg = cloneInitConfig(multiServiceConfig);
    cfg.services = cfg.services.map((s) => ({ ...s, mobile: null }));
    const noMobile = buildAIContextPlan(ROOT, cfg);
    expect(hasWrite(noMobile, '.stackr/sg-rules/mobile-no-hardcoded-color.yml')).toBe(false);
    expect(hasDelete(noMobile, '.stackr/sg-rules/mobile-animated-native-driver.yml')).toBe(true);
  });

  it('drops the no-auth-tables rule when there is no auth service', () => {
    const cfg = cloneInitConfig(multiServiceConfig);
    cfg.orm = 'drizzle';
    cfg.services = cfg.services.filter((s) => s.kind !== 'auth');
    const plan = buildAIContextPlan(ROOT, cfg);
    expect(hasDelete(plan, '.stackr/sg-rules/no-auth-tables-outside-auth.yml')).toBe(true);
  });

  it('produces a valid, byte-stable Claude settings.json with the PostToolUse hook', () => {
    const a = write(planFor({ aiTools: ['claude'] }), '.claude/settings.json')!;
    const b = write(planFor({ aiTools: ['claude'] }), '.claude/settings.json')!;
    expect(a).toBe(b);
    const parsed = JSON.parse(a);
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('Edit|Write|MultiEdit');
    expect(parsed.hooks.PostToolUse[0].hooks[0].command).toContain('check-edited.mjs');
  });

  it('emits no raw EJS markers in any artifact', () => {
    for (const e of planFor({ aiTools: ['codex', 'claude', 'cursor', 'windsurf'] })) {
      if (e.action === 'write' && e.contents) {
        expect(e.contents, e.destPath).not.toMatch(/<%[=_-]?/);
        expect(e.contents, e.destPath).not.toMatch(/%>/);
      }
    }
  });
});

// ===========================================================================
// Single-source-of-truth — cross-format rule-body agreement.
// Replaces the retired PULL-phrase regression lock.
// ===========================================================================
describe('single source of truth (cross-format rule-body agreement)', () => {
  const plan = planFor({ aiTools: ['codex', 'claude', 'cursor', 'windsurf'] });

  // The bullet lines from a glob-rule file body (after stripping frontmatter).
  const bodyBullets = (text: string): string[] =>
    text
      .replace(/^---[\s\S]*?\n---\n/, '')
      .split('\n')
      .filter((l) => l.startsWith('- '));

  // Folder-rule ids applicable to the fixture project.
  const applicableFolderIds = (): Set<string> => {
    const cfg = cloneInitConfig(multiServiceConfig);
    const ids = new Set<string>();
    for (const svc of cfg.services) {
      const platforms = [
        ...(svc.web?.enabled ? ['web' as const] : []),
        ...(svc.mobile?.enabled ? ['mobile' as const] : []),
      ];
      for (const rule of selectServiceRules({ kind: svc.kind, platforms, orm: cfg.orm })) {
        if (rule.scope === 'folder') ids.add(rule.id);
      }
    }
    return ids;
  };

  it('renders each folder rule body identically across Cursor `.mdc` and Windsurf `.md`', () => {
    const ids = applicableFolderIds();
    expect(ids.size).toBeGreaterThan(0);
    for (const id of ids) {
      const cur = write(plan, `.cursor/rules/${id}.mdc`);
      const win = write(plan, `.windsurf/rules/${id}.md`);
      expect(cur, `cursor rule ${id} missing`).toBeDefined();
      expect(win, `windsurf rule ${id} missing`).toBeDefined();
      expect(bodyBullets(cur!), `bodies differ for ${id}`).toEqual(bodyBullets(win!));
    }
  });

  it('every project-scope bullet appears verbatim in the root AGENTS.md', () => {
    const root = write(plan, 'AGENTS.md')!;
    for (const rule of selectProjectRules()) {
      for (const bullet of rule.ruleSummary) {
        expect(root, `root AGENTS.md missing: ${bullet}`).toContain(bullet);
      }
    }
  });

  it('every applicable folder bullet appears verbatim in its Cursor glob rule', () => {
    const cfg = cloneInitConfig(multiServiceConfig);
    let checked = 0;
    for (const svc of cfg.services) {
      const platforms = [
        ...(svc.web?.enabled ? ['web' as const] : []),
        ...(svc.mobile?.enabled ? ['mobile' as const] : []),
      ];
      for (const rule of selectServiceRules({ kind: svc.kind, platforms, orm: cfg.orm })) {
        if (rule.scope !== 'folder') continue;
        const cur = write(plan, `.cursor/rules/${rule.id}.mdc`);
        expect(cur, `missing cursor rule ${rule.id}`).toBeDefined();
        for (const bullet of rule.ruleSummary) {
          expect(cur!, `.cursor/rules/${rule.id}.mdc missing: ${bullet}`).toContain(bullet);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

// ===========================================================================
// writeAIContextPlan — disk effects
// ===========================================================================
describe('writeAIContextPlan', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aictx-write-'));
  });
  afterEach(async () => {
    await fs.remove(dir);
  });

  it('writes artifacts (creating parent dirs) and removes delete targets', async () => {
    // Pre-seed a stale tool file that the plan should delete.
    await fs.outputFile(path.join(dir, '.cursorrules'), 'STALE');
    const cfg = cloneInitConfig(multiServiceConfig);
    cfg.aiTools = ['codex']; // cursor absent → .cursorrules deleted
    await writeAIContextPlan(buildAIContextPlan(dir, cfg));

    expect(await fs.pathExists(path.join(dir, 'AGENTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'auth/backend/AGENTS.md'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.cursorrules'))).toBe(false);
  });

  it('makes the Claude hook script executable', async () => {
    const cfg = cloneInitConfig(multiServiceConfig);
    cfg.aiTools = ['claude'];
    await writeAIContextPlan(buildAIContextPlan(dir, cfg));
    const hook = path.join(dir, '.claude/hooks/check-edited.mjs');
    expect(await fs.pathExists(hook)).toBe(true);
    const mode = (await fs.stat(hook)).mode & 0o111;
    expect(mode).not.toBe(0); // at least one execute bit set
  });
});

// ===========================================================================
// Claude skills (.claude/skills/**) — M4
// ===========================================================================
describe('Claude skills', () => {
  it('emits backend + add-domain-entity always, web/mobile gated, when claude is selected', () => {
    const plan = planFor({ aiTools: ['claude'] }); // fixture: web (manage) + mobile (scout)
    expect(hasWrite(plan, '.claude/skills/stackr-backend/SKILL.md')).toBe(true);
    expect(hasWrite(plan, '.claude/skills/add-domain-entity/SKILL.md')).toBe(true);
    expect(hasWrite(plan, '.claude/skills/stackr-web/SKILL.md')).toBe(true);
    expect(hasWrite(plan, '.claude/skills/stackr-mobile/SKILL.md')).toBe(true);
  });

  it('deletes the skills + hooks dirs (not just files) when claude is not selected', () => {
    const plan = planFor({ aiTools: ['codex'] });
    expect(hasWrite(plan, '.claude/skills/stackr-backend/SKILL.md')).toBe(false);
    expect(hasDelete(plan, '.claude/skills')).toBe(true);
    // dir-level delete (mirrors .cursor/rules) — no orphan empty `.claude/hooks`
    expect(hasDelete(plan, '.claude/hooks')).toBe(true);
    expect(hasDelete(plan, '.claude/hooks/check-edited.mjs')).toBe(false);
    expect(hasDelete(plan, '.claude/settings.json')).toBe(true);
  });

  it('gates web/mobile skills and emits a delete when that platform is absent', () => {
    const cfg = cloneInitConfig(multiServiceConfig);
    cfg.aiTools = ['claude'];
    cfg.services = cfg.services.map((s) => ({ ...s, web: null, mobile: null }));
    const plan = buildAIContextPlan(ROOT, cfg);
    expect(hasWrite(plan, '.claude/skills/stackr-backend/SKILL.md')).toBe(true);
    expect(hasWrite(plan, '.claude/skills/stackr-web/SKILL.md')).toBe(false);
    expect(hasDelete(plan, '.claude/skills/stackr-web')).toBe(true);
    expect(hasDelete(plan, '.claude/skills/stackr-mobile')).toBe(true);
  });

  it('backend skill is paths:-globbed and carries the canonical bullets', () => {
    const skill = write(planFor({ aiTools: ['claude'] }), '.claude/skills/stackr-backend/SKILL.md')!;
    expect(skill.startsWith('---\n')).toBe(true);
    expect(skill).toContain('name: stackr-backend');
    expect(skill).toMatch(/paths:\n\s+- "\*\*\/backend\/\*\*\/\*\.ts"/);
    expect(skill).toMatch(/ErrorFactory\.databaseError/);
    // No inline `!`shell`` exec — a paths: skill loads on every matching edit.
    expect(skill).not.toMatch(/^!`/m);
  });

  it('add-domain-entity skill has named arguments, no paths:, and wraps the codegen without auto-exec', () => {
    const skill = write(
      planFor({ aiTools: ['claude'] }),
      '.claude/skills/add-domain-entity/SKILL.md'
    )!;
    expect(skill).toContain('arguments: [service, entity]');
    expect(skill).not.toMatch(/^paths:/m); // must NOT auto-fire on file edits
    expect(skill).toContain('stackr add entity');
    expect(skill).not.toMatch(/!`/); // documented as a ```bash block, never inline-exec
  });
});
