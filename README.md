# create-stackr

[![npm version](https://badge.fury.io/js/create-stackr.svg)](https://www.npmjs.com/package/create-stackr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/create-stackr)](https://nodejs.org)

> **v0.2.0**: Now with OAuth, Drizzle ORM support, and Next.js for web. Feedback welcome!

Create production-ready fullstack apps with Expo (mobile), Next.js (web), and Node.js backend in minutes.

## Quick Start

```bash
# npm
npx create-stackr@latest my-app

# yarn
yarn create stackr my-app

# bun
bunx create-stackr my-app
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
npx create-stackr my-app

# With preset template
npx create-stackr my-app --template minimal
npx create-stackr my-app --template full-featured
npx create-stackr my-app --template analytics-focused

# With defaults (minimal preset, no prompts)
npx create-stackr my-app --defaults

# Show help
npx create-stackr --help

# Verbose output
npx create-stackr my-app --verbose
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

### Backend Setup (Required First)

```bash
# Start services (PostgreSQL, Redis)
docker-compose up -d

# Install dependencies and setup database
cd backend
bun install
bun run db:migrate
bun run db:generate
bun start  # or bun run dev for watch mode
```

The backend runs on `http://localhost:8080`.

### Mobile App Setup

```bash
cd mobile
bun install
bun start
```

Press `i` for iOS simulator or `a` for Android emulator.

### Web App Setup

```bash
cd web
bun install
bun run dev
```

Open `http://localhost:3000` in your browser.

### Verifying Everything Works

1. **Backend health**: `curl http://localhost:8080/health`
2. **Database connection**: Check backend logs for "Database connected"
3. **Web app**: Visit `http://localhost:3000` - should show home page
4. **Mobile app**: Should load without red error screen
5. **Auth flow**: Register a test user on web, verify in database

### Common Setup Issues

| Issue | Solution |
|-------|----------|
| "Port 8080 in use" | Stop other services or change `PORT` in backend `.env` |
| "Database connection refused" | Ensure Docker containers are running: `docker ps` |
| "Module not found" | Delete `node_modules` and reinstall with `bun install` |
| "CORS error" | Check `CORS_ORIGINS` includes your frontend URL |
| "Apple Sign In fails" | Apple requires HTTPS - use ngrok or test in production |

### Database Commands (ORM-agnostic)
Both Prisma and Drizzle use the same npm scripts:
```bash
npm run db:generate  # Generate ORM types
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open visual database browser
```

## Web Platform Details

### Project Structure

```
web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Auth pages (login, register, etc.)
│   │   ├── (app)/           # Protected app pages (dashboard, settings)
│   │   ├── auth/            # OAuth callback routes
│   │   ├── globals.css      # Global styles with dark mode
│   │   └── layout.tsx       # Root layout with providers
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── auth/            # Auth forms and buttons
│   │   ├── settings/        # Settings components
│   │   └── providers/       # Context providers
│   ├── lib/
│   │   ├── auth/            # Auth utilities and actions
│   │   └── utils.ts         # Utility functions
│   └── store/               # Zustand stores
├── public/                  # Static assets
├── next.config.ts           # Next.js configuration
└── package.json
```

### Environment Variables

Create a `.env` file in the `web/` directory:

```env
# Public URL of the web app (used for OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend API URL (server-side only, used by server actions)
BACKEND_URL=http://localhost:8080
```

### Running the Web App

```bash
cd web
bun install
bun run dev
```

The app runs on `http://localhost:3000` by default.

### Authentication on Web

The web platform uses **cookie-based sessions** (unlike mobile which uses token storage):

| Feature | Mobile | Web |
|---------|--------|-----|
| Session Storage | AsyncStorage + Secure Store | HTTP-only Cookies |
| Token Refresh | Manual refresh | Automatic via cookies |
| OAuth Flow | Deep links + native SDKs | Browser redirects |
| CSRF Protection | Not needed | Built into Better Auth |

### OAuth Configuration

For OAuth to work on web, ensure your OAuth providers have the correct redirect URIs pointing to the **backend** (Better Auth handles the OAuth callback):

**Google Cloud Console:**
```
http://localhost:8080/api/auth/callback/google (development)
https://api.yourdomain.com/auth/callback/google (production)
```

**Apple Developer Console:**

> **Important:** Apple Sign In requires HTTPS for redirect URIs. It will not work with `http://localhost` in development. You must either:
> - Use a tunneling service (ngrok, Cloudflare Tunnel) to get an HTTPS URL for the backend
> - Test Apple Sign In only in production/staging environments with valid HTTPS
> - Use the mobile app for Apple Sign In testing during development

```
https://api.yourdomain.com/auth/callback/apple (production only - HTTPS required)
```

**GitHub OAuth App:**
```
http://localhost:8080/api/auth/callback/github (development)
https://api.yourdomain.com/auth/callback/github (production)
```

### CORS Configuration

The backend must allow web origins. In `backend/.env`:

```env
# Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Dark Mode

The web app includes full dark mode support:

- Uses `next-themes` for theme management
- Theme persists in localStorage
- Respects system preference by default
- Toggle via the `ThemeToggle` component

### Deploying Web

Deploy to any Next.js hosting:

- **Vercel** (recommended): `vercel deploy`
- **Netlify**: Add `netlify.toml` configuration
- **Docker**: Use the provided Dockerfile
- **Node.js hosting**: Run `bun run build && bun start`

Remember to update environment variables for production:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
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

### "Command not found: create-stackr"

Make sure npx is working:
```bash
npx --version
```

Try with explicit version:
```bash
npx create-stackr@latest my-app
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

### Web: Hydration mismatch errors

If you see "Hydration failed because the initial UI does not match" errors:

1. **Theme-related**: Ensure `suppressHydrationWarning` is on the `<html>` tag in `layout.tsx`
2. **Auth state**: The `AuthHydrator` component handles this - don't access auth state in server components
3. **Date/time rendering**: Use `useEffect` for time-sensitive content

```tsx
// Bad - causes hydration mismatch
const date = new Date().toLocaleDateString();

// Good - renders client-side only
const [date, setDate] = useState<string>();
useEffect(() => {
  setDate(new Date().toLocaleDateString());
}, []);
```

### Web: OAuth callback fails

1. **Check redirect URI**: Must exactly match what's configured in OAuth provider
2. **Check CORS**: Backend must allow your web origin
3. **Check cookies**: Ensure you're not blocking third-party cookies in development
4. **Apple Sign In**: Remember that Apple requires HTTPS - won't work on localhost

Debug with:
```bash
# Check backend logs
docker logs backend-container

# Verify CORS headers
curl -I http://localhost:8080/api/auth/session
```

### Web: Apple Sign In not working in development

Apple Sign In requires HTTPS redirect URIs and will not work with `http://localhost`. Options:

1. **Use ngrok or Cloudflare Tunnel**: Create an HTTPS tunnel to your backend
   ```bash
   ngrok http 8080
   # Use the https://xxx.ngrok.io/api/auth/callback/apple URL as your redirect URI
   ```
2. **Skip Apple in dev**: Test Apple Sign In only in staging/production environments
3. **Use mobile**: Apple Sign In works in development on the mobile app via native SDKs

### Web: Session not persisting

1. **Cookie settings**: In development, cookies require `SameSite=Lax` and `Secure=false`
2. **Domain mismatch**: Ensure frontend and backend are on the same domain (or properly configured for cross-domain)
3. **Check browser DevTools**: Network tab -> Cookies to see if session cookie is being set

### Web: 404 on refresh (deployed)

If routes work initially but 404 on refresh:

1. **Vercel**: Should work out of the box
2. **Netlify**: Install the `@netlify/plugin-nextjs` plugin. Do NOT use SPA-style redirects - Next.js uses SSR:
   ```toml
   # netlify.toml
   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```
3. **Self-hosted Node.js**: Ensure you're running `next start` (not serving static files)
4. **Docker/Nginx**: Use a reverse proxy to the Node.js server, not static file serving

### Web: Build fails with module errors

```bash
# Clear Next.js cache
rm -rf web/.next

# Reinstall dependencies
rm -rf web/node_modules
bun install
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

**Q: Can I use the web app without mobile?**
A: Yes! During CLI setup, select "web" as your only platform. This generates just the web app and backend, without any mobile code.

**Q: Why does web use cookies instead of tokens?**
A: Cookie-based sessions are more secure for web applications - they're HTTP-only (no JavaScript access), automatically included in requests, and protected against XSS attacks. Mobile apps use secure token storage because they don't have cookie support.

**Q: Can I share authentication between web and mobile?**
A: Yes, both platforms authenticate against the same backend and share the same user database. However, sessions are separate - logging in on web doesn't log you in on mobile and vice versa.

**Q: Why doesn't Apple Sign In work on localhost?**
A: Apple requires HTTPS for OAuth redirect URIs. Use ngrok or a similar tunneling service for local development, or test Apple Sign In in a staging environment with a valid SSL certificate.

**Q: How do I add more pages to the web app?**
A: Create new files in `web/src/app/`. For protected pages, put them in `(app)/`. For public pages, put them directly in `app/`. See the [Next.js App Router docs](https://nextjs.org/docs/app/building-your-application/routing).

**Q: How do I customize the web design?**
A: The web app uses Tailwind CSS and shadcn/ui components. Edit `globals.css` for color scheme changes, or modify individual components in `src/components/ui/`.

**Q: Does the web app support SSR?**
A: Yes, Next.js App Router uses React Server Components by default. Client components (marked with `"use client"`) handle interactive features like forms and auth state.

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

- [Documentation](https://github.com/itharea/create-stackr)
- [Discussions](https://github.com/itharea/create-stackr/discussions)
- [Issues](https://github.com/itharea/create-stackr/issues)
