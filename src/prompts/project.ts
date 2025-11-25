import inquirer from 'inquirer';

export async function promptProjectName(
  providedName: string | undefined
): Promise<string> {
  // If name was provided via CLI argument, use it
  if (providedName) {
    return providedName;
  }

  // Otherwise, prompt for it
  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project name?',
      default: 'my-fullstack-app',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Project name cannot be empty';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Project name must contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      },
    },
  ]);

  return projectName;
}
