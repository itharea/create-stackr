# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.3.1]: https://github.com/itharea/create-stackr/releases/tag/v0.3.1
[0.3.0]: https://github.com/itharea/create-stackr/releases/tag/v0.3.0
[0.2.0]: https://github.com/itharea/create-stackr/releases/tag/v0.2.0
[0.1.0]: https://github.com/itharea/create-stackr/releases/tag/v0.1.0
