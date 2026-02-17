import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectGenerator } from '../../src/generators/index.js';
import type { ProjectConfig } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock execa to avoid actual git/npm operations
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

// Mock inquirer to automatically skip cleanup prompt
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ shouldCleanup: false }),
  },
}));

describe('Integration: Web Template Generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-web-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('web-only project generation', () => {
    it('should generate web directory structure', async () => {
      const config: ProjectConfig = {
        projectName: 'web-only-app',
        packageManager: 'npm',
        appScheme: 'webonlyapp',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-only-app');
      await generator.generate(projectDir);

      // Verify web directory exists
      expect(await fs.pathExists(path.join(projectDir, 'web'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/lib'))).toBe(true);

      // Verify mobile directory does NOT exist
      expect(await fs.pathExists(path.join(projectDir, 'mobile'))).toBe(false);
    });

    it('should generate Next.js configuration files', async () => {
      const config: ProjectConfig = {
        projectName: 'nextjs-config-test',
        packageManager: 'npm',
        appScheme: 'nextjsconfig',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'nextjs-config-test');
      await generator.generate(projectDir);

      // Verify Next.js config files
      expect(await fs.pathExists(path.join(projectDir, 'web/next.config.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/tsconfig.json'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/postcss.config.mjs'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/eslint.config.mjs'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/components.json'))).toBe(true);
    });

    it('should generate web package.json with correct dependencies', async () => {
      const config: ProjectConfig = {
        projectName: 'web-pkg-test',
        packageManager: 'npm',
        appScheme: 'webpkgtest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-pkg-test');
      await generator.generate(projectDir);

      const packageJson = await fs.readJSON(path.join(projectDir, 'web/package.json'));

      // Verify Next.js core dependencies
      expect(packageJson.dependencies.next).toBeDefined();
      expect(packageJson.dependencies.react).toBeDefined();
      expect(packageJson.dependencies['react-dom']).toBeDefined();

      // Verify theme dependencies
      expect(packageJson.dependencies['next-themes']).toBeDefined();

      // Verify UI dependencies
      expect(packageJson.dependencies['@radix-ui/react-label']).toBeDefined();
      expect(packageJson.dependencies['class-variance-authority']).toBeDefined();
      expect(packageJson.dependencies['clsx']).toBeDefined();
      expect(packageJson.dependencies['tailwind-merge']).toBeDefined();

      // Verify scripts
      expect(packageJson.scripts.dev).toBe('next dev');
      expect(packageJson.scripts.build).toBe('next build');
      expect(packageJson.scripts.start).toBe('next start');
    });

    it('should include sonner dependency when authentication enabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-sonner-test',
        packageManager: 'npm',
        appScheme: 'websonnertest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: false,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-sonner-test');
      await generator.generate(projectDir);

      const packageJson = await fs.readJSON(path.join(projectDir, 'web/package.json'));

      // Verify sonner is included when authentication is enabled
      expect(packageJson.dependencies.sonner).toBeDefined();
    });

    it('should include input-otp dependency when emailVerification enabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-otp-test',
        packageManager: 'npm',
        appScheme: 'webotptest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: true,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: false,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-otp-test');
      await generator.generate(projectDir);

      const packageJson = await fs.readJSON(path.join(projectDir, 'web/package.json'));

      // Verify input-otp is included when emailVerification is enabled
      expect(packageJson.dependencies['input-otp']).toBeDefined();

      // Verify input-otp component is generated
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/input-otp.tsx'))).toBe(true);
    });

    it('should exclude input-otp when emailVerification disabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-no-otp-test',
        packageManager: 'npm',
        appScheme: 'webnootptest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: false,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-no-otp-test');
      await generator.generate(projectDir);

      const packageJson = await fs.readJSON(path.join(projectDir, 'web/package.json'));

      // Verify input-otp is NOT included when emailVerification is disabled
      expect(packageJson.dependencies['input-otp']).toBeUndefined();
    });
  });

  describe('web auth templates', () => {
    it('should generate auth pages when authentication enabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-auth-test',
        packageManager: 'npm',
        appScheme: 'webauthtest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-auth-test');
      await generator.generate(projectDir);

      // Verify auth pages
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(auth)/login/page.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(auth)/register/page.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(auth)/layout.tsx'))).toBe(true);

      // Verify auth components
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/auth/login-form.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/auth/register-form.tsx'))).toBe(true);

      // Verify password reset pages (enabled)
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(auth)/forgot-password/page.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(auth)/reset-password/page.tsx'))).toBe(true);

      // Verify protected routes (dashboard now in (protected) route group)
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(protected)/dashboard/page.tsx'))).toBe(true);
    });

    it('should generate OAuth components when OAuth providers enabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-oauth-test',
        packageManager: 'npm',
        appScheme: 'weboauthtest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: true, apple: true, github: true },
            emailVerification: true,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'custom',
        customized: true,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-oauth-test');
      await generator.generate(projectDir);

      // Verify OAuth components
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/auth/oauth-buttons.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/auth/callback/route.ts'))).toBe(true);

      // Verify email verification page
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(auth)/verify-email/page.tsx'))).toBe(true);
    });

    // Note: Session pages are included as part of web auth feature.
    // They are generated when authentication is enabled (sessionManagement flag is for runtime behavior).
    it('should generate session management pages when auth enabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-sessions-test',
        packageManager: 'npm',
        appScheme: 'websessionstest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-sessions-test');
      await generator.generate(projectDir);

      // Verify session management pages (in (protected) route group)
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(protected)/settings/sessions/page.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app/(protected)/settings/sessions/sessions-client.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/settings/session-card.tsx'))).toBe(true);
    });
  });

  describe('React 19 patterns (useActionState, no Zustand auth store)', () => {
    it('should NOT generate deleted auth store files', async () => {
      const config: ProjectConfig = {
        projectName: 'web-no-store-test',
        packageManager: 'npm',
        appScheme: 'webnostoretest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: true,
            passwordReset: true,
            twoFactor: true,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'custom',
        customized: true,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-no-store-test');
      await generator.generate(projectDir);

      // Verify deleted files are NOT generated
      expect(await fs.pathExists(path.join(projectDir, 'web/src/store/auth.store.ts'))).toBe(false);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/auth/auth-hydrator.tsx'))).toBe(false);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/hooks/use-session.ts'))).toBe(false);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/auth/protected-route.tsx'))).toBe(false);

      // Verify submit-button IS generated
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/submit-button.tsx'))).toBe(true);

      // Verify login-form uses useActionState, not useAuthStore
      const loginForm = await fs.readFile(path.join(projectDir, 'web/src/components/auth/login-form.tsx'), 'utf-8');
      expect(loginForm).toContain('useActionState');
      expect(loginForm).not.toContain('useAuthStore');
    });

    it('should NOT include zustand when auth enabled but sessionManagement disabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-no-zustand-test',
        packageManager: 'npm',
        appScheme: 'webnozustandtest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: false,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-no-zustand-test');
      await generator.generate(projectDir);

      const packageJson = await fs.readJSON(path.join(projectDir, 'web/package.json'));
      expect(packageJson.dependencies.zustand).toBeUndefined();
    });

    it('should include zustand when sessionManagement enabled', async () => {
      const config: ProjectConfig = {
        projectName: 'web-zustand-test',
        packageManager: 'npm',
        appScheme: 'webzustandtest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-zustand-test');
      await generator.generate(projectDir);

      const packageJson = await fs.readJSON(path.join(projectDir, 'web/package.json'));
      expect(packageJson.dependencies.zustand).toBeDefined();
    });
  });

  describe('web UI components', () => {
    it('should generate all shadcn UI components', async () => {
      const config: ProjectConfig = {
        projectName: 'web-ui-test',
        packageManager: 'npm',
        appScheme: 'webuitest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-ui-test');
      await generator.generate(projectDir);

      // Verify UI components
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/button.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/input.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/label.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/card.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/skeleton.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/ui/spinner.tsx'))).toBe(true);

      // Verify theme components
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/providers/theme-provider.tsx'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/src/components/theme-toggle.tsx'))).toBe(true);

      // Verify lib utilities
      expect(await fs.pathExists(path.join(projectDir, 'web/src/lib/utils.ts'))).toBe(true);
    });

    it('should generate globals.css with dark mode support', async () => {
      const config: ProjectConfig = {
        projectName: 'web-css-test',
        packageManager: 'npm',
        appScheme: 'webcsstest',
        platforms: ['web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'web-css-test');
      await generator.generate(projectDir);

      const cssPath = path.join(projectDir, 'web/src/app/globals.css');
      expect(await fs.pathExists(cssPath)).toBe(true);

      const cssContent = await fs.readFile(cssPath, 'utf-8');
      // Verify dark mode classes
      expect(cssContent).toContain('.dark');
      expect(cssContent).toContain('--background');
      expect(cssContent).toContain('--foreground');
    });
  });

  describe('web + mobile dual platform', () => {
    it('should generate both web and mobile directories', async () => {
      const config: ProjectConfig = {
        projectName: 'dual-platform-test',
        packageManager: 'npm',
        appScheme: 'dualplatform',
        platforms: ['mobile', 'web'],
        features: {
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
          authentication: {
            enabled: true,
            providers: { emailPassword: true, google: false, apple: false, github: false },
            emailVerification: false,
            passwordReset: true,
            twoFactor: false,
          },
          paywall: false,
          sessionManagement: true,
        },
        integrations: {
          revenueCat: { enabled: false, iosKey: '', androidKey: '' },
          adjust: { enabled: false, appToken: '', environment: 'sandbox' },
          scate: { enabled: false, apiKey: '' },
          att: { enabled: false },
        },
        backend: {
          database: 'postgresql',
          orm: 'prisma',
          eventQueue: false,
          docker: true,
        },
        preset: 'minimal',
        customized: false,
      };

      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'dual-platform-test');
      await generator.generate(projectDir);

      // Verify both platforms exist
      expect(await fs.pathExists(path.join(projectDir, 'mobile'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'backend'))).toBe(true);

      // Verify mobile structure
      expect(await fs.pathExists(path.join(projectDir, 'mobile/app'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'mobile/package.json'))).toBe(true);

      // Verify web structure
      expect(await fs.pathExists(path.join(projectDir, 'web/src/app'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'web/package.json'))).toBe(true);
    });
  });
});
