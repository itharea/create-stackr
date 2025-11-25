# create-core-stack

[![npm version](https://badge.fury.io/js/create-core-stack.svg)](https://www.npmjs.com/package/create-core-stack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/create-core-stack)](https://nodejs.org)

> **Beta Release**: This is version 0.1.0. Package may change before 1.0.0. Feedback welcome!

Create production-ready full-stack mobile apps with React Native (Expo) and Node.js backend in minutes.

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
- **Node.js Backend** - Fastify + PostgreSQL + Redis
- **SDK Integrations** - RevenueCat, Adjust, Scate
- **Onboarding Flows** - Customizable multi-page user onboarding
- **Authentication** - JWT-based auth with backend integration
- **Subscription Paywalls** - RevenueCat integration for in-app purchases
- **Docker Support** - Complete development environment with Docker Compose
- **Analytics** - Adjust attribution and Scate engagement tracking
- **ATT Support** - App Tracking Transparency for iOS

## Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 (or yarn/bun equivalent)
- **Git**: For repository initialization
- **Docker**: For backend development (optional but recommended)

## Available Presets

### Minimal
Basic mobile app + backend with essential features:
- Authentication
- Session Management
- Tab Navigation
- PostgreSQL Database
- Docker Support

### Full-Featured
All integrations and features included:
- 3-page Onboarding Flow
- Authentication
- Subscription Paywall
- Session Management
- Tab Navigation
- RevenueCat Integration
- Adjust Integration
- Scate Integration
- ATT (App Tracking Transparency)
- PostgreSQL + BullMQ Event Queue
- Docker Support

### Analytics-Focused
Analytics SDKs with basic features:
- 2-page Onboarding Flow
- Authentication
- Session Management
- Tab Navigation
- Adjust Integration
- Scate Integration
- ATT (App Tracking Transparency)
- PostgreSQL + BullMQ Event Queue
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

### Mobile App
- React Native with Expo Router
- TypeScript with strict mode
- Zustand state management
- File-based routing
- Ready for EAS Build

### Backend
- Fastify REST API
- Prisma + PostgreSQL
- JWT authentication
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
│   ├── app/            # Expo Router screens
│   ├── src/            # Components, services, utils
│   └── assets/         # Images, fonts
├── backend/            # Node.js backend
│   ├── controllers/    # API routes
│   ├── domain/         # Business logic
│   └── prisma/         # Database schema
├── docker-compose.yml  # Local development
└── scripts/            # Setup utilities
```

## Generated Project Setup

After generating your project:

```bash
cd my-app

# Start backend (Docker)
docker-compose up -d

# Setup database
cd backend
npm install
npx prisma migrate dev
cd ..

# Start mobile app
cd mobile
npm install
npm start
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
A: Minimal has basic features, Full-Featured has everything, Analytics-Focused has Adjust + Scate.

**Q: Can I add features later?**
A: Yes, but it's easier to start with more features and remove what you don't need.

**Q: Is this production-ready?**
A: The generated code is production-quality, but this is a beta tool (v0.1.0). Test thoroughly.

**Q: What about web support?**
A: The mobile app is React Native (mobile-only). For web, consider using Expo's web support or a separate web app.

**Q: Can I customize the templates?**
A: Not yet, but template customization is planned for future versions.

## Roadmap

- [ ] v0.2.0: Additional template customization
- [ ] v0.3.0: More SDK integrations (Firebase, Supabase)
- [ ] v0.4.0: Web app support
- [ ] v1.0.0: Stable API, production-ready

## Technology Stack

### CLI Framework
- **Commander.js** - Command-line interface framework
- **Inquirer.js** - Interactive prompts
- **chalk** - Terminal colors
- **ora** - Loading spinners
- **boxen** - Terminal boxes
- **EJS** - Template rendering

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
