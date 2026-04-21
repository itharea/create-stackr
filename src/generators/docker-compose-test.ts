import type { StackrConfigFile, ServiceEntry } from '../types/config-file.js';
import { computeTestPorts } from '../utils/port-allocator.js';

/**
 * Programmatic `docker-compose.test.yml` renderer. See
 * `plans/testing_infra/phase2_docker_compose_test.md` for the full spec.
 *
 * The generated file declares two Docker Compose profiles:
 *
 *   • `component` — per-service Postgres + Redis, speed-tuned (fsync=off,
 *     tmpfs, non-persistent redis). No app containers. Consumed by phase 3's
 *     component tests, which run the service in-process via
 *     Fastify's `app.inject()`.
 *
 *   • `e2e`       — the above + per-service app containers + one-shot
 *     migration-init containers. Consumed by phase 5's cross-service E2E
 *     tests via real HTTP to `http://127.0.0.1:<appPort>`.
 *
 * Host ports are offset a uniform `+10000` from the dev compose; see
 * `computeTestPorts` in `src/utils/port-allocator.ts`. All containers bind
 * to `127.0.0.1` on a dedicated `stackr_test` bridge network so the file
 * can coexist with `docker-compose.yml` and `docker-compose.prod.yml` at
 * runtime (different container names, different host ports).
 *
 * This file is regenerated WHOLESALE by `stackr add service` — it uses no
 * marker blocks and any hand-edits are overwritten. Deliberate: phase 3+
 * harness code hard-codes container names / host ports, so drift would
 * break the harness silently. Users who need local tweaks should layer a
 * `docker-compose.test.override.yml`.
 */
export function renderDockerComposeTest(config: StackrConfigFile): string {
  const testsEnabled = config.services.filter((s) => s.backend.tests);
  if (testsEnabled.length === 0) {
    // Callers must guard on "any service has tests", but if they don't,
    // return empty so they can decide whether to write a file.
    return '';
  }

  const testPorts = computeTestPorts(config.services);
  const authService = config.services.find((s) => s.kind === 'auth') ?? null;

  const serviceBlocks: string[] = [];
  for (const svc of testsEnabled) {
    const ports = testPorts[svc.name];
    if (!ports) {
      throw new Error(
        `renderDockerComposeTest: no computed test-infra ports for service "${svc.name}"`
      );
    }

    serviceBlocks.push(renderDbTest(svc, ports.dbPort));
    serviceBlocks.push(renderRedisTest(svc, ports.redisPort));
    serviceBlocks.push(renderDbMigrate(svc, config));
    serviceBlocks.push(renderRestApi(svc, ports.appPort, authService, config.orm));
  }

  return (
    FILE_HEADER +
    '\n' +
    'services:\n' +
    serviceBlocks.join('\n') +
    '\n' +
    'networks:\n' +
    '  stackr_test:\n' +
    '    driver: bridge\n'
  );
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function renderDbTest(svc: ServiceEntry, dbPort: number): string {
  const upper = envPrefix(svc.name);
  return indent(
    `${svc.name}_db_test:\n` +
      `  image: postgres:16\n` +
      `  profiles: [component, e2e]\n` +
      `  command: postgres -c fsync=off -c synchronous_commit=off -c full_page_writes=off -c random_page_cost=1.0 -c max_connections=200\n` +
      `  environment:\n` +
      `    POSTGRES_USER: \${${upper}_DB_USER}\n` +
      `    POSTGRES_PASSWORD: \${${upper}_DB_PASSWORD}\n` +
      `    POSTGRES_DB: \${${upper}_DB_NAME}\n` +
      `  ports:\n` +
      `    - "127.0.0.1:${dbPort}:5432"\n` +
      `  tmpfs:\n` +
      `    - /var/lib/postgresql/data\n` +
      `  healthcheck:\n` +
      `    test: ["CMD-SHELL", "pg_isready -U \${${upper}_DB_USER} -d \${${upper}_DB_NAME}"]\n` +
      `    interval: 2s\n` +
      `    timeout: 2s\n` +
      `    retries: 20\n` +
      `  networks: [stackr_test]\n`
  );
}

function renderRedisTest(svc: ServiceEntry, redisPort: number): string {
  const upper = envPrefix(svc.name);
  return indent(
    `${svc.name}_redis_test:\n` +
      `  image: redis:7\n` +
      `  profiles: [component, e2e]\n` +
      `  command: redis-server --save "" --appendonly no --requirepass \${${upper}_REDIS_PASSWORD}\n` +
      `  ports:\n` +
      `    - "127.0.0.1:${redisPort}:6379"\n` +
      `  healthcheck:\n` +
      `    test: ["CMD", "redis-cli", "-a", "\${${upper}_REDIS_PASSWORD}", "ping"]\n` +
      `    interval: 2s\n` +
      `    timeout: 2s\n` +
      `    retries: 20\n` +
      `  networks: [stackr_test]\n`
  );
}

function renderDbMigrate(svc: ServiceEntry, config: StackrConfigFile): string {
  const upper = envPrefix(svc.name);
  // The migration container targets the `base` stage rather than
  // `rest-api-prod`. rest-api-prod runs `npm prune --production` which
  // strips the prisma/drizzle-kit CLIs (both devDeps); migrations need
  // them. The `base` stage keeps full deps and already has the schema
  // copied in for the ORM client generation step.
  const pm = config.packageManager;
  const runner = pm === 'bun' ? 'bun x' : pm === 'npm' ? 'npx' : 'yarn';
  // `prisma db push` in v7 no longer accepts `--skip-generate` (the flag was
  // removed). The migration container's sole job is to run the schema push;
  // `prisma generate` already ran during the image build (postinstall), so
  // there's nothing to skip here.
  const migrateCmd =
    config.orm === 'drizzle'
      ? `${runner} drizzle-kit push --force`
      : `${runner} prisma db push --accept-data-loss`;

  return indent(
    `${svc.name}_db_migrate:\n` +
      `  profiles: [e2e]\n` +
      `  build:\n` +
      `    context: ./${svc.name}/backend\n` +
      `    target: base\n` +
      `  command: sh -c "${migrateCmd}"\n` +
      `  environment:\n` +
      `    DATABASE_URL: postgresql://\${${upper}_DB_USER:-postgres}:\${${upper}_DB_PASSWORD}@${svc.name}_db_test:5432/\${${upper}_DB_NAME}\n` +
      `  depends_on:\n` +
      `    ${svc.name}_db_test:\n` +
      `      condition: service_healthy\n` +
      `  networks: [stackr_test]\n`
  );
}

function renderRestApi(
  svc: ServiceEntry,
  appPort: number,
  authService: ServiceEntry | null,
  _orm: 'prisma' | 'drizzle'
): string {
  const upper = envPrefix(svc.name);
  const devPort = svc.backend.port;
  const envLines: string[] = [
    `    NODE_ENV: test`,
    `    LOG_LEVEL: error`,
    `    API_HOST: 0.0.0.0`,
    `    API_PORT: ${devPort}`,
    `    DATABASE_URL: postgresql://\${${upper}_DB_USER:-postgres}:\${${upper}_DB_PASSWORD}@${svc.name}_db_test:5432/\${${upper}_DB_NAME}`,
    `    REDIS_HOST: ${svc.name}_redis_test`,
    `    REDIS_PORT: 6379`,
    `    REDIS_PASSWORD: \${${upper}_REDIS_PASSWORD}`,
  ];

  // Base services with an auth peer in the monorepo forward cookies to the
  // auth container via its compose-network DNS name.
  if (authService && svc.kind !== 'auth') {
    envLines.push(
      `    AUTH_SERVICE_URL: http://${authService.name}_rest_api:${authService.backend.port}`
    );
  }

  return indent(
    `${svc.name}_rest_api:\n` +
      `  profiles: [e2e]\n` +
      `  build:\n` +
      `    context: ./${svc.name}/backend\n` +
      `    target: rest-api-prod\n` +
      `  env_file:\n` +
      `    - ./${svc.name}/backend/.env\n` +
      `  environment:\n` +
      envLines.join('\n') +
      '\n' +
      `  ports:\n` +
      `    - "127.0.0.1:${appPort}:${devPort}"\n` +
      `  depends_on:\n` +
      `    ${svc.name}_db_test:\n` +
      `      condition: service_healthy\n` +
      `    ${svc.name}_redis_test:\n` +
      `      condition: service_healthy\n` +
      `    ${svc.name}_db_migrate:\n` +
      `      condition: service_completed_successfully\n` +
      `  networks: [stackr_test]\n`
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envPrefix(serviceName: string): string {
  return serviceName.toUpperCase().replace(/-/g, '_');
}

function indent(block: string): string {
  return block
    .split('\n')
    .map((line) => (line.length > 0 ? '  ' + line : line))
    .join('\n');
}

const FILE_HEADER = `# docker-compose.test.yml
# Generated by stackr. Two profiles:
#   --profile component   →  speed-tuned Postgres + Redis per service (no app containers).
#                            Used by \`bun run test\` (component tests via app.inject()).
#   --profile e2e         →  the above + app containers + migration init containers.
#                            Used by \`bun run test:e2e\` (monorepo-level cross-service tests).
#
# All containers bind to 127.0.0.1 with host ports offset +10000 from the dev compose.
# Credentials come from the root \`.env\` — run \`docker compose -f docker-compose.test.yml\`
# from the project root so Docker Compose picks it up for \${VAR} substitution (or pass
# --env-file explicitly). Different container names + different host ports mean this
# stack and the dev compose can run concurrently.
#
# Regenerated WHOLESALE by \`stackr add service\` — unlike docker-compose.yml /
# docker-compose.prod.yml, this file uses no marker blocks and hand-edits are
# overwritten. Deliberate: the test stack should always reflect the exact shape
# stackr expects, since phase 3+ harness code hard-codes container names and ports.
`;
