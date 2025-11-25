import { execa } from 'execa';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';

/**
 * Install dependencies in a project directory
 */
export async function installDependencies(
  packageManager: 'npm' | 'yarn' | 'bun',
  targetDir: string,
  onProgress: (message: string) => void
): Promise<void> {
  // Install mobile dependencies
  const mobilePath = path.join(targetDir, 'mobile');
  if (await fs.pathExists(path.join(mobilePath, 'package.json'))) {
    onProgress('Installing mobile dependencies...');
    await installInDirectory(packageManager, mobilePath);
  }

  // Install backend dependencies
  const backendPath = path.join(targetDir, 'backend');
  if (await fs.pathExists(path.join(backendPath, 'package.json'))) {
    onProgress('Installing backend dependencies...');
    await installInDirectory(packageManager, backendPath);
  }

  // Install root dependencies (if package.json exists)
  const rootPkgPath = path.join(targetDir, 'package.json');
  if (await fs.pathExists(rootPkgPath)) {
    onProgress('Installing root dependencies...');
    await installInDirectory(packageManager, targetDir);
  }
}

/**
 * Install dependencies in a specific directory
 */
async function installInDirectory(
  packageManager: 'npm' | 'yarn' | 'bun',
  dir: string
): Promise<void> {
  const command = packageManager === 'npm' ? 'npm' : packageManager === 'yarn' ? 'yarn' : 'bun';
  const args = packageManager === 'npm' ? ['install'] : packageManager === 'yarn' ? [] : ['install'];

  try {
    await execa(command, args, {
      cwd: dir,
      stdio: 'pipe',
    });
  } catch (error: any) {
    console.error(chalk.red(`\nFailed to install dependencies in ${dir}`));
    throw new Error(`Dependency installation failed: ${error.message}`);
  }
}
