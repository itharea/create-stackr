import { describe, it, expect } from 'vitest';
import { DEPENDENCY_VERSIONS, LAST_SYNC_DATE, SOURCE_PROJECT_VERSION } from '../../src/config/dependencies.js';

describe('Dependency Registry', () => {
  describe('DEPENDENCY_VERSIONS structure', () => {
    it('should have mobile dependencies', () => {
      expect(DEPENDENCY_VERSIONS.mobile).toBeDefined();
      expect(DEPENDENCY_VERSIONS.mobile.core).toBeDefined();
      expect(DEPENDENCY_VERSIONS.mobile.authentication).toBeDefined();
      expect(DEPENDENCY_VERSIONS.mobile.revenueCat).toBeDefined();
      expect(DEPENDENCY_VERSIONS.mobile.adjust).toBeDefined();
      expect(DEPENDENCY_VERSIONS.mobile.scate).toBeDefined();
      expect(DEPENDENCY_VERSIONS.mobile.att).toBeDefined();
    });

    it('should have backend dependencies', () => {
      expect(DEPENDENCY_VERSIONS.backend).toBeDefined();
      expect(DEPENDENCY_VERSIONS.backend.core).toBeDefined();
      expect(DEPENDENCY_VERSIONS.backend.eventQueue).toBeDefined();
    });

    it('should have dev dependencies', () => {
      expect(DEPENDENCY_VERSIONS.devDependencies).toBeDefined();
      expect(DEPENDENCY_VERSIONS.devDependencies.mobile).toBeDefined();
      expect(DEPENDENCY_VERSIONS.devDependencies.backend).toBeDefined();
    });
  });

  describe('Mobile core dependencies', () => {
    it('should include essential Expo packages', () => {
      const { core } = DEPENDENCY_VERSIONS.mobile;

      expect(core.expo).toBeDefined();
      expect(core['expo-router']).toBeDefined();
      expect(core.react).toBeDefined();
      expect(core['react-native']).toBeDefined();
      expect(core.zustand).toBeDefined();
    });

    it('should have valid version strings', () => {
      const { core } = DEPENDENCY_VERSIONS.mobile;

      Object.entries(core).forEach(([_pkg, version]) => {
        expect(typeof version).toBe('string');
        expect(version.length).toBeGreaterThan(0);
        // Version should start with ~ or ^ or be a number
        expect(/^[~^]?\d/.test(version)).toBe(true);
      });
    });
  });

  describe('Mobile authentication dependencies', () => {
    it('should include auth-related packages', () => {
      const { authentication } = DEPENDENCY_VERSIONS.mobile;

      expect(authentication.axios).toBeDefined();
      expect(authentication['@react-native-async-storage/async-storage']).toBeDefined();
      expect(authentication['expo-secure-store']).toBeDefined();
    });
  });

  describe('Mobile SDK dependencies', () => {
    it('should include RevenueCat', () => {
      expect(DEPENDENCY_VERSIONS.mobile.revenueCat['react-native-purchases']).toBeDefined();
    });

    it('should include Adjust', () => {
      expect(DEPENDENCY_VERSIONS.mobile.adjust['react-native-adjust']).toBeDefined();
    });

    it('should include Scate', () => {
      expect(DEPENDENCY_VERSIONS.mobile.scate['scatesdk-react']).toBeDefined();
    });

    it('should include ATT', () => {
      expect(DEPENDENCY_VERSIONS.mobile.att['expo-tracking-transparency']).toBeDefined();
    });
  });

  describe('Backend dependencies', () => {
    it('should include core backend packages', () => {
      const { core } = DEPENDENCY_VERSIONS.backend;

      expect(core.fastify).toBeDefined();
      expect(core['@prisma/client']).toBeDefined();
      expect(core.ioredis).toBeDefined();
      expect(core.jsonwebtoken).toBeDefined();
      expect(core.bcrypt).toBeDefined();
      expect(core.dotenv).toBeDefined();
    });

    it('should include BullMQ for event queue', () => {
      expect(DEPENDENCY_VERSIONS.backend.eventQueue.bullmq).toBeDefined();
    });
  });

  describe('Dev dependencies', () => {
    it('should include mobile dev dependencies', () => {
      const { mobile } = DEPENDENCY_VERSIONS.devDependencies;

      expect(mobile.typescript).toBeDefined();
      expect(mobile['@types/react']).toBeDefined();
      expect(mobile['@babel/core']).toBeDefined();
    });

    it('should include backend dev dependencies', () => {
      const { backend } = DEPENDENCY_VERSIONS.devDependencies;

      expect(backend.typescript).toBeDefined();
      expect(backend.prisma).toBeDefined();
      expect(backend.tsx).toBeDefined();
      expect(backend['@types/node']).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should have valid last sync date', () => {
      expect(LAST_SYNC_DATE).toBeDefined();
      expect(typeof LAST_SYNC_DATE).toBe('string');
      // Should be in YYYY-MM-DD format
      expect(/^\d{4}-\d{2}-\d{2}$/.test(LAST_SYNC_DATE)).toBe(true);
    });

    it('should have source project version', () => {
      expect(SOURCE_PROJECT_VERSION).toBeDefined();
      expect(typeof SOURCE_PROJECT_VERSION).toBe('string');
    });
  });

  describe('Version consistency', () => {
    it('should not have undefined versions', () => {
      const checkVersions = (obj: any, path = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value === 'object' && value !== null) {
            checkVersions(value, currentPath);
          } else if (typeof value === 'string') {
            expect(value).not.toBe('undefined');
            expect(value.trim()).not.toBe('');
          }
        });
      };

      checkVersions(DEPENDENCY_VERSIONS);
    });
  });
});
