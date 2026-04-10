import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import ejs from 'ejs';
import ts from 'typescript';
import { TEMPLATE_DIR } from '../../src/utils/template.js';
import { buildServiceContext } from '../../src/generators/service-context.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

const TEMPLATE = path.join(
  TEMPLATE_DIR,
  'services/base/backend/controllers/rest-api/plugins/auth.ts.ejs'
);

function renderFlavor(flavor: 'standard' | 'role-gated' | 'flexible' | 'none'): string {
  const cfg = cloneInitConfig(minimalConfig);
  const core = cfg.services.find((s) => s.name === 'core')!;
  core.backend.authMiddleware = flavor;
  if (flavor === 'role-gated') {
    core.backend.roles = ['admin', 'mentor'];
  }

  const ctx = buildServiceContext(cfg, core);
  const content = fs.readFileSync(TEMPLATE, 'utf-8');
  return ejs.render(content, ctx as unknown as Record<string, unknown>);
}

function parseTs(source: string): readonly ts.Diagnostic[] {
  const sf = ts.createSourceFile('auth.ts', source, ts.ScriptTarget.Latest, true);
  // createSourceFile returns a SourceFile with parseDiagnostics attached as
  // a private field; use the public getter via the compiler API.
  const diagnostics = (sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics ?? [];
  return diagnostics;
}

describe('three-flavor auth plugin template', () => {
  it('standard flavor renders syntactically valid TypeScript', () => {
    const out = renderFlavor('standard');
    expect(out).toContain('requireAuth');
    expect(out).toContain('AUTH_SERVICE_URL');
    expect(out).not.toContain('validateDeviceSession'); // flexible only
    expect(out).not.toContain('ALLOWED_ROLES'); // role-gated only

    const diags = parseTs(out);
    expect(diags.length).toBe(0);
  });

  it('role-gated flavor renders syntactically valid TypeScript and includes roles', () => {
    const out = renderFlavor('role-gated');
    expect(out).toContain('requireAuth');
    expect(out).toContain("'admin'");
    expect(out).toContain("'mentor'");
    expect(out).toContain('permissionDenied');

    const diags = parseTs(out);
    expect(diags.length).toBe(0);
  });

  it('flexible flavor renders syntactically valid TypeScript and includes device sessions', () => {
    const out = renderFlavor('flexible');
    expect(out).toContain('requireAuth');
    expect(out).toContain('requireDeviceSession');
    expect(out).toContain('requireAuthOrDeviceSession');
    expect(out).toContain('validateDeviceSession');
    expect(out).toContain('provisionCore'); // service name is 'core' capitalized

    const diags = parseTs(out);
    expect(diags.length).toBe(0);
  });

  it('none flavor renders a no-op plugin', () => {
    const out = renderFlavor('none');
    expect(out).toContain('no-op');
    expect(out).not.toContain('requireAuth');
    const diags = parseTs(out);
    expect(diags.length).toBe(0);
  });
});
