import inquirer from 'inquirer';

export async function promptFeatures(): Promise<any> {
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'features',
      message: 'Select features to include:',
      choices: [
        {
          name: 'Onboarding Flow - Multi-step user onboarding',
          value: 'onboarding',
          checked: true,
        },
        {
          name: 'Authentication - JWT-based auth with backend',
          value: 'authentication',
          checked: true,
        },
        {
          name: 'Subscription Paywall - RevenueCat integration',
          value: 'paywall',
          checked: false,
        },
        {
          name: 'Session Management - Device session tracking',
          value: 'sessionManagement',
          checked: true,
        },
      ],
    },
  ]);

  return {
    onboarding: {
      enabled: answers.features.includes('onboarding'),
      pages: 3, // Will be configured later if enabled
      skipButton: false,
      showPaywall: false,
    },
    authentication: answers.features.includes('authentication'),
    paywall: answers.features.includes('paywall'),
    sessionManagement: answers.features.includes('sessionManagement'),
  };
}
