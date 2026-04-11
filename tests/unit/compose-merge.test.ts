import { describe, it, expect } from 'vitest';
import {
  readMarkedBlock,
  writeMarkedBlock,
  initComposeWithMarkedBlocks,
  MarkerNotFoundError,
  MarkerCorruptionError,
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

  describe('corruption detection (phase 3 hardening)', () => {
    it('readMarkedBlock throws on missing start marker', () => {
      const file = [
        'services:',
        '  some_db: {}',
        '  # <<< stackr managed services <<<',
      ].join('\n');
      expect(() => readMarkedBlock(file, 'services')).toThrow(MarkerCorruptionError);
      try {
        readMarkedBlock(file, 'services');
      } catch (err) {
        expect((err as MarkerCorruptionError).reason).toBe('missing-start');
      }
    });

    it('readMarkedBlock throws on missing end marker', () => {
      const file = [
        'services:',
        '  # >>> stackr managed services >>>',
        '  some_db: {}',
      ].join('\n');
      expect(() => readMarkedBlock(file, 'services')).toThrow(MarkerCorruptionError);
      try {
        readMarkedBlock(file, 'services');
      } catch (err) {
        expect((err as MarkerCorruptionError).reason).toBe('missing-end');
      }
    });

    it('readMarkedBlock throws on duplicate start markers', () => {
      const file = [
        'services:',
        '  # >>> stackr managed services >>>',
        '  a: {}',
        '  # >>> stackr managed services >>>',
        '  b: {}',
        '  # <<< stackr managed services <<<',
      ].join('\n');
      expect(() => readMarkedBlock(file, 'services')).toThrow(MarkerCorruptionError);
      try {
        readMarkedBlock(file, 'services');
      } catch (err) {
        expect((err as MarkerCorruptionError).reason).toBe('duplicate-start');
      }
    });

    it('readMarkedBlock throws on duplicate end markers', () => {
      const file = [
        'services:',
        '  # >>> stackr managed services >>>',
        '  a: {}',
        '  # <<< stackr managed services <<<',
        '  # <<< stackr managed services <<<',
      ].join('\n');
      expect(() => readMarkedBlock(file, 'services')).toThrow(MarkerCorruptionError);
      try {
        readMarkedBlock(file, 'services');
      } catch (err) {
        expect((err as MarkerCorruptionError).reason).toBe('duplicate-end');
      }
    });

    it('readMarkedBlock throws on end-before-start ordering', () => {
      const file = [
        'services:',
        '  # <<< stackr managed services <<<',
        '  stuff: {}',
        '  # >>> stackr managed services >>>',
      ].join('\n');
      // Both markers are present but in wrong order. Because the single-
      // pass scanner sees the end marker first and no unique-start detection,
      // the "end-before-start" path is the expected failure mode.
      expect(() => readMarkedBlock(file, 'services')).toThrow(MarkerCorruptionError);
    });

    it('returns null when BOTH markers are absent (unmanaged file)', () => {
      const file = 'services:\n  some_db: {}\nvolumes:\n  data:\n';
      expect(readMarkedBlock(file, 'services')).toBeNull();
    });

    it('writeMarkedBlock throws MarkerNotFoundError when both markers absent', () => {
      const file = 'services:\n  some_db: {}\n';
      expect(() => writeMarkedBlock(file, 'services', '  new: {}')).toThrow(MarkerNotFoundError);
    });

    it('writeMarkedBlock throws MarkerCorruptionError on partial markers', () => {
      const file = 'services:\n  # >>> stackr managed services >>>\n  a: {}\n';
      expect(() => writeMarkedBlock(file, 'services', '  new: {}')).toThrow(
        MarkerCorruptionError
      );
    });

    it('round-trips across CRLF line endings without mixing', () => {
      const crlf = [
        '# head',
        'services:',
        '  # >>> stackr managed services >>>',
        '  old: {}',
        '  # <<< stackr managed services <<<',
      ].join('\r\n');
      const updated = writeMarkedBlock(crlf, 'services', '  fresh: {}');
      expect(updated.includes('fresh: {}')).toBe(true);
      expect(updated.includes('old: {}')).toBe(false);
      // Output should still be CRLF-separated; no raw '\n' without preceding '\r'.
      expect(/[^\r]\n/.test(updated)).toBe(false);
    });

    it('round-trips across LF line endings without mixing', () => {
      const lf = [
        '# head',
        'services:',
        '  # >>> stackr managed services >>>',
        '  old: {}',
        '  # <<< stackr managed services <<<',
      ].join('\n');
      const updated = writeMarkedBlock(lf, 'services', '  fresh: {}');
      expect(updated.includes('\r\n')).toBe(false);
    });
  });
});
