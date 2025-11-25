export interface ProjectConfig {
  // Project metadata
  projectName: string;
  packageManager: 'npm' | 'yarn' | 'bun';

  // Feature flags
  features: {
    onboarding: {
      enabled: boolean;
      pages: number; // 1-5
      skipButton: boolean;
      showPaywall: boolean;
    };
    authentication: boolean;
    paywall: boolean;
    sessionManagement: boolean;
    tabs: boolean;
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
    eventQueue: boolean;
    docker: boolean;
  };

  // Preset information
  preset?: 'minimal' | 'full-featured' | 'analytics-focused' | 'custom';
  customized: boolean;
}

export interface PresetDefinition {
  name: string;
  description: string;
  icon: string;
  config: Omit<ProjectConfig, 'projectName' | 'packageManager'>;
}

export interface CLIOptions {
  template?: string;
  defaults?: boolean;
  verbose?: boolean;
  skipInstall?: boolean;
}
