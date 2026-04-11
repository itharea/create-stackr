import inquirer from 'inquirer';
import type { AuthServiceConfig } from '../types/index.js';

/**
 * Prompt for the auth service's configuration (providers, 2FA, email
 * verification, admin dashboard, additional user fields).
 *
 * Phase 2: only called when the user enabled auth in the main flow.
 * Returns a fully populated `AuthServiceConfig`. `provisioningTargets` is
 * filled in by the orchestrator after all services are known.
 */
export async function promptAuthServiceConfig(): Promise<AuthServiceConfig> {
  const providerAnswers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'oauthProviders',
      message: 'Select OAuth providers:',
      choices: [
        { name: 'Google', value: 'google' },
        { name: 'Apple', value: 'apple' },
        { name: 'GitHub', value: 'github' },
      ],
    },
    {
      type: 'checkbox',
      name: 'authFeatures',
      message: 'Select additional auth features:',
      choices: [
        { name: 'Email verification', value: 'emailVerification' },
        { name: 'Password reset', value: 'passwordReset', checked: true },
        { name: 'Two-factor authentication', value: 'twoFactor' },
      ],
    },
    {
      type: 'confirm',
      name: 'adminDashboard',
      message: 'Include Next.js admin dashboard for the auth service?',
      default: false,
    },
  ]);

  return {
    providers: {
      emailPassword: true,
      google: providerAnswers.oauthProviders.includes('google'),
      apple: providerAnswers.oauthProviders.includes('apple'),
      github: providerAnswers.oauthProviders.includes('github'),
    },
    emailVerification: providerAnswers.authFeatures.includes('emailVerification'),
    passwordReset: providerAnswers.authFeatures.includes('passwordReset'),
    twoFactor: providerAnswers.authFeatures.includes('twoFactor'),
    adminDashboard: providerAnswers.adminDashboard,
    additionalUserFields: [],
    provisioningTargets: [],
  };
}
