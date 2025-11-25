import inquirer from 'inquirer';

export async function promptPackageManager(): Promise<'npm' | 'yarn' | 'bun'> {
  const { packageManager } = await inquirer.prompt([
    {
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager do you want to use?',
      choices: [
        { name: 'npm', value: 'npm' },
        { name: 'yarn', value: 'yarn' },
        { name: 'bun', value: 'bun' },
      ],
      default: 'npm',
    },
  ]);

  return packageManager;
}
