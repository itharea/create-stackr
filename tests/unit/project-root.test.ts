import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { findProjectRoot, requireProjectRoot } from '../../src/utils/project-root.js';
import { STACKR_CONFIG_FILENAME } from '../../src/types/config-file.js';

/**
 * We use a real tempdir rather than memfs here because
 * `fs-extra.pathExists` (used inside `findProjectRoot`) goes through the
 * real `fs` module. memfs is overkill for this — a tempdir tree gives
 * us the exact isolation we need with zero monkey-patching.
 */
describe('project-root walker', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-root-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('findProjectRoot', () => {
    it('returns null when no stackr.config.json exists anywhere up the tree', async () => {
      const deep = path.join(tempDir, 'a', 'b', 'c');
      await fs.ensureDir(deep);

      // The tempdir ancestors shouldn't contain a stackr config either.
      // In the (astronomically unlikely) case they do, this test would fail
      // — but that would mean a broken dev env worth investigating.
      const result = await findProjectRoot(deep);
      expect(result).toBeNull();
    });

    it('finds the config when it sits directly in startDir', async () => {
      await fs.writeFile(
        path.join(tempDir, STACKR_CONFIG_FILENAME),
        JSON.stringify({ version: 1 }),
        'utf-8'
      );

      const result = await findProjectRoot(tempDir);
      expect(result).toBe(path.resolve(tempDir));
    });

    it('walks upward to find the config from a deeply nested start', async () => {
      await fs.writeFile(
        path.join(tempDir, STACKR_CONFIG_FILENAME),
        JSON.stringify({ version: 1 }),
        'utf-8'
      );

      const deep = path.join(tempDir, 'apps', 'core', 'backend', 'src');
      await fs.ensureDir(deep);

      const result = await findProjectRoot(deep);
      expect(result).toBe(path.resolve(tempDir));
    });

    it('prefers the nearest ancestor when multiple configs exist', async () => {
      // Outer config
      await fs.writeFile(
        path.join(tempDir, STACKR_CONFIG_FILENAME),
        JSON.stringify({ version: 1, projectName: 'outer' }),
        'utf-8'
      );

      // Nested project with its own config
      const inner = path.join(tempDir, 'nested', 'inner-project');
      await fs.ensureDir(inner);
      await fs.writeFile(
        path.join(inner, STACKR_CONFIG_FILENAME),
        JSON.stringify({ version: 1, projectName: 'inner' }),
        'utf-8'
      );

      // Starting from inside the inner project, we should pick the inner
      // config — not climb past it to the outer one.
      const deep = path.join(inner, 'core', 'backend');
      await fs.ensureDir(deep);

      const result = await findProjectRoot(deep);
      expect(result).toBe(path.resolve(inner));
    });

    it('returns null and does not loop forever at filesystem root', async () => {
      // `/` doesn't contain a stackr.config.json on any sane dev machine.
      // This is really a liveness check — the function must terminate
      // when dirname(x) === x.
      const result = await findProjectRoot('/');
      expect(result).toBeNull();
    });
  });

  describe('requireProjectRoot', () => {
    it('returns the project root when one exists', async () => {
      await fs.writeFile(
        path.join(tempDir, STACKR_CONFIG_FILENAME),
        JSON.stringify({ version: 1 }),
        'utf-8'
      );

      const result = await requireProjectRoot(tempDir);
      expect(result).toBe(path.resolve(tempDir));
    });

    it('throws a clear error when no project root can be found', async () => {
      const deep = path.join(tempDir, 'no', 'config', 'here');
      await fs.ensureDir(deep);

      await expect(requireProjectRoot(deep)).rejects.toThrow(
        /Not inside a stackr project/
      );
    });
  });
});
