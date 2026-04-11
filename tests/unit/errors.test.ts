import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ProjectGenerationError,
  displayError,
  displayWarning,
  displaySuccess,
  errors,
} from '../../src/utils/errors.js';

describe('ProjectGenerationError', () => {
  it('should create error with message', () => {
    const error = new ProjectGenerationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ProjectGenerationError');
  });

  it('should include cause, hints, and recovery', () => {
    const cause = new Error('Original error');
    const error = new ProjectGenerationError(
      'Test error',
      cause,
      ['Hint 1', 'Hint 2'],
      ['Step 1', 'Step 2']
    );

    expect(error.cause).toBe(cause);
    expect(error.hints).toEqual(['Hint 1', 'Hint 2']);
    expect(error.recovery).toEqual(['Step 1', 'Step 2']);
  });
});

describe('Error Factories', () => {
  it('should create directoryExists error', () => {
    const error = errors.directoryExists('my-app');
    expect(error.message).toContain('my-app');
    expect(error.hints).toBeDefined();
    expect(error.recovery).toBeDefined();
  });

  it('should create invalidProjectName error', () => {
    const error = errors.invalidProjectName('INVALID', 'Must be lowercase');
    expect(error.message).toContain('INVALID');
    expect(error.hints).toContain('Must be lowercase');
  });

  it('should create configValidationFailed error', () => {
    const error = errors.configValidationFailed(['Error 1', 'Error 2']);
    expect(error.hints).toEqual(['Error 1', 'Error 2']);
  });

  it('should create networkError error', () => {
    const error = errors.networkError('npm install');
    expect(error.message).toContain('npm install');
    expect(error.hints).toBeDefined();
    expect(error.recovery).toBeDefined();
  });

  it('should create packageManagerNotFound error', () => {
    const error = errors.packageManagerNotFound('pnpm');
    expect(error.message).toContain('pnpm');
    expect(error.recovery).toBeDefined();
  });

  it('should create templateNotFound error', () => {
    const error = errors.templateNotFound('some/template.ejs');
    expect(error.message).toContain('some/template.ejs');
    expect(error.hints && error.hints.length).toBeGreaterThan(0);
    expect(error.recovery && error.recovery.length).toBeGreaterThan(0);
  });

  it('should create templateRenderFailed error carrying the cause', () => {
    const cause = new Error('bad ejs');
    const error = errors.templateRenderFailed('path/to/file.ejs', cause);
    expect(error.message).toContain('path/to/file.ejs');
    expect(error.cause).toBe(cause);
    expect(error.hints && error.hints.length).toBeGreaterThan(0);
    expect(error.recovery && error.recovery.length).toBeGreaterThan(0);
  });

  it('should create fileCopyFailed error with src/dest and cause', () => {
    const cause = new Error('EPERM');
    const error = errors.fileCopyFailed('from/here', 'to/there', cause);
    expect(error.message).toContain('from/here');
    expect(error.message).toContain('to/there');
    expect(error.cause).toBe(cause);
    expect(error.hints && error.hints.length).toBeGreaterThan(0);
    expect(error.recovery && error.recovery.length).toBeGreaterThan(0);
  });

  it('should create dependencyInstallFailed error whose recovery steps reference the directory', () => {
    const error = errors.dependencyInstallFailed('pnpm', '/tmp/myapp');
    expect(error.hints?.some((h) => h.includes('pnpm'))).toBe(true);
    expect(error.recovery?.every((r) => r.includes('/tmp/myapp'))).toBe(true);
    expect(error.recovery?.some((r) => r.includes('pnpm install'))).toBe(true);
  });

  it('should create gitInitFailed error with cause and helpful recovery', () => {
    const cause = new Error('no git');
    const error = errors.gitInitFailed(cause);
    expect(error.cause).toBe(cause);
    expect(error.recovery?.some((r) => r.includes('git init'))).toBe(true);
  });

  it('should create nodeVersionTooLow error referencing both versions', () => {
    const error = errors.nodeVersionTooLow('16.0.0', '18.0.0');
    expect(error.message).toContain('16.0.0');
    expect(error.message).toContain('18.0.0');
    expect(error.recovery?.some((r) => r.includes('nvm install 18.0.0'))).toBe(true);
  });

  it('should create diskSpaceError with disk-space hints and recovery', () => {
    const error = errors.diskSpaceError();
    expect(error.message.toLowerCase()).toContain('disk space');
    expect(error.hints && error.hints.length).toBeGreaterThan(0);
    expect(error.recovery && error.recovery.length).toBeGreaterThan(0);
  });
});

describe('Display Functions', () => {
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('displayError', () => {
    it('should display ProjectGenerationError with hints and recovery', () => {
      const error = new ProjectGenerationError(
        'Test error',
        undefined,
        ['Hint 1'],
        ['Recovery 1']
      );

      displayError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Test error');
    });

    it('should display standard Error', () => {
      const error = new Error('Standard error');

      displayError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Standard error');
    });

    it('should display error with cause', () => {
      const cause = new Error('Original error');
      const error = new ProjectGenerationError('Wrapper error', cause);

      displayError(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Wrapper error');
      expect(output).toContain('Original error');
    });
  });

  describe('displayWarning', () => {
    it('should display warning message', () => {
      displayWarning('Warning message', ['Detail 1', 'Detail 2']);

      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Warning message');
    });
  });

  describe('displaySuccess', () => {
    it('should display success message in box', () => {
      displaySuccess('Success!', ['Detail 1', 'Detail 2']);

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.flat().join(' ');
      expect(output).toContain('Success!');
    });
  });
});
