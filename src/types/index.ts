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

export interface ProjectConfig {
  // Project metadata
  projectName: string;
  packageManager: 'npm' | 'yarn' | 'bun';

  // Deep link scheme for OAuth callbacks (derived from projectName)
  appScheme: string;

  // Platforms to generate (mobile = Expo, web = Next.js)
  platforms: Platform[];

  // Feature flags
  features: {
    onboarding: {
      enabled: boolean;
      pages: number; // 1-5
      skipButton: boolean;
      showPaywall: boolean;
    };
    authentication: {
      enabled: boolean;
      providers: {
        emailPassword: boolean; // Always true when auth enabled
        google: boolean;
        apple: boolean;
        github: boolean;
      };
      emailVerification: boolean;
      passwordReset: boolean;
      twoFactor: boolean;
    };
    paywall: boolean;
    sessionManagement: boolean;
  };

  // SDK integrations
  integrations: {
    revenueCat: {
      enabled: boolean;
      iosKey: string;
      androidKey: string;
    };
    adjust: {
      enabled: boolean;
      appToken: string;
      environment: 'sandbox' | 'production';
    };
    scate: {
      enabled: boolean;
      apiKey: string;
    };
    att: {
      enabled: boolean;
    };
  };

  // Backend configuration
  backend: {
    database: 'postgresql';
    orm: ORMChoice;
    eventQueue: boolean;
    docker: boolean;
  };

  // Preset information
  preset?: 'minimal' | 'full-featured' | 'analytics-focused' | 'custom';
  customized: boolean;

  // AI coding tools (determines which guideline files are generated)
  aiTools: AITool[];
}

export interface PresetDefinition {
  name: string;
  description: string;
  icon: string;
  config: Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'>;
}

/**
 * Derives a valid URL scheme from the project name
 * - Converts to lowercase
 * - Removes all non-alphanumeric characters
 * - Ensures it starts with a letter (required by iOS/Android)
 * - Falls back to "app" if result is empty
 */
export function deriveAppScheme(projectName: string): string {
  // Handle undefined or empty project name
  if (!projectName) {
    return 'app';
  }

  // Remove non-alphanumeric characters and convert to lowercase
  let scheme = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // URL schemes must start with a letter
  if (scheme && !/^[a-z]/.test(scheme)) {
    scheme = 'app' + scheme;
  }

  // Fallback if empty
  if (!scheme) {
    scheme = 'app';
  }

  return scheme;
}

export interface CLIOptions {
  template?: string;
  defaults?: boolean;
  verbose?: boolean;
}
