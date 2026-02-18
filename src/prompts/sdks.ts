import inquirer from 'inquirer';
import type { ProjectConfig } from '../types/index.js';

export async function promptSDKs(): Promise<ProjectConfig['integrations']> {
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'sdks',
      message: 'Which analytics/monetization SDKs do you want?',
      choices: [
        {
          name: 'RevenueCat - In-app subscriptions & purchases',
          value: 'revenueCat',
        },
        {
          name: 'Adjust - Mobile attribution & analytics',
          value: 'adjust',
        },
        {
          name: 'Scate - User engagement & retention',
          value: 'scate',
        },
      ],
    },
  ]);

  return {
    revenueCat: {
      enabled: answers.sdks.includes('revenueCat'),
      iosKey: 'YOUR_IOS_API_KEY_HERE',
      androidKey: 'YOUR_ANDROID_API_KEY_HERE',
    },
    adjust: {
      enabled: answers.sdks.includes('adjust'),
      appToken: 'YOUR_ADJUST_APP_TOKEN_HERE',
      environment: 'sandbox' as const,
    },
    scate: {
      enabled: answers.sdks.includes('scate'),
      apiKey: 'YOUR_SCATE_API_KEY_HERE',
    },
    att: {
      enabled: false,
    },
  };
}
