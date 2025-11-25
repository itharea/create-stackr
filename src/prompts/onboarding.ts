import inquirer from 'inquirer';

export async function promptOnboarding(
  hasRevenueCat: boolean
): Promise<{ pages: number; skipButton: boolean; showPaywall: boolean }> {
  // @ts-expect-error - inquirer types are too strict for our use case
  const answers: any = await inquirer.prompt([
    {
      type: 'number',
      name: 'pages',
      message: 'How many onboarding pages?',
      default: 3,
      validate: (input: number) => {
        if (input < 1 || input > 5) {
          return 'Please enter a number between 1 and 5';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'skipButton',
      message: 'Include skip button?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'showPaywall',
      message: 'Show paywall after onboarding?',
      default: false,
      when: () => hasRevenueCat,
    },
  ]);

  return {
    pages: answers.pages,
    skipButton: answers.skipButton,
    showPaywall: answers.showPaywall || false,
  };
}
