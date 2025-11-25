/**
 * Centralized dependency version registry
 * This is the single source of truth for all package versions
 */

export const DEPENDENCY_VERSIONS = {
  mobile: {
    core: {
      '@expo/vector-icons': '^14.1.0',
      expo: '~53.0.0',
      'expo-application': '^6.1.5',
      'expo-constants': '~17.1.6',
      'expo-font': '~13.3.1',
      'expo-linear-gradient': '~14.1.5',
      'expo-linking': '~7.1.7',
      'expo-router': '~5.1.4',
      'expo-splash-screen': '~0.30.8',
      'expo-status-bar': '~2.2.3',
      'expo-symbols': '~0.4.5',
      react: '19.0.0',
      'react-native': '0.79.5',
      'react-native-safe-area-context': '5.4.0',
      'react-native-screens': '~4.11.1',
      zustand: '^5.0.5',
    },
    authentication: {
      '@react-native-async-storage/async-storage': '2.1.2',
      axios: '^1.9.0',
      'expo-secure-store': '^14.2.3',
    },
    revenueCat: {
      'react-native-purchases': '^9.1.0',
    },
    adjust: {
      'react-native-adjust': '^5.4.1',
    },
    scate: {
      'scatesdk-react': '^0.4.12',
    },
    att: {
      'expo-tracking-transparency': '~5.2.4',
    },
  },

  backend: {
    core: {
      '@fastify/cors': '^11.0.1',
      '@prisma/client': '^6.12.0',
      '@sinclair/typebox': '^0.34.33',
      ajv: '^8.17.1',
      bcrypt: '^6.0.0',
      dotenv: '^16.5.0',
      fastify: '^5.3.3',
      'fastify-plugin': '^5.0.1',
      ioredis: '^5.4.1',
      jsonwebtoken: '^9.0.2',
      'pino-pretty': '^13.0.0',
    },
    eventQueue: {
      bullmq: '^5.40.3',
    },
  },

  devDependencies: {
    mobile: {
      '@babel/core': '^7.25.2',
      '@types/react': '~19.0.10',
      eslint: '^9.25.0',
      'eslint-config-expo': '~9.2.0',
      typescript: '~5.8.3',
    },
    backend: {
      '@types/bcrypt': '^6.0.0',
      '@types/jsonwebtoken': '^9.0.7',
      '@types/node': '^24.0.0',
      prisma: '^6.12.0',
      tsx: '^4.20.1',
      typescript: '^5.8.3',
    },
  },
};

export const LAST_SYNC_DATE = '2025-11-16';
export const SOURCE_PROJECT_VERSION = '1.0.0';
