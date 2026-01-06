import inquirer from 'inquirer';

export interface AuthenticationConfig {
  enabled: boolean;
  providers: {
    emailPassword: boolean;
    google: boolean;
    apple: boolean;
    github: boolean;
  };
  emailVerification: boolean;
  passwordReset: boolean;
  twoFactor: boolean;
}

export async function promptFeatures(platforms: string[] = ['mobile', 'web']): Promise<any> {
  const hasMobile = platforms.includes('mobile');

  // Build choices based on platform
  const choices = [];

  // Only show onboarding for mobile
  if (hasMobile) {
    choices.push({
      name: 'Onboarding Flow - Multi-step user onboarding (mobile only)',
      value: 'onboarding',
      checked: true,
    });
  }

  // Authentication always available
  choices.push({
    name: 'Authentication - User authentication with BetterAuth',
    value: 'authentication',
    checked: true,
  });

  // Only show paywall for mobile
  if (hasMobile) {
    choices.push({
      name: 'Subscription Paywall - RevenueCat integration (mobile only)',
      value: 'paywall',
      checked: false,
    });
  }

  choices.push({
    name: 'Session Management - Anonymous device session tracking',
    value: 'sessionManagement',
    checked: true,
  });

  // First, ask about basic features
  const basicFeatures = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to include:',
      choices,
    },
  ]);

  const hasAuth = basicFeatures.features.includes('authentication');

  // Default auth config (used when auth is disabled)
  let authConfig: AuthenticationConfig = {
    enabled: false,
    providers: {
      emailPassword: true,
      google: false,
      apple: false,
      github: false,
    },
    emailVerification: false,
    passwordReset: false,
    twoFactor: false,
  };

  // If auth is enabled, ask about OAuth providers and features
  if (hasAuth) {
    const authDetails = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'providers',
        message: 'Select OAuth providers to enable:',
        choices: [
          { name: 'Google', value: 'google', checked: false },
          { name: 'Apple', value: 'apple', checked: false },
          { name: 'GitHub', value: 'github', checked: false },
        ],
      },
      {
        type: 'checkbox',
        name: 'authFeatures',
        message: 'Select additional auth features:',
        choices: [
          { name: 'Email Verification', value: 'emailVerification', checked: false },
          { name: 'Password Reset', value: 'passwordReset', checked: true },
          { name: 'Two-Factor Authentication (TOTP)', value: 'twoFactor', checked: false },
        ],
      },
    ]);

    authConfig = {
      enabled: true,
      providers: {
        emailPassword: true,
        google: authDetails.providers.includes('google'),
        apple: authDetails.providers.includes('apple'),
        github: authDetails.providers.includes('github'),
      },
      emailVerification: authDetails.authFeatures.includes('emailVerification'),
      passwordReset: authDetails.authFeatures.includes('passwordReset'),
      twoFactor: authDetails.authFeatures.includes('twoFactor'),
    };
  }

  return {
    onboarding: {
      enabled: hasMobile ? basicFeatures.features.includes('onboarding') : false,
      pages: 3, // Will be configured later if enabled
      skipButton: false,
      showPaywall: false,
    },
    authentication: authConfig,
    paywall: hasMobile ? basicFeatures.features.includes('paywall') : false,
    sessionManagement: basicFeatures.features.includes('sessionManagement'),
  };
}
