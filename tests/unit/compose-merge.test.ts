import { describe, it, expect } from 'vitest';
import {
  readMarkedBlock,
  writeMarkedBlock,
  initComposeWithMarkedBlocks,
  MarkerNotFoundError,
} from '../../src/utils/compose-merge.js';

describe('compose-merge', () => {
  describe('initComposeWithMarkedBlocks', () => {
    it('produces a file with both services and volumes marker blocks', () => {
      const out = initComposeWithMarkedBlocks('  auth_db: {}\n', '  auth_pg:\n    driver: local\n');

      expect(out).toContain('services:');
      expect(out).toContain('# >>> stackr managed services >>>');
      expect(out).toContain('# <<< stackr managed services <<<');
      expect(out).toContain('volumes:');
      expect(out).toContain('# >>> stackr managed volumes >>>');
      expect(out).toContain('# <<< stackr managed volumes <<<');
      expect(out).toContain('auth_db: {}');
      expect(out).toContain('auth_pg:');
    });

    it('is byte-deterministic for identical input', () => {
      const a = initComposeWithMarkedBlocks('  x: {}\n', '  v:\n');
      const b = initComposeWithMarkedBlocks('  x: {}\n', '  v:\n');
      expect(a).toBe(b);
    });

    it('prepends a header when supplied', () => {
      const out = initComposeWithMarkedBlocks('', '', { header: '# custom header\n' });
      expect(out.startsWith('# custom header\n')).toBe(true);
    });
  });

  describe('readMarkedBlock', () => {
    it('finds the start and end indices of a named block', () => {
      const file = [
        'services:',
        '  # >>> stackr managed services >>>',
        '  auth_db: {}',
        '  core_db: {}',
        '  # <<< stackr managed services <<<',
      ].join('\n');

      const block = readMarkedBlock(file, 'services');
      expect(block).not.toBeNull();
      expect(block!.start).toBe(1);
      expect(block!.end).toBe(4);
      expect(block!.inner).toContain('auth_db: {}');
      expect(block!.inner).toContain('core_db: {}');
    });

    it('returns null when the marker is missing', () => {
      const file = 'services:\n  auth_db: {}\n';
      expect(readMarkedBlock(file, 'services')).toBeNull();
    });

    it('handles CRLF line endings', () => {
      const file = [
        'services:',
        '  # >>> stackr managed services >>>',
        '  auth_db: {}',
        '  # <<< stackr managed services <<<',
      ].join('\r\n');

      const block = readMarkedBlock(file, 'services');
      expect(block).not.toBeNull();
      expect(block!.lineSeparator).toBe('\r\n');
    });
  });

  describe('writeMarkedBlock', () => {
    it('replaces the inner content without touching surrounding lines', () => {
      const original = [
        '# some header',
        'services:',
        '  # >>> stackr managed services >>>',
        '  old_db: {}',
        '  # <<< stackr managed services <<<',
        '',
        '  user_added: {}',
        '',
        'volumes: {}',
      ].join('\n');

      const updated = writeMarkedBlock(
        original,
        'services',
        '  new_db: {}\n  another: {}'
      );

      // Header preserved
      expect(updated).toContain('# some header');
      // Old managed content gone
      expect(updated).not.toContain('old_db: {}');
      // New managed content present
      expect(updated).toContain('new_db: {}');
      expect(updated).toContain('another: {}');
      // User-added content outside the marker block survives
      expect(updated).toContain('user_added: {}');
      // Top-level keys remain
      expect(updated).toContain('volumes: {}');
    });

    it('throws MarkerNotFoundError when the marker is missing', () => {
      const bad = 'services:\n  x: {}\n';
      expect(() => writeMarkedBlock(bad, 'services', '  y: {}')).toThrow(MarkerNotFoundError);
    });

    it('is idempotent when given back the same content', () => {
      const original = [
        'services:',
        '  # >>> stackr managed services >>>',
        '  a: {}',
        '  # <<< stackr managed services <<<',
      ].join('\n');

      const once = writeMarkedBlock(original, 'services', '  a: {}');
      const twice = writeMarkedBlock(once, 'services', '  a: {}');
      expect(twice).toBe(once);
    });
  });
});
