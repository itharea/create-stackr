import inquirer from 'inquirer';
import type { Platform } from '../types/index.js';

export async function promptPlatforms(): Promise<Platform[]> {
  const { platforms } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platforms',
      message: 'Which platforms do you want to generate?',
      choices: [
        { name: 'Mobile (Expo/React Native)', value: 'mobile', checked: true },
        { name: 'Web (Next.js)', value: 'web', checked: true },
      ],
    },
  ]);

  // Ensure at least one platform is selected
  if (platforms.length === 0) {
    console.log('At least one platform is required. Defaulting to both platforms.');
    return ['mobile', 'web'];
  }

  return platforms;
}
