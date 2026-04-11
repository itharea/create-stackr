import { describe, it, expect } from 'vitest';
import {
  validateProjectName,
  validateServiceName,
  validateConfiguration,
} from '../../src/utils/validation.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

describe('validateProjectName', () => {
  it('accepts valid lowercase project names', () => {
    expect(validateProjectName('my-app').valid).toBe(true);
    expect(validateProjectName('myapp').valid).toBe(true);
  });

  it('rejects empty names', () => {
    expect(validateProjectName('').valid).toBe(false);
  });

  it('rejects names with uppercase letters', () => {
    expect(validateProjectName('MyApp').valid).toBe(false);
  });
});

describe('validateServiceName', () => {
  it('accepts valid service names', () => {
    expect(validateServiceName('core').valid).toBe(true);
    expect(validateServiceName('my-service').valid).toBe(true);
    expect(validateServiceName('svc2').valid).toBe(true);
  });

  it('rejects empty service names', () => {
    expect(validateServiceName('').valid).toBe(false);
  });

  it('rejects uppercase names', () => {
    expect(validateServiceName('Core').valid).toBe(false);
  });

  it('rejects path separators', () => {
    expect(validateServiceName('path/name').valid).toBe(false);
    expect(validateServiceName('path\\name').valid).toBe(false);
  });

  it('rejects names starting with a digit', () => {
    expect(validateServiceName('2services').valid).toBe(false);
  });

  it('reserves "auth" for the auth service', () => {
    expect(validateServiceName('auth').valid).toBe(false);
    expect(validateServiceName('auth', { allowAuth: true }).valid).toBe(true);
  });

  it('rejects reserved OS / monorepo directory names', () => {
    expect(validateServiceName('node_modules').valid).toBe(false);
    expect(validateServiceName('dist').valid).toBe(false);
    expect(validateServiceName('con').valid).toBe(false);
  });
});

describe('validateConfiguration', () => {
  it('accepts the minimal fixture', () => {
    const r = validateConfiguration(minimalConfig);
    expect(r.valid).toBe(true);
  });

  it('rejects a config with duplicate service names', () => {
    const cfg = cloneInitConfig(minimalConfig);
    cfg.services[1].name = 'auth'; // collide with the actual auth entry
    const r = validateConfiguration(cfg);
    expect(r.valid).toBe(false);
  });

  it('rejects a config with duplicate backend ports', () => {
    const cfg = cloneInitConfig(minimalConfig);
    cfg.services[1].backend.port = cfg.services[0].backend.port;
    const r = validateConfiguration(cfg);
    expect(r.valid).toBe(false);
  });

  it('rejects role-gated auth middleware without roles', () => {
    const cfg = cloneInitConfig(minimalConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.backend.authMiddleware = 'role-gated';
    const r = validateConfiguration(cfg);
    expect(r.valid).toBe(false);
  });

  it('rejects non-none authMiddleware when no auth service exists', () => {
    const cfg = cloneInitConfig(minimalConfig);
    cfg.services = cfg.services.filter((s) => s.kind !== 'auth');
    // core still has authMiddleware: 'standard' — must be flagged
    const r = validateConfiguration(cfg);
    expect(r.valid).toBe(false);
  });
});
