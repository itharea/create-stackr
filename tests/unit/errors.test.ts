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
