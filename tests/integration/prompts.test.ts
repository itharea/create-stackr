import { describe, it, expect } from 'vitest';
import { promptProjectName } from '../../src/prompts/project.js';

describe('promptProjectName', () => {
  it('should return provided name when given', async () => {
    const result = await promptProjectName('test-app');
    expect(result).toBe('test-app');
  });

  it('should return provided name for valid names', async () => {
    expect(await promptProjectName('my-app')).toBe('my-app');
    expect(await promptProjectName('my-app-123')).toBe('my-app-123');
    expect(await promptProjectName('test')).toBe('test');
  });
});
