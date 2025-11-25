import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateNodeVersion, validatePackageManager } from '../../src/utils/system-validation.js';
import { ProjectGenerationError } from '../../src/utils/errors.js';

// Mock execa at the top level
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('validateNodeVersion', () => {
  it('should pass for Node.js 18+', () => {
    // Current test is running on a version >= 18, so this should pass
    expect(() => validateNodeVersion()).not.toThrow();
  });

  it('should detect version correctly', () => {
    // This test verifies the function works with the current Node version
    const originalVersion = process.version;
    expect(originalVersion).toMatch(/^v?\d+\.\d+\.\d+/);

    // Should not throw for current version
    expect(() => validateNodeVersion()).not.toThrow();
  });
});

describe('validatePackageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pass when package manager is available', async () => {
    const { execa } = await import('execa');
    (execa as any).mockResolvedValue({ stdout: '9.0.0', stderr: '', exitCode: 0 });

    await expect(validatePackageManager('npm')).resolves.not.toThrow();
  });

  it('should throw when package manager is not found', async () => {
    const { execa } = await import('execa');
    const error = new Error('Command not found');
    (error as any).exitCode = 127;
    (execa as any).mockRejectedValue(error);

    await expect(validatePackageManager('pnpm' as any)).rejects.toThrow(ProjectGenerationError);
  });
});
