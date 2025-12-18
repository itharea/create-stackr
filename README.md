# create-core-stack

[![npm version](https://badge.fury.io/js/create-core-stack.svg)](https://www.npmjs.com/package/create-core-stack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/create-core-stack)](https://nodejs.org)

> **v0.2.0**: Now with OAuth, Drizzle ORM support, and Next.js for web. Feedback welcome!

Create production-ready fullstack apps with Expo (mobile), Next.js (web), and Node.js backend in minutes.

## Quick Start

```bash
# npm
npx create-core-stack@latest my-app

# yarn
yarn create core-stack my-app

# bun
bunx create-core-stack my-app
```

## Features

- **React Native (Expo)** - Cross-platform mobile development (iOS & Android)
- **Next.js Web App** - Modern React web application with App Router
- **Node.js Backend** - Fastify + PostgreSQL + Redis
- **ORM Flexibility** - Choose between Prisma (default) or Drizzle ORM
- **BetterAuth Authentication** - Email/password + OAuth providers (Google, Apple, GitHub)
- **Native OAuth SDKs** - Seamless sign-in with native SDKs and browser fallback
- **SDK Integrations** - RevenueCat, Adjust, Scate
- **Onboarding Flows** - Customizable multi-page user onboarding
- **Subscription Paywalls** - RevenueCat integration for in-app purchases
- **Docker Support** - Complete development environment with Docker Compose
- **Analytics** - Adjust attribution and Scate engagement tracking
- **ATT Support** - App Tracking Transparency for iOS
- **Two-Factor Auth** - Optional TOTP-based 2FA support
- **Email Verification** - Built-in email verification and password reset

## Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 (or yarn/bun equivalent)
- **Git**: For repository initialization
- **Docker**: For backend development (optional but recommended)

## Available Presets

### Minimal
Basic fullstack app with essential features:
- Email/Password Authentication (BetterAuth)
- Session Management
- Tab Navigation
- PostgreSQL Database (Prisma or Drizzle)
- Docker Support

### Full-Featured
All integrations and features included:
- 3-page Onboarding Flow
- Full Authentication (Email + Google + Apple OAuth)
- Email Verification & Password Reset
- Subscription Paywall
- Session Management
- Tab Navigation
- RevenueCat Integration
- Adjust Integration
- Scate Integration
- ATT (App Tracking Transparency)
- PostgreSQL (Prisma or Drizzle) + BullMQ Event Queue
- Docker Support

### Analytics-Focused
Analytics SDKs with basic features:
- 2-page Onboarding Flow
- Email/Password Authentication
- Session Management
- Tab Navigation
- Adjust Integration
- Scate Integration
- ATT (App Tracking Transparency)
- PostgreSQL (Prisma or Drizzle) + BullMQ Event Queue
- Docker Support

## CLI Usage

```bash
# Interactive mode
npx create-core-stack my-app

# With preset template
npx create-core-stack my-app --template minimal
npx create-core-stack my-app --template full-featured
npx create-core-stack my-app --template analytics-focused

# With defaults (minimal preset, no prompts)
npx create-core-stack my-app --defaults

# Show help
npx create-core-stack --help

# Verbose output
npx create-core-stack my-app --verbose
```

## What You Get

### Mobile App (Expo)
- React Native with Expo Router
- TypeScript with strict mode
- Zustand state management
- File-based routing
- Native OAuth SDKs (Google, Apple)
- Ready for EAS Build

### Web App (Next.js)
- Next.js 14+ with App Router
- TypeScript with strict mode
- Shared authentication with mobile
- Tailwind CSS styling

### Backend
- Fastify REST API
- PostgreSQL with Prisma OR Drizzle ORM
- BetterAuth authentication
- OAuth providers (Google, Apple, GitHub)
- Docker development environment
- Optional BullMQ event queue

### Optional Integrations
- RevenueCat (subscriptions)
- Adjust (attribution)
- Scate (engagement)
- ATT (iOS tracking transparency)

## Generated Project Structure

```
my-app/
├── mobile/              # React Native (Expo) app
│   ├── app/             # Expo Router screens
│   ├── src/             # Components, services, utils
│   └── assets/          # Images, fonts
├── web/                 # Next.js web app
│   ├── app/             # App Router pages
│   └── src/             # Components, services
├── backend/             # Node.js backend
│   ├── controllers/     # API routes
│   ├── domain/          # Business logic
│   ├── prisma/          # Prisma schema (if selected)
│   └── drizzle/         # Drizzle schema (if selected)
├── docker-compose.yml   # Local development
└── scripts/             # Setup utilities
```

## Generated Project Setup

After generating your project:

```bash
cd my-app

# Start backend (Docker)
docker-compose up -d

# Setup database (works with both Prisma and Drizzle)
cd backend
npm install
npm run db:migrate  # ORM-agnostic command
npm run db:generate # Generate types
cd ..

# Start mobile app
cd mobile
npm install
npm start

# Start web app
cd web
npm install
npm run dev
```

### Database Commands (ORM-agnostic)
Both Prisma and Drizzle use the same npm scripts:
```bash
npm run db:generate  # Generate ORM types
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open visual database browser
```

## Deployment

### Mobile App
Use EAS Build for deployment:

```bash
cd mobile
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

### Backend
Deploy to any Node.js hosting:
- Heroku
- Railway
- Render
- AWS/GCP/Azure
- Your own VPS

Configure environment variables from `.env.example`.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Test with coverage
npm run test:coverage

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run typecheck
```

## Troubleshooting

### "Command not found: create-core-stack"

Make sure npx is working:
```bash
npx --version
```

Try with explicit version:
```bash
npx create-core-stack@latest my-app
```

### "EACCES: permission denied"

Don't use sudo with npx. If you get permission errors:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

### Generated project TypeScript errors

Make sure you're using Node.js >= 18:
```bash
node --version
```

### Docker issues

Ensure Docker is running:
```bash
docker --version
docker ps
```

## FAQ

**Q: What's the difference between presets?**
A: Minimal has basic features, Full-Featured has everything including OAuth and all SDKs, Analytics-Focused has Adjust + Scate for attribution.

**Q: Can I add features later?**
A: Yes, but it's easier to start with more features and remove what you don't need.

**Q: Is this production-ready?**
A: The generated code is production-quality. Test thoroughly before deploying.

**Q: What about web support?**
A: Yes! We support both Expo for mobile (iOS & Android) and Next.js for web. Both share the same backend and authentication.

**Q: Which ORM should I choose?**
A: **Prisma** (default) is great for most projects with its auto-generated client and migrations. **Drizzle** is lighter-weight, SQL-first, and better for serverless environments. Both work identically with BetterAuth.

**Q: What OAuth providers are supported?**
A: Google, Apple, and GitHub. Google and Apple have native SDK support on mobile with automatic browser fallback. GitHub uses browser-based OAuth only.

**Q: Can I customize the templates?**
A: Not yet, but template customization is planned for future versions.

## Roadmap

### Completed in v0.2.0
- [x] OAuth support (Google, Apple, GitHub)
- [x] BetterAuth authentication framework
- [x] Drizzle ORM as alternative to Prisma
- [x] Next.js web app support
- [x] Native OAuth SDKs with browser fallback
- [x] Two-factor authentication (TOTP)
- [x] Email verification & password reset

### Upcoming
- [ ] v0.3.0: Additional template customization
- [ ] v0.4.0: More SDK integrations (Firebase, Supabase)
- [ ] v1.0.0: Stable API, production-ready

## Technology Stack

### CLI Framework
- **Commander.js** - Command-line interface framework
- **Inquirer.js** - Interactive prompts
- **chalk** - Terminal colors
- **ora** - Loading spinners
- **boxen** - Terminal boxes
- **EJS** - Template rendering

### Generated Stack
- **Expo** - React Native mobile framework
- **Next.js** - React web framework
- **Fastify** - Node.js backend
- **BetterAuth** - Authentication framework
- **Prisma** - Type-safe ORM (default)
- **Drizzle** - SQL-first ORM (alternative)
- **PostgreSQL** - Database
- **Redis** - Caching & queues

### Development
- **TypeScript** - Type safety
- **Vitest** - Testing framework
- **ESLint** - Linting
- **Prettier** - Code formatting

## Project Status

### Completed Features

- [x] CLI framework using Commander.js
- [x] Interactive prompts using Inquirer.js
- [x] Input validation and error handling
- [x] Three preset templates (Minimal, Full-Featured, Analytics-Focused)
- [x] Custom configuration flow
- [x] Comprehensive unit tests
- [x] Type-safe configuration schema
- [x] Package manager selection
- [x] Template system using EJS
- [x] File generation and copying
- [x] Project scaffolding
- [x] Conditional feature integration
- [x] BetterAuth authentication integration
- [x] OAuth providers (Google, Apple, GitHub)
- [x] Native OAuth SDKs with browser fallback
- [x] Drizzle ORM support as Prisma alternative
- [x] Two-factor authentication (TOTP)
- [x] Email verification & password reset
- [x] Next.js web app support

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT © itharea

## Support

- [Documentation](https://github.com/itharea/create-core-stack)
- [Discussions](https://github.com/itharea/create-core-stack/discussions)
- [Issues](https://github.com/itharea/create-core-stack/issues)
