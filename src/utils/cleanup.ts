import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';

/**
 * Clean up partial project on error
 */
export async function cleanup(targetDir: string): Promise<void> {
  // Check if directory exists
  if (!(await fs.pathExists(targetDir))) {
    return; // Nothing to clean up
  }

  // Ask user if they want to clean up
  const { shouldCleanup } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'shouldCleanup',
      message: 'Remove partially generated project?',
      default: true,
    },
  ]);

  if (shouldCleanup) {
    console.log(chalk.yellow('\n🗑️  Cleaning up...\n'));

    try {
      // Remove the entire project directory
      await fs.remove(targetDir);
      console.log(chalk.green('✓ Cleanup complete'));
    } catch {
      console.error(chalk.red('✗ Cleanup failed'));
      console.log(chalk.yellow(`⚠️  Please manually remove: ${targetDir}`));
    }
  } else {
    console.log(chalk.yellow(`\n⚠️  Partial project left at: ${targetDir}`));
    console.log(chalk.gray('You may need to manually clean up this directory\n'));
  }
}
