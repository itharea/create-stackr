# create-stackr

[![npm version](https://badge.fury.io/js/create-stackr.svg)](https://www.npmjs.com/package/create-stackr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/create-stackr)](https://nodejs.org)

Scaffold a multi-microservice TypeScript monorepo — Fastify backends, isolated databases, optional Next.js and Expo frontends, Docker Compose, and a full Vitest test infrastructure — with one command.

## Quick start

```bash
npx create-stackr my-app --defaults
cd my-app
npm run setup && npm run docker:dev
```

That's it. The project boots on `http://localhost:8080` (auth) and `http://localhost:8081` (core service).

## Requirements

- **Node.js** ≥ 18
- **Docker** — required for `docker:dev` and the test profiles. The CLI itself does not need it.
- **A package manager** — npm, yarn, or bun. You pick at init; all three are first-class.

## What you get

A monorepo with one auth service and one or more base services. Each service has an isolated Fastify backend, its own PostgreSQL and Redis instance, optional Next.js web and Expo mobile frontends, and an optional BullMQ event queue. Cross-service auth is handled by forwarding cookies to the auth service. Everything is orchestrated by Docker Compose with marker-block regeneration so hand-edits survive `stackr add service`.

```
my-app/
├── auth/                  # auth service (backend + admin web dashboard)
├── core/                  # initial base service
│   ├── backend/           # Fastify API
│   ├── web/               # optional Next.js
│   └── mobile/            # optional Expo
├── tests/e2e/             # cross-service E2E
├── docker-compose.yml
├── docker-compose.test.yml
├── stackr.config.json     # source of truth for the monorepo shape
└── package.json
```

## CLI

Two binaries:

- `create-stackr` — scaffold a new project (use via `npx`)
- `stackr` — operate inside an existing project

### `create-stackr <name>`

| Flag | Description |
|---|---|
| `--defaults` | Skip prompts; use the built-in default (Drizzle, auth with admin dashboard, one `core` base service) |
| `--service-name <name>` | Rename the initial base service (default: `core`) |
| `--no-auth` | Skip the auth service |
| `--with-services <list>` | Comma-separated extra base services (e.g. `scout,manage`) |
| `--no-tests` | Skip Vitest scaffolding |
| `--ci-workflow` | Generate `.github/workflows/test.yml` |
| `--verbose` | Detailed output |

```bash
# Minimal project, no prompts
npx create-stackr my-app --defaults

# Pre-scaffold extra services at init
npx create-stackr my-app --defaults --with-services scout,manage

# Backend-only project (no auth)
npx create-stackr my-app --no-auth --service-name api

# Built-in default config with a CI workflow
npx create-stackr my-app --defaults --ci-workflow
```

### `stackr add service <name>`

Adds a new microservice to an existing project. Stages all writes in a tempdir, dry-runs the YAML, then commits atomically — if anything fails the project is left byte-identical.

| Flag | Description |
|---|---|
| `--auth-middleware <type>` | `standard` \| `role-gated` \| `flexible` \| `none` (default: `standard` when auth exists) |
| `--web` | Also scaffold a per-service Next.js frontend |
| `--mobile` | Also scaffold an Expo mobile app |
| `--event-queue` / `--no-event-queue` | Enable / disable BullMQ + Redis |
| `--port <n>` | Explicit REST API port (otherwise auto-allocated above 8080) |
| `--no-install` | Skip the package manager install |
| `--no-tests` | Skip Vitest scaffolding for this service |
| `--force` | Bypass the pending-migration refusal |
| `--verbose` | Detailed output |

```bash
npx stackr add service wallet
npx stackr add service wallet --web --port 8083
```

### `stackr migrations ack <service>`

Clears one `pendingMigration` entry from `stackr.config.json` after you run the DB migration by hand. Required after `stackr add service` modifies the auth schema; subsequent `stackr` subcommands refuse until the entry is cleared.

```bash
npx stackr migrations ack auth
```

## Next steps after scaffolding

1. `cd my-app`
2. `npm run setup` — installs deps in every workspace, generates `.env` files with strong random credentials, and prompts to reset stale Docker volumes if needed.
3. `npm run docker:dev` — boots the whole stack.
4. `npm test` — per-service component tests (Vitest, Docker Compose `component` profile).
5. `npm run test:e2e` — cross-service end-to-end tests (`e2e` profile).

Per-service docs are generated under each service: `<service>/backend/DESIGN.md`, `BEST_PRACTICES.md`, and `tests/DESIGN.md`.

## FAQ

**Can I add services after the initial scaffold?**
Yes — `npx stackr add service <name>` wires it into Docker Compose, the root `.env`, and (if present) the GitHub Actions matrix.

**Is Docker required?**
For local development (`docker:dev`) and the test profiles, yes. The CLI itself runs without Docker, and you can `cd <service>/backend && npm run dev` against a host-mode database if you prefer.

**Which package manager should I use?**
All three (npm, yarn, bun) are supported. Bun is the recommended default; the generator branches every script on your choice.

**Which ORM is the default?**
Drizzle. Prisma is available — pick at init (or pass `--defaults` for Drizzle non-interactively).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md) for the security policy and disclosure process.

## License

[MIT](./LICENSE) © itharea
