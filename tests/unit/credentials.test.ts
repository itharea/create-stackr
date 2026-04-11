import { describe, it, expect } from 'vitest';
import {
  generatePassword,
  generateHexSecret,
  generateServiceCredentials,
} from '../../src/utils/credentials.js';

describe('credentials', () => {
  describe('generatePassword', () => {
    it('returns exactly `length` characters by default (24)', () => {
      expect(generatePassword()).toHaveLength(24);
    });

    it('honors a custom length', () => {
      expect(generatePassword(16)).toHaveLength(16);
      expect(generatePassword(32)).toHaveLength(32);
      expect(generatePassword(64)).toHaveLength(64);
    });

    it('contains only URL-safe alphanumeric characters', () => {
      // No +, /, =, or other symbols that would need URL-encoding inside
      // a postgresql://user:password@host connection string.
      for (let i = 0; i < 50; i++) {
        expect(generatePassword(32)).toMatch(/^[A-Za-z0-9]{32}$/);
      }
    });

    it('produces different values on subsequent calls', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 100; i++) {
        seen.add(generatePassword(24));
      }
      // With 24-char alnum passwords (~143 bits of entropy), 100 samples
      // should never collide in practice.
      expect(seen.size).toBe(100);
    });

    it('throws when length is not a positive integer', () => {
      expect(() => generatePassword(0)).toThrow(/positive integer/);
      expect(() => generatePassword(-1)).toThrow(/positive integer/);
      expect(() => generatePassword(1.5)).toThrow(/positive integer/);
    });
  });

  describe('generateHexSecret', () => {
    it('returns 2 * bytes hex characters by default (64 chars from 32 bytes)', () => {
      expect(generateHexSecret()).toHaveLength(64);
    });

    it('honors a custom byte count', () => {
      expect(generateHexSecret(16)).toHaveLength(32);
      expect(generateHexSecret(64)).toHaveLength(128);
    });

    it('contains only lowercase hex characters', () => {
      for (let i = 0; i < 50; i++) {
        expect(generateHexSecret()).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('produces different values on subsequent calls', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 100; i++) {
        seen.add(generateHexSecret());
      }
      expect(seen.size).toBe(100);
    });

    it('throws when bytes is not a positive integer', () => {
      expect(() => generateHexSecret(0)).toThrow(/positive integer/);
      expect(() => generateHexSecret(-1)).toThrow(/positive integer/);
    });
  });

  describe('generateServiceCredentials', () => {
    it('returns dbPassword, redisPassword, and authSecret', () => {
      const creds = generateServiceCredentials();
      expect(creds.dbPassword).toMatch(/^[A-Za-z0-9]{24}$/);
      expect(creds.redisPassword).toMatch(/^[A-Za-z0-9]{24}$/);
      expect(creds.authSecret).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces distinct dbPassword and redisPassword within the same call', () => {
      const creds = generateServiceCredentials();
      expect(creds.dbPassword).not.toBe(creds.redisPassword);
    });

    it('produces different bundles on subsequent calls', () => {
      const a = generateServiceCredentials();
      const b = generateServiceCredentials();
      expect(a.dbPassword).not.toBe(b.dbPassword);
      expect(a.redisPassword).not.toBe(b.redisPassword);
      expect(a.authSecret).not.toBe(b.authSecret);
    });
  });
});
