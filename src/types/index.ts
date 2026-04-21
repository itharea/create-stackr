// ORM choices available for the backend
export type ORMChoice = 'prisma' | 'drizzle';

// Platform choices (mobile = Expo, web = Next.js)
export type Platform = 'mobile' | 'web';

// AI coding tool choices
export type AITool = 'claude' | 'codex' | 'cursor' | 'windsurf';

// Maps each AI tool to its convention filename
export const AI_TOOL_FILES: Record<AITool, string> = {
  claude: 'CLAUDE.md',
  codex: 'AGENTS.md',
  cursor: '.cursorrules',
  windsurf: '.windsurfrules',
};

/**
 * ---------------------------------------------------------------------------
 * Phase 2 — multi-service init shapes
 * ---------------------------------------------------------------------------
 *
 * `InitConfig` replaces the legacy `ProjectConfig` as the top-level input to
 * the generator. It carries monorepo-wide knobs plus a `services[]` array.
 *
 * Each `ServiceConfig` is the runtime shape for a single service and carries
 * everything the templates need to render (including API keys for
 * integrations). When persisted to `stackr.config.json`, the keys are
 * stripped so the serialized `ServiceEntry` only stores `{ enabled }` toggles.
 *
 * `ServiceRenderContext` is passed to EJS at render time for every file
 * inside a service subtree. It exposes the per-service `service` object plus
 * legacy top-level `features` / `integrations` / `backend` / `platforms`
 * fields so pre-phase-2 EJS templates that read them continue to work
 * unchanged — the shim is computed from `service` in `buildServiceContext`.
 */

export interface AuthProvidersConfig {
  emailPassword: boolean;
  google: boolean;
  apple: boolean;
  github: boolean;
}

export interface AuthAdditionalUserField {
  name: string;
  type: 'string' | 'boolean' | 'number';
  default: unknown;
}

/**
 * Runtime config block describing how the auth service should be built.
 * Only populated on the service whose `kind === 'auth'`.
 */
export interface AuthServiceConfig {
  providers: AuthProvidersConfig;
  emailVerification: boolean;
  passwordReset: boolean;
  twoFactor: boolean;
  adminDashboard: boolean;
  additionalUserFields: AuthAdditionalUserField[];
  /**
   * Names of the other services that this auth service provisions accounts
   * for. `stackr add service` appends to this list; init time derives it
   * from `initConfig.services` minus the auth entry itself.
   */
  provisioningTargets: string[];
}

/**
 * Runtime integration shape for a service. Carries API keys so templates
 * can embed them at render time; the serializer in `buildStackrConfig` strips
 * everything except `enabled` before persisting.
 */
export interface ServiceIntegrationsRuntime {
  revenueCat: { enabled: boolean; iosKey: string; androidKey: string };
  adjust: { enabled: boolean; appToken: string; environment: 'sandbox' | 'production' };
  scate: { enabled: boolean; apiKey: string };
  att: { enabled: boolean };
}

/**
 * Runtime shape for a single service inside `InitConfig.services`. Mirrors
 * `ServiceEntry` in `src/types/config-file.ts` but keeps secrets / runtime-
 * only fields that must never be serialized.
 */
export interface ServiceConfig {
  name: string;
  kind: 'auth' | 'base';

  backend: {
    port: number;
    eventQueue: boolean;
    imageUploads: boolean;
    authMiddleware: 'none' | 'standard' | 'role-gated' | 'flexible';
    tests: boolean;
    roles?: string[];
  };

  web: { enabled: boolean; port: number } | null;
  mobile: { enabled: boolean } | null;

  /** Only populated when `kind === 'auth'`. */
  authConfig?: AuthServiceConfig;

  integrations: ServiceIntegrationsRuntime;

  /**
   * Populated by `buildServiceContext` from `computeTestPorts` + the
   * monorepo's per-service `ServiceCredentials` before the service reaches
   * EJS rendering. Optional at the type level so `InitConfig` can be
   * constructed before port + credential computation, but guaranteed
   * populated on every service inside `ServiceRenderContext`.
   *
   * The credential fields (`dbUser`, `dbPassword`, `dbName`,
   * `redisPassword`) mirror the values the monorepo generator writes into
   * the root `.env` — they are baked into the per-service `.env.test`
   * at generation time because `dotenv` does not expand `${VAR}`.
   */
  testInfra?: {
    dbPort: number;
    redisPort: number;
    appPort: number;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    redisPassword: string;
  };
}

/**
 * Top-level runtime config assembled by the prompt layer (or by presets /
 * `--defaults`) and passed to the `MonorepoGenerator`.
 */
export interface InitConfig {
  projectName: string;
  packageManager: 'npm' | 'yarn' | 'bun';
  orm: ORMChoice;
  appScheme: string;
  aiTools: AITool[];
  services: ServiceConfig[];
  preset?: 'minimal' | 'full-featured' | 'analytics-focused' | 'custom';
  customized: boolean;
  /**
   * Runtime-only monorepo-level flag: when `true`, emit
   * `.github/workflows/test.yml` at the project root. Set via the
   * `--ci-workflow` CLI flag on `create-stackr`; for `stackr add service`
   * the flag is re-derived from whether the file already exists on disk
   * (see `add-service.ts`). Not persisted to `stackr.config.json` — the
   * file is the source of truth.
   */
  ciWorkflow?: boolean;
}

/**
 * Render context passed to every EJS template inside a service subtree.
 *
 * The `service` field is the primary per-service accessor for new templates.
 * The legacy top-level fields (`platforms`, `features`, `integrations`,
 * `backend`, `projectName`, `packageManager`, `aiTools`, `appScheme`) are a
 * **backwards-compat shim** so existing phase-1 EJS files that read e.g.
 * `backend.eventQueue` or `features.authentication.twoFactor` continue to
 * render without rewriting every template in this phase.
 *
 * `buildServiceContext` computes the shim by mapping from `service`.
 */
export interface ServiceRenderContext {
  // Monorepo-wide
  projectName: string;
  packageManager: 'npm' | 'yarn' | 'bun';
  orm: ORMChoice;
  appScheme: string;
  aiTools: AITool[];

  // Auth-service awareness (for HTTP-forwarding plugins, etc.)
  hasAuthService: boolean;
  authServiceName: string | null;
  authServicePort: number | null;
  authServiceUrl: string | null;
  /** Populated only on the auth service itself. */
  provisioningTargets: string[];
  /** Web ports of every peer service (for auth's `trustedOrigins`). */
  peerWebPorts: number[];
  /** Other services' names (non-auth) — used by auth templates. */
  peerServiceNames: string[];

  // Primary per-service accessor. `testInfra` is narrowed to NonNullable at
  // this boundary — `buildServiceContext` is the single construction site.
  service: ServiceConfig & { testInfra: NonNullable<ServiceConfig['testInfra']> };

  // --- Backwards-compat shim fields (mirror ProjectConfig) ---
  platforms: Platform[];
  features: LegacyFeaturesShim;
  integrations: ServiceIntegrationsRuntime;
  backend: LegacyBackendShim;
}

/**
 * Legacy feature shape derived from the service's own configuration + the
 * monorepo auth service. Exists only so pre-phase-2 EJS templates that read
 * `features.authentication.twoFactor` etc. continue to render.
 */
export interface LegacyFeaturesShim {
  onboarding: {
    enabled: boolean;
    pages: number;
    skipButton: boolean;
    showPaywall: boolean;
  };
  authentication: {
    enabled: boolean;
    providers: AuthProvidersConfig;
    emailVerification: boolean;
    passwordReset: boolean;
    twoFactor: boolean;
  };
  paywall: boolean;
  sessionManagement: boolean;
}

export interface LegacyBackendShim {
  database: 'postgresql';
  orm: ORMChoice;
  eventQueue: boolean;
  docker: boolean;
  tests: boolean;
}

/**
 * @deprecated Alias for `InitConfig`. Kept for one release so downstream
 * tests / fixtures that import `ProjectConfig` continue to compile. Will be
 * removed in v0.6. New code should use `InitConfig` directly.
 */
export type ProjectConfig = InitConfig;

export interface PresetDefinition {
  name: string;
  description: string;
  icon: string;
  /** Everything except the fields set at invocation time. */
  config: Omit<InitConfig, 'projectName' | 'packageManager' | 'appScheme'>;
}

/**
 * Derives a valid URL scheme from the project name
 * - Converts to lowercase
 * - Removes all non-alphanumeric characters
 * - Ensures it starts with a letter (required by iOS/Android)
 * - Falls back to "app" if result is empty
 */
export function deriveAppScheme(projectName: string): string {
  if (!projectName) {
    return 'app';
  }

  let scheme = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (scheme && !/^[a-z]/.test(scheme)) {
    scheme = 'app' + scheme;
  }

  if (!scheme) {
    scheme = 'app';
  }

  return scheme;
}

export interface CLIOptions {
  template?: string;
  defaults?: boolean;
  verbose?: boolean;
  serviceName?: string;
  auth?: boolean; // Commander's --no-auth flips this to false
  withServices?: string;
  tests?: boolean; // Commander's --no-tests flips this to false
  ciWorkflow?: boolean;
}
