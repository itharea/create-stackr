# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.1] - 2026-04-14

### Fixed

- **Web `.env.local` generation**: `create-stackr` now copies `web/.env.example` to `web/.env.local` at init time with correct service-specific ports (backend URL, app URL, auth service URL). `setup.sh` also creates them as a safety net. Base web `.env.example.ejs` updated to use service context ports instead of hardcoded 3000/8080.
- **Auth admin dashboard**: Added `templates/services/auth/web/` with a complete admin dashboard — login page (admin-only), dashboard with user stats, user list with search/role filtering, user detail with role management and deletion. `ServiceGenerator.pickSubtrees()` and `shouldIncludeFile()` updated to route auth services to the new template tree instead of the generic base web + features/web overlay.

## [0.5.0] - 2026-04-11

### ⚠ BREAKING CHANGES

- **Default project layout is now a multi-microservice monorepo** (`auth/ + core/ + ...`) instead of a single `backend/ + mobile/ + web/` layout. v0.4 projects keep working as-is but are NOT automatically migrated. See the Upgrading from v0.4 section in the README.
- **New second CLI binary: `stackr`** (for `stackr add service <name>` and related post-init commands). The `create-stackr` binary stays dedicated to initial scaffolding.
- **`stackr.config.json` is now written at generation time** and is required by all `stackr` subcommands. It is the durable source of truth describing the monorepo shape (services, ORM choice, package manager, AI tools, pending migrations).
- The `src/index.ts` entrypoint is now a thin re-export. The real CLI lives at `src/entrypoints/create.ts` and `src/entrypoints/stackr.ts`.

### Added

- **Multi-service monorepo scaffolding**: `create-stackr <name>` now generates `auth/` plus one or more base services. Use `--with-services scout,manage` to pre-scaffold extras at init time, `--no-auth` to skip the auth service entirely, or `--service-name <name>` to rename the initial base service.
- **`stackr add service <name>` subcommand**: Scaffolds a new microservice into an existing project, wires it into `docker-compose.yml`, appends its prefixed env vars to the root `.env`, and regenerates `auth/backend/lib/auth.ts` with a new `has<Service>Account` additional field. Follows a strict five-phase (A–E) ordering — all writes stage into a tempdir, a dry-run pass validates YAML and config, then a single atomic commit runs with `stackr.config.json` saved last. If anything fails before the commit, the project is left byte-identical.
- **`stackr migrations ack <service>` subcommand**: Clears a single `pendingMigration` entry from `stackr.config.json` after you run the DB migration by hand. Each ack clears one entry; stacked migrations (from `stackr add service --force`) must be acked one at a time.
- **Three auth middleware flavors**: `standard` (forwards cookies to the auth service), `role-gated` (standard + requires a role), `flexible` (cookie or device session). Selected per service at init time or via `--auth-middleware` on `stackr add service`.
- **Marker-block docker-compose regeneration**: `# >>> stackr managed services >>>` and `# >>> stackr managed volumes >>>` marker blocks wrap the stackr-owned compose entries. `stackr add service` rewrites ONLY the inside of those blocks, preserving any user-added services, comments, volumes, or networks byte-identical. A dedicated release-blocker integration test (`compose-regen-preserves-user-edits.test.ts`) enforces this contract.
- **Pending-migration sentinel**: When `stackr add service` changes auth's schema, a `PendingMigration` entry is appended to `stackr.config.json`. Every subsequent `stackr` subcommand refuses until the entry is cleared via `stackr migrations ack`. `--force` bypasses the refusal but still stacks a new migration. This prevents the "silent next-sign-in fails 30 minutes later" footgun.
- **Shared `Dockerfile` and `auth-plugin` templates**: `templates/services/base/backend/Dockerfile.ejs` and `templates/services/base/backend/controllers/rest-api/plugins/auth.ts.ejs` are the single sources of truth for every base service. The auth plugin template switches on the chosen middleware flavor at render time.
- **Port allocation determinism**: `allocateBackendPort` / `allocateWebPort` pick the next free port above 8080 / 3000 respectively, reserving 8082 and 3002 for auth. Allocating twice against the same config yields the same port — verified by a dedicated unit test.
- **Compose marker-block corruption detection**: `readMarkedBlock` now throws `MarkerCorruptionError` (discriminated by reason: `missing-start`, `missing-end`, `duplicate-start`, `duplicate-end`, `end-before-start`) instead of silently succeeding on malformed marker state. CRLF and LF line endings are detected and preserved.

### Changed

- `ProjectConfig` is now a deprecated alias for `InitConfig`. Deletion tracked for v0.6.
- Presets are now `InitConfig` factories producing a `services[]` array.
- `src/index.ts` pared to a re-export shim for backwards compatibility.
- `bin/cli.js` renamed to `bin/create-stackr.js`; `bin/stackr.js` added alongside it.

### Removed

- Single-project mode. The closest equivalent is `npx create-stackr myapp --defaults --no-auth --service-name core`, which produces a minimal monorepo with a single base service.

### Fixed

- **`auth/web` admin dashboard now scaffolds the full Next.js project shell** (`package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `.env.example`, `.gitignore`, `.prettierrc`, `.prettierignore`, `src/app/layout.tsx`, `src/app/globals.css`, `src/components/ui/*`). Previously the symmetric kind filter in `shouldIncludeFile` was written against `services/base/` and dropped every file under `services/base/web/**` for auth services, leaving `auth/web/` with only the auth feature pages and no project shell — the directory could not be installed or built. The predicates are now narrowed to `services/{auth,base}/backend/` so they gate only the per-kind backend divergence, matching the documented intent of `ServiceGenerator.pickSubtrees`. (#52)
- **Root `.env` and per-service `backend/.env` are now written with real random credentials at init time**. `create-stackr` generates a fresh 24-char alphanumeric Postgres password, Redis password, and a 64-char hex `BETTER_AUTH_SECRET` per service via `node:crypto.randomBytes`, and writes them into the real `.env` files (never into `.env.example`, which remains committed documentation with `change-me-*` placeholders). `stackr add service` reuses the same generator so new services appended to an existing project also get strong credentials for both the root `.env` block and the new service's `backend/.env`. This restores the v0.4 behaviour that was lost when the multi-microservice refactor dropped `setup.sh`'s inline `openssl rand` credential generation. (#54)
- **`setup.sh` now offers a confirmed docker-volume reset after rotating env credentials**. When setup.sh (re)creates one or more `.env` files in a single run, it enumerates the per-service Postgres / Redis volumes owned by the compose project and — if any exist — lists them and prompts for typed `RESET` confirmation before running `docker compose down -v`. This fixes the cryptic `password authentication failed` error users hit when they delete `.env`, re-run `setup.sh`, and then `docker compose up` tries to boot Postgres against a volume that was initialised with different credentials. Matches the v0.4 setup.sh volume-reset flow, adapted to v0.5's multi-service monorepo volume naming. (#55)
- **Generated monorepos now ship a root `package.json` so the `stackr` CLI is runnable inside them**. Before this fix, `npx create-stackr my-app` produced a project with no root `package.json`, which meant the second CLI binary shipped by `create-stackr` (`stackr add service`, `stackr migrations ack`, etc.) was unreachable unless the user happened to have `create-stackr` installed globally. `MonorepoGenerator` now renders `templates/project/package.json.ejs` at the project root with `create-stackr` pinned as a `devDependency` at the current generator version (`^<stackrVersion>`) and a convenience `"stackr": "stackr"` script. `setup.sh` runs `<packageManager> install` at the root (non-fatal on failure, so the pre-release window where `create-stackr@0.5.0` isn't yet on npm doesn't abort the rest of setup) and prints a global-install fallback hint when it can't reach the registry. The README and init next-steps now document `npx stackr add service <name>` as the primary invocation. (#57)

### Deferred (tracked in backlog)

- `stackr add auth` — retroactively add an auth service to a `--no-auth` project
- `stackr migrate` — run DB migrations automatically via docker or host mode (currently users run the printed command by hand and `stackr migrations ack`)
- `stackr doctor`, `stackr add entity`, `stackr add route`

## [0.4.0] - 2026-02-19

### Added

- **AI Coding Tool Selection**: Multi-select prompt for choosing AI coding tools (Claude Code, Codex, Cursor, Windsurf) — generates the correct convention file (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.windsurfrules`) at the project root
- **Architectural Documentation**: Generated projects now include DESIGN.md and BEST_PRACTICES.md files describing architecture, design decisions, and coding conventions for each layer

### Changed

- **Backend Architecture**: Separated repository and service layers in backend templates for cleaner separation of concerns
- **React 19 Patterns**: Adopted `useActionState` in web templates, removed Zustand auth store in favor of React 19 idioms

### Fixed

- Docker container names now use `projectName` instead of hardcoded values, preventing collisions when running multiple generated projects
- Improved type safety: `promptSDKs` returns typed integrations, preset customization answers explicitly typed
- Centralized ATT auto-enable logic (single source of truth)
- Removed deprecated `version: '3.8'` from docker-compose templates
- CLI branding consistently says `create-stackr` with correct docs URL

## [0.3.1] - 2026-01-20

### Fixed

- Updated README version banner to reflect v0.3 release
- Updated README roadmap to mark v0.3 features as completed

## [0.3.0] - 2026-01-20

### Added

- **Two-Factor Authentication**: Complete 2FA implementation for mobile and web templates with TOTP support, QR code setup, backup codes, and secure token verification
- **Documentation Website**: Improved documentation site design with better mobile responsiveness

### Changed

- **Template Quality**: Enhanced template quality and developer experience with better code organization
- **CLI UX**: Improved platform selection flow and conditional prompts for a smoother user experience
- **Error Handling**: Better error messages and user feedback throughout templates

### Security

- **Security Headers**: Added comprehensive security headers and configuration to Next.js template

### Fixed

- Various template fixes for improved error handling and edge cases

### Maintenance

- Updated Next.js to 16.1.1
- Improved test coverage and addressed testing gaps

## [0.2.0] - 2026-01-03

### Added

- **Next.js Web Platform**: Full web platform support with Next.js, including authentication and shared components
- **Better Auth Integration**: Replaced custom JWT/bcrypt authentication with Better Auth for improved security and developer experience
- **Drizzle ORM**: Added Drizzle ORM as an alternative to Prisma for database operations
- **Native OAuth Flow**: Implemented native ID token OAuth flow with browser fallback for mobile authentication
- **Shared Design System**: Cross-platform design system with dark mode support
- **Documentation Website**: Added documentation and landing page website

### Changed

- **Tab Navigation**: Made tab navigation the default and removed it from selectable features
- **Web Platform Testing**: Added comprehensive testing and documentation for web platform

### Fixed

- Critical bugs addressed before v0.2.0 release
- CI improvements for publish workflow and GitHub release permissions

## [0.1.0] - 2025-11-26

### Initial Beta Release

**Note:** This is a beta release for early adopters. Expect API changes before 1.0.0. Feedback is welcome!

### Added

#### Core CLI
- Interactive CLI powered by Commander.js and Inquirer.js
- Beautiful terminal UI with chalk, ora, and boxen
- Input validation and system checks
- Comprehensive error handling with cleanup
- Git repository initialization
- Package manager selection (npm, yarn, bun)
- Verbose logging mode

#### Templates & Presets
- Three preset configurations:
  - **Minimal**: Basic mobile app + backend
  - **Full-Featured**: All integrations included
  - **Analytics-Focused**: Adjust + Scate + basic features
- 94+ EJS template files
- Configurable onboarding flow (1-5 pages)
- Optional features: authentication, paywall, session management, tabs
- Dynamic template rendering based on configuration

#### Mobile App (React Native + Expo)
- React Native with Expo managed workflow
- Expo Router for file-based navigation
- Zustand for state management
- TypeScript with strict mode
- EAS Build configuration
- Cross-platform support (iOS & Android)

#### Backend (Node.js + Fastify)
- Fastify REST API framework
- Prisma ORM with PostgreSQL
- JWT authentication
- Session management with Redis
- BullMQ event queue (optional)
- Docker & Docker Compose configuration
- TypeScript with strict mode

#### SDK Integrations
- **RevenueCat**: In-app subscriptions & purchases
- **Adjust**: Mobile attribution & analytics with ADID distribution
- **Scate**: User engagement & retention tracking
- **ATT**: App Tracking Transparency for iOS

#### Developer Experience
- Automatic dependency installation
- Docker development environment
- Comprehensive README with setup instructions
- Environment variable templates (.env.example)
- Project structure documentation

#### Testing & Quality
- 17 test files with Vitest
- Unit tests (7 files)
- Integration tests (5 files)
- End-to-end tests (5 files)
- 80%+ test coverage
- ESLint with TypeScript rules
- Prettier code formatting

### Technical Details
- **Node.js**: >=18.0.0 required
- **Package size**: ~8MB (templates included)
- **Template files**: 94+ files
- **Test coverage**: 80%+
- **TypeScript**: Strict mode enabled
- **Module system**: ES modules

### Known Limitations
- Beta software - API may change before 1.0.0
- Limited to three preset templates
- Docker required for backend development
- PostgreSQL and Redis required for full features

[0.5.1]: https://github.com/itharea/create-stackr/releases/tag/v0.5.1
[0.5.0]: https://github.com/itharea/create-stackr/releases/tag/v0.5.0
[0.4.0]: https://github.com/itharea/create-stackr/releases/tag/v0.4.0
[0.3.1]: https://github.com/itharea/create-stackr/releases/tag/v0.3.1
[0.3.0]: https://github.com/itharea/create-stackr/releases/tag/v0.3.0
[0.2.0]: https://github.com/itharea/create-stackr/releases/tag/v0.2.0
[0.1.0]: https://github.com/itharea/create-stackr/releases/tag/v0.1.0
