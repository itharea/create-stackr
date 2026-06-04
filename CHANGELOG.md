# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-06-04

### ⚠ BREAKING CHANGES

- **The preset system is removed.** The `-t, --template <preset>` flag, the "Choose a starting template" menu, and the `PRESETS` / `loadPreset` / `PresetDefinition` machinery are gone — `create-stackr` now always prompts for what to build, and `--defaults` is the only non-interactive path. (#92)
- **The default ORM changes from Prisma to Drizzle.** The ORM prompt lists Drizzle first and defaults to it, and `--defaults` generates a Drizzle project. Selecting Prisma is unchanged. (#92)

### Added

- **Push-based LLM context harness.** A single source of truth — `src/config/context-map.ts`, a pure-data `ContextRule[]` — is rendered by one generator (`src/generators/ai-context.ts`) into every agent-facing artifact, so the formats cannot disagree. It is wired into both `create-stackr` (init) and `stackr add service`, so the artifacts never drift from the live service set. Replaces the old "walk upward and read every `DESIGN.md`" pull model. (#90)
  - **Nested `AGENTS.md`** (root + service-root + backend/web/mobile subsystems) plus a root **`CLAUDE.md` = `@AGENTS.md`** bridge, always emitted so the import never dangles.
  - **Glob-scoped editor rules**: `.cursor/rules/*.mdc` (Cursor) and `.windsurf/rules/*.md` (Windsurf), one file per applicable folder rule, auto-attached by glob.
  - **Claude skills** under `.claude/skills/` (`stackr-backend`, `stackr-web`, `stackr-mobile`, `add-domain-entity`), `paths:`-globbed so Claude auto-loads them on a matching edit.
- **Deterministic enforcement layer (ships regardless of the selected AI tools).** Per-service `lint` / `typecheck` / `check` scripts with a validated-clean `eslint.config.mjs`; a root `@ast-grep/cli` + `sgconfig.yml` with the rules `repo-catch-database-error` and `no-auth-tables-outside-auth` (Drizzle), plus a `check-auth-tables.mjs` script for Prisma parity; a per-service-matrix `lint.yml` CI workflow; and a Claude `PostToolUse` hook that lints edited backend files (no-ops before deps are installed). Mobile rules: `mobile-animated-native-driver`, `mobile-no-direct-fetch`, `mobile-no-hardcoded-color`. (#90)
- **`stackr add entity <service> <entity>`** — correct-by-construction codegen. Writes `domain/<entity>/{schema,repository,service}.ts` and AST-merges the table into the service's ORM schema (`ts-morph` for Drizzle, `@mrleebo/prisma-ast` for Prisma) so the generated repository type-checks. Atomic, mirroring `add service`, and records a pending migration. (#90)
- **`stackr doctor [--fix]`** — a rendered-vs-disk diff of the agent-context layer (missing / modified / stale), with a non-zero exit on unfixed drift (CI-gateable); `--fix` regenerates via the same single generator. (#90)
- **`stackr migrate context [--dry-run]`** — idempotent upgrade of an existing project's agent-context layer to the current format; retires the legacy flat rule files. (#90)
- **Agent-context effectiveness eval harness** (`eval/`) — measures whether the context layers change a coding agent's first-pass compliance across three conditions (off / salience / salience+enforcement), scored with the project's own ast-grep rules. Full `P1`–`P18` task suite plus a standing per-release protocol. (#90)

### Changed

- **`create-stackr` always prompts for configuration.** The interactive flow asks what to build every time, and the admin-dashboard confirm now defaults to yes. `--defaults` (Drizzle + auth with admin dashboard + one `core` base service) is the only non-interactive path. (#92)
- **Documentation website overhauled** to match the multi-service architecture and the context harness — new Architecture and Context Harness sections, a step-by-step Quick Start, and corrected references throughout. (#94)

### Removed

- The preset system: the `-t, --template` flag, the starting-template menu, and the `PRESETS` / `loadPreset` / `PresetDefinition` code. (#92)
- The 35 co-located `DESIGN.md` / `BEST_PRACTICES.md` docs and the old `AGENTS.md.ejs` pull-router template — architecture prose now lives in the service-root `AGENTS.md`. (#90)
- The transitional flat `.cursorrules` / `.windsurfrules` files — replaced by the glob-scoped rule directories and always cleaned up on regeneration. (#90)

## [0.6.1] - 2026-05-25

### Changed

- **`stackr add service` now uses AST-based additive merge for every managed file** it rewrites — `auth/backend/lib/auth.ts`, the auth ORM schema (`prisma/schema.prisma` or `drizzle/schema.ts`), and `docker-compose.yml`. Replaces the previous mix of marker blocks (compose) and whole-file SHA-256 checks with `.stackr-new` sidecars (TS files). The new contract is purely additive: if a desired entry already exists, leave it alone; if it's missing, add it. User customizations on managed entries (image tags, env vars, healthchecks, hand-added fields/imports) survive across regens, and user-added services / networks / volumes / models / properties are untouched. (#81)
  - TS files use `ts-morph@28` (new runtime dep, ~3 MB). Prisma schema uses `@mrleebo/prisma-ast` (new runtime dep, ~30 KB — chosen over the 20 MB `@prisma/internals`). Compose uses the existing `yaml@2.6.1` with `parseDocument(..., { keepSourceTokens: true })`.
  - Marker comments (`# >>> stackr managed …`) are no longer emitted. `stripStackrMarkers` removes them on the first regen against a pre-0.6.1 compose file; one-time visible churn, no markers thereafter.
  - `.stackr-new` sidecar files are gone. Collisions are resolved by the AST merge itself.

### Fixed

- **Next.js 16 cache footguns in auth web templates.** `revalidateTag(tag)` was the wrong primitive for read-your-own-writes mutations: with a `CacheLife` profile like `'max'`, the runtime treats it as stale-while-revalidate and the current request keeps serving stale data. Swapped to `updateTag(tag)` in `templates/services/auth/web/src/lib/admin/actions.ts` for `updateUserRole` and `deleteUser`. (#79)
- **`getSession()` was fetched twice per protected-route render** — once in the layout, once in nested pages — because it lived in a `'use server'` `actions.ts` and relied on `fetch(..., cache: 'no-store')` without `React.cache()`. `no-store` opts out of the data cache, not request memoization. Extracted into a new `lib/auth/session.ts` wrapped in `React.cache()` with `import "server-only"`, and updated every importer in `templates/services/auth/web/` and `templates/features/web/auth/`. Docs in `templates/services/base/web/DESIGN.md.ejs` and `BEST_PRACTICES.md.ejs` updated to teach the right primitives. (#79)
- **Generated auth tests no-op when `emailVerification: true`.** BetterAuth's `sign-up/email` returns 200 without a session cookie when verification is on, and `sign-in/email` returns 403 `EMAIL_NOT_VERIFIED`, but the component / e2e tests all assumed sign-up issues a cookie. The `emailOTP` plugin also called `sendEmail()` straight into real Gmail SMTP, producing `EAUTH 535-5.7.8 BadCredentials` on every test run. Fix is a DB-flip in tests via a new `markEmailVerified(email)` helper (`tests/helpers/verify-user.{drizzle,prisma}.ts.ejs` per service; `tests/e2e/helpers/verify-user.ts.ejs` at the monorepo level using raw `pg.Client`). `sendEmail()` short-circuits when `NODE_ENV === "test"`. Component + e2e tests branch on `service.authConfig.emailVerification`. (#81)
- **Test compose collided with dev compose project namespace.** Both `docker-compose.yml` and `docker-compose.test.yml` were emitted without a top-level `name:` field, so Compose derived the project name from the cwd folder for both — `bun run test` after `bun run docker:dev` printed `WARN ... Found orphan containers ...`. `docker-compose.test.yml` now emits `name: <projectName>-test`. Dev compose's project name stays implicit so existing dev volumes/containers in upgraded projects don't get orphaned. (#81)
- **`stackr add service` left the auth ORM schema stale.** The command set the `has<Service>Account` pending-migration sentinel and regenerated `auth/backend/lib/auth.ts`, but the schema file (`drizzle/schema.ts` / `prisma/schema.prisma`) was never rewritten, so `drizzle-kit generate` / `prisma migrate dev` had no diff to migrate. Phase B now plans both files; Phase D commits both. (#81)
- **`ENOTEMPTY` flake on integration tests.** `MonorepoGenerator.generate()` ran `git init` + `git add .` + `git commit` against the freshly-generated project; on Linux CI, git left background work in flight and `afterEach`'s `fs.remove(tempDir)` raced with late-arriving `.git/objects/` writes. Gated `initializeGit` on a `STACKR_SKIP_GIT_INIT` env var set in `tests/utils/setup.ts`. Production CLI behavior unchanged. Side benefit: integration suite wall time dropped from ~28 s to ~10 s. (#84)

## [0.6.0] - 2026-05-12

### Added

- **Testing infrastructure for generated projects** — landed across six phases (PRs #64, #66, #68, #70, #72, #76):
  - `--tests` flag on `create-stackr` and `--no-tests` on `stackr add service` (default: tests are scaffolded).
  - Unified `docker-compose.test.yml` generator with two profiles: `component` (per-service Vitest against an ephemeral DB + Redis) and `e2e` (cross-service stack-smoke + auth handoff).
  - Per-service component tests (Vitest): auth, base, and queue.
  - Monorepo-level E2E suite at `tests/e2e/` with cross-service stack-smoke and auth handshake.
  - Stackr CLI's own unit-test layer (`src/utils/port-allocator`, `src/generators/docker-compose-test`, config-file).
  - Per-service `tests/DESIGN.md` and `tests/BEST_PRACTICES.md` documenting the Testing Diamond and the Arrange/Act/Assert template.
- `--ci-workflow` flag on `create-stackr` generates `.github/workflows/test.yml` with a component-matrix job (one per service) and an e2e job that runs the cross-service stack once.
- `stackr add service <name>` now detects an existing workflow on disk and re-emits it with the new service added to the component matrix.
- Root `package.json` `test` and `test:e2e` scripts (gated on at least one service having tests enabled). `setup.sh` "Next steps" footer surfaces them as a new item.
- New `infos[]` channel in `printNextSteps` for non-error advisory output (used by the workflow regen notice and similar).
- Port allocator now reserves a non-overlapping set of test ports alongside the dev ports.

### Changed

- **Generated project scripts migrated from `.sh` to `.mjs`**: `scripts/setup.sh`, `scripts/test-all.sh`, and `scripts/test-e2e.sh` are now `setup.mjs`, `test-all.mjs`, and `test-e2e.mjs`. Runnable under npm, yarn, or bun via `node scripts/*.mjs`. `chmod +x` step removed.
- `docker:dev` and `docker:prod` are now inline `package.json` scripts (the wrapper `.sh` files are gone).
- Generated root `package.json` adds `inquirer@^10` as a devDep (used by `setup.mjs`'s volume-reset prompt). `setup.mjs` dynamic-imports it after the root install so the dependency is actually available when the prompt fires.
- Backend `tsconfig.json` `include` narrowed to source dirs; `tests/`, `vitest.config.ts`, and `*.config.ts` are excluded from the prod build.
- Backend `package.json` scripts (`build`, `dev:*`, `start:*`, `create-admin`) branch on `packageManager` instead of hardcoding `bun` — npm/yarn projects no longer fail at runtime.
- `start:*` runs TypeScript source via `tsx` (now a runtime dependency) — sidesteps Node ESM's `.js`-extension requirement without rewriting 47 imports.

### Fixed

- Generated Dockerfile prod stage: schema files COPY'd **before** `<pm> install` so Prisma's `postinstall` can find them. Full install → build → `prune --production`, with `NODE_ENV=production` set **after** prune so the install never auto-omits the devDeps `tsc` needs.
- Replaced `RUN chown -R backend:<group> /app` (60 s per image on macOS Docker) with `COPY --chown=backend:<group>` on every COPY.
- Prisma v7 compatibility: test helpers import from `../../prisma/generated/prisma/client` to match `utils/db.ts`. `docker-compose.test.yml` migration runner targets the `base` Dockerfile stage so Prisma/Drizzle CLIs are present, and drops `--skip-generate` (removed from `prisma db push` in v7).
- Missing `import type { AuthFastifyRequest }` added to the `standard` and `role-gated` auth plugin flavors. The type was declared via `declare module "fastify"` but never imported back; only the `flexible` flavor had it.
- `DeviceSession` model added to both the Prisma and Drizzle schemas for the auth service. `domain/device-session/repository.ts` queried `db.deviceSession` but the model did not exist.

### Removed

- `templates/services/base/backend/utils/email.ts.ejs` deleted — base services don't send email; the file was leaking in whenever auth had email verification or password reset enabled. The `shouldIncludeFile` email gate now also requires `service.kind === 'auth'`.
- The `MonorepoGenerator.makeScriptsExecutable` step is gone — `.mjs` files are invoked via `node`, so the `chmod +x` pass is no longer needed.

### Deferred (tracked in backlog)

- `stackr add auth` — retroactively add an auth service to a `--no-auth` project
- `stackr migrate`, `stackr doctor`, `stackr add entity`, `stackr add route`
- `ProjectConfig` removal (still aliased to `InitConfig` — was tracked for v0.6 in the v0.5.0 changelog; deferred again)

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

[0.6.0]: https://github.com/itharea/create-stackr/releases/tag/v0.6.0
[0.5.1]: https://github.com/itharea/create-stackr/releases/tag/v0.5.1
[0.5.0]: https://github.com/itharea/create-stackr/releases/tag/v0.5.0
[0.4.0]: https://github.com/itharea/create-stackr/releases/tag/v0.4.0
[0.3.1]: https://github.com/itharea/create-stackr/releases/tag/v0.3.1
[0.3.0]: https://github.com/itharea/create-stackr/releases/tag/v0.3.0
[0.2.0]: https://github.com/itharea/create-stackr/releases/tag/v0.2.0
[0.1.0]: https://github.com/itharea/create-stackr/releases/tag/v0.1.0
