import { describe, it, expect } from 'vitest';
import path from 'path';
import { buildAIContextPlan, type AIContextArtifact } from '../../src/generators/ai-context.js';
import { CONTEXT_RULES } from '../../src/config/context-map.js';
import type { InitConfig } from '../../src/types/index.js';
import { multiServiceConfig } from '../fixtures/configs/multi-service.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

/**
 * WS3 push glob rules — Cursor `.cursor/rules/*.mdc` + Windsurf
 * `.windsurf/rules/*.md`. These tests lock the SYNTAX footguns the plan flags:
 * Cursor `globs` must be a bare comma-separated string (never a YAML array,
 * never quoted), the file must start exactly with `---\n`, Windsurf bodies must
 * stay under the 12k-char cap, and neither may leak EJS markers.
 *
 * Runtime rule-loading is untestable in CI (it lives in the IDE) — that is the
 * job of the manual `smoke-test/` protocol. Here we verify the emitted bytes.
 */

const ROOT = '/proj';

function planFor(overrides: Partial<InitConfig> = {}): AIContextArtifact[] {
  const cfg = cloneInitConfig(multiServiceConfig);
  Object.assign(cfg, overrides, { aiTools: overrides.aiTools ?? ['cursor', 'windsurf'] });
  return buildAIContextPlan(ROOT, cfg);
}

function write(plan: AIContextArtifact[], rel: string): string | undefined {
  return plan.find((e) => e.destPath === path.join(ROOT, rel) && e.action === 'write')?.contents;
}

const FOLDER_RULES = CONTEXT_RULES.filter((r) => r.scope === 'folder');

describe('Cursor `.cursor/rules/*.mdc` syntax', () => {
  const plan = planFor();

  it('emits one .mdc per folder rule that applies to the project', () => {
    // multiServiceConfig has backend everywhere, web (manage), mobile (scout).
    expect(write(plan, '.cursor/rules/backend-domain.mdc')).toBeDefined();
    expect(write(plan, '.cursor/rules/web-store.mdc')).toBeDefined();
    expect(write(plan, '.cursor/rules/mobile-components.mdc')).toBeDefined();
  });

  it('starts EXACTLY with `---\\n` (no leading whitespace) so frontmatter is honored', () => {
    for (const rule of FOLDER_RULES) {
      const body = write(plan, `.cursor/rules/${rule.id}.mdc`);
      if (!body) continue;
      expect(body.startsWith('---\n'), `${rule.id}.mdc must start with ---\\n`).toBe(true);
    }
  });

  it('renders `globs` as a BARE comma-separated string — never a YAML array or quoted', () => {
    for (const rule of FOLDER_RULES) {
      const body = write(plan, `.cursor/rules/${rule.id}.mdc`);
      if (!body) continue;
      const line = body.split('\n').find((l) => l.startsWith('globs:'))!;
      expect(line, `${rule.id} has a globs line`).toBeDefined();
      // bare = the comma-joined triggerGlobs verbatim, no [ ] and no quotes
      expect(line).toBe(`globs: ${rule.triggerGlobs.join(', ')}`);
      expect(line).not.toMatch(/\[/);
      expect(line).not.toMatch(/["']/);
    }
  });

  it('joins multi-glob rules with a comma (web-app has two trigger globs)', () => {
    const body = write(plan, '.cursor/rules/web-app.mdc')!;
    expect(body).toContain('globs: **/web/src/app/**/*.tsx, **/web/src/components/**/*.tsx');
  });

  it('uses Auto-Attach (`alwaysApply: false`), not the demoted always-on flag', () => {
    const body = write(plan, '.cursor/rules/backend-domain.mdc')!;
    expect(body).toContain('alwaysApply: false');
    expect(body).not.toContain('alwaysApply: true');
  });
});

describe('Windsurf `.windsurf/rules/*.md` syntax', () => {
  const plan = planFor();

  it('emits `trigger: glob` + `globs:` frontmatter', () => {
    const body = write(plan, '.windsurf/rules/backend-domain.md')!;
    expect(body.startsWith('---\n')).toBe(true);
    expect(body).toContain('trigger: glob');
    expect(body).toContain('globs: **/backend/domain/**/*.ts');
  });

  it('keeps every body well under the 12,000-char/file cap', () => {
    for (const rule of FOLDER_RULES) {
      const body = write(plan, `.windsurf/rules/${rule.id}.md`);
      if (!body) continue;
      expect(body.length, `${rule.id}.md under cap`).toBeLessThan(12000);
    }
  });
});

describe('glob rules — no EJS markers, correct gating', () => {
  it('leaves no raw EJS markers in any glob-rule file', () => {
    for (const e of planFor()) {
      if (e.action !== 'write' || !e.contents) continue;
      if (!/\.(mdc|md)$/.test(e.destPath) || !/\/(cursor|windsurf)\//.test(e.destPath)) continue;
      expect(e.contents, e.destPath).not.toMatch(/<%[=_-]?/);
      expect(e.contents, e.destPath).not.toMatch(/%>/);
    }
  });

  it('emits only the selected tool’s rule dir', () => {
    const cursorOnly = planFor({ aiTools: ['cursor'] });
    expect(write(cursorOnly, '.cursor/rules/backend-domain.mdc')).toBeDefined();
    expect(write(cursorOnly, '.windsurf/rules/backend-domain.md')).toBeUndefined();
  });

  it('drops mobile glob rules when no service ships mobile', () => {
    const cfg = cloneInitConfig(multiServiceConfig);
    cfg.services = cfg.services.map((s) => ({ ...s, mobile: null }));
    cfg.aiTools = ['cursor'];
    const plan = buildAIContextPlan(ROOT, cfg);
    expect(write(plan, '.cursor/rules/mobile-components.mdc')).toBeUndefined();
    // ...and emits a delete for the now-inapplicable rule.
    expect(
      plan.some(
        (e) =>
          e.destPath === path.join(ROOT, '.cursor/rules/mobile-components.mdc') &&
          e.action === 'delete'
      )
    ).toBe(true);
  });
});
