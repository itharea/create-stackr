/**
 * stackr.config.json — durable on-disk contract
 *
 * Phase 1 introduces v1 of this schema. It carries the information needed to
 * describe a generated project's shape so future stackr commands
 * (`stackr add service`, `stackr migrate`, etc.) can operate against it.
 *
 * This file is intentionally **pure types + constants** — no runtime imports
 * that would pull in file I/O. That keeps it safe to import from anywhere in
 * the codebase (including browser-side tooling or doc generators) without
 * side effects.
 *
 * See `plans/meta_phases.md` §3 for the full rationale.
 */

/**
 * Current on-disk schema version written by this CLI. Bumped when the shape
 * of `StackrConfigFile` changes in a backwards-incompatible way. Phase 1
 * ships v1 and `migrateConfig` only accepts this version; phase 2 may add
 * version-dispatched migrations.
 */
export const STACKR_CONFIG_VERSION = 1 as const;

/**
 * Canonical file name written to the project root.
 */
export const STACKR_CONFIG_FILENAME = 'stackr.config.json' as const;

/**
 * One entry in `StackrConfigFile.services`.
 *
 * Mirrors `ServiceEntry` in `plans/meta_phases.md` §3. Phase 1 only ever
 * writes a single entry named `'core'` with `kind: 'base'`; phase 2 will
 * extract auth into its own entry.
 */
export interface ServiceEntry {
  /** Directory name under the project root, e.g. `'core'`, `'auth'`, `'wallet'`. */
  name: string;

  /** Which template subtree was used to generate this service. */
  kind: 'auth' | 'base';

  backend: {
    port: number;
    eventQueue: boolean;
    /** Reserved for phase 2 (image uploads feature). Always `false` in phase 1. */
    imageUploads: boolean;
    /**
     * Phase 1 always emits `'none'` because auth is still embedded in
     * `core/backend` rather than being forwarded to a peer `auth` service.
     * Phase 2 adds the other three flavors.
     */
    authMiddleware: 'none' | 'standard' | 'role-gated' | 'flexible';
    /**
     * Whether Vitest scaffolding should be generated for this service.
     * Additive in v1: legacy configs that pre-date this field default to
     * `false` via `migrateConfig` so regenerating an existing project
     * doesn't drop test files onto it unexpectedly.
     */
    tests: boolean;
    /** Only populated when `authMiddleware === 'role-gated'`. */
    roles?: string[];
  };

  web: { enabled: boolean; port: number } | null;
  mobile: { enabled: boolean } | null;

  /** Only populated when `kind === 'auth'` (phase 2+). */
  authConfig?: {
    providers: {
      emailPassword: boolean;
      google: boolean;
      apple: boolean;
      github: boolean;
    };
    emailVerification: boolean;
    passwordReset: boolean;
    twoFactor: boolean;
    adminDashboard: boolean;
    additionalUserFields: Array<{
      name: string;
      type: 'string' | 'boolean' | 'number';
      default: unknown;
    }>;
    provisioningTargets: string[];
  };

  /**
   * Per-integration toggles. Only the `enabled` flag is stored — API keys
   * from the live `ProjectConfig.integrations` shape must never be serialized
   * here because `stackr.config.json` is committed to git.
   */
  integrations?: {
    revenueCat: { enabled: boolean };
    adjust: { enabled: boolean };
    scate: { enabled: boolean };
    att: { enabled: boolean };
  };

  generatedAt: string;
  /** Version of create-stackr that created this entry. */
  generatedBy: string;
}

/**
 * Bookkeeping entry recording that a schema change made by stackr requires
 * the user to run a DB migration before the affected service is safe to
 * start. Phase 1 never emits these — added here for forward compatibility
 * so phase 2/3 can extend the file without bumping the schema version.
 */
export interface PendingMigration {
  service: string;
  reason: string;
  createdAt: string;
  createdBy: string;
  command: string;
}

/**
 * On-disk shape of `stackr.config.json`.
 *
 * Note: `version` is typed as `number` (not the literal `1`) so phase 2 can
 * bump to v2 without forcing a discriminated-union refactor. The runtime
 * constant `STACKR_CONFIG_VERSION` is the pinned current version; the type
 * guard narrows `version` for v1 consumers.
 */
export interface StackrConfigFile {
  version: number;
  stackrVersion: string;
  projectName: string;
  createdAt: string;

  // Monorepo-wide, locked at init
  packageManager: 'npm' | 'yarn' | 'bun';
  orm: 'prisma' | 'drizzle';
  aiTools: string[];
  appScheme: string;

  services: ServiceEntry[];

  pendingMigrations?: PendingMigration[];
}

/**
 * Canonical key order used when serializing `StackrConfigFile`. Drives the
 * `JSON.stringify` replacer in `saveStackrConfig` so ordering is defined in
 * exactly one place — phase 2 extends this tuple rather than hand-ordering
 * every object literal.
 *
 * Keys absent from this tuple fall through to natural order, which is fine
 * for nested objects (`ServiceEntry`, integrations) where the order doesn't
 * carry the same cross-phase contract.
 */
export const STACKR_CONFIG_KEY_ORDER: readonly (keyof StackrConfigFile)[] = [
  'version',
  'stackrVersion',
  'projectName',
  'createdAt',
  'packageManager',
  'orm',
  'aiTools',
  'appScheme',
  'services',
  'pendingMigrations',
] as const;

/**
 * Runtime type guard. Narrows an arbitrary parsed JSON value to
 * `StackrConfigFile` if it has the required top-level fields of the correct
 * shape. Does not verify every nested detail — deep validation belongs in
 * `validateStackrConfig` (phase 2+).
 */
export function isStackrConfigFile(raw: unknown): raw is StackrConfigFile {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.version !== 'number') return false;
  if (typeof r.stackrVersion !== 'string') return false;
  if (typeof r.projectName !== 'string') return false;
  if (typeof r.createdAt !== 'string') return false;
  if (r.packageManager !== 'npm' && r.packageManager !== 'yarn' && r.packageManager !== 'bun') {
    return false;
  }
  if (r.orm !== 'prisma' && r.orm !== 'drizzle') return false;
  if (!Array.isArray(r.aiTools)) return false;
  if (!r.aiTools.every((tool) => typeof tool === 'string')) return false;
  if (typeof r.appScheme !== 'string') return false;
  if (!Array.isArray(r.services)) return false;

  if (r.pendingMigrations !== undefined && !Array.isArray(r.pendingMigrations)) {
    return false;
  }

  return true;
}
