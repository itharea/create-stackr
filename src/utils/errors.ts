import chalk from 'chalk';
import boxen from 'boxen';

export class ProjectGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly hints?: string[],
    public readonly recovery?: string[]
  ) {
    super(message);
    this.name = 'ProjectGenerationError';
  }
}

export function displayError(error: ProjectGenerationError | Error): void {
  console.error();

  if (error instanceof ProjectGenerationError) {
    // Enhanced error with hints
    console.error(chalk.red.bold('❌ Error:'), chalk.red(error.message));

    if (error.cause) {
      console.error(chalk.gray('\n   Caused by:'), chalk.gray(error.cause.message));
    }

    if (error.hints && error.hints.length > 0) {
      console.error(chalk.yellow('\n💡 Hints:'));
      error.hints.forEach((hint) => {
        console.error(chalk.yellow(`   • ${hint}`));
      });
    }

    if (error.recovery && error.recovery.length > 0) {
      console.error(chalk.cyan('\n🔧 To recover:'));
      error.recovery.forEach((step, i) => {
        console.error(chalk.cyan(`   ${i + 1}. ${step}`));
      });
    }
  } else {
    // Standard error
    console.error(chalk.red.bold('❌ Error:'), chalk.red(error.message));
  }

  console.error();
}

/**
 * Common error scenarios with helpful messages
 */
export const errors = {
  directoryExists: (name: string) =>
    new ProjectGenerationError(
      `Directory "${name}" already exists`,
      undefined,
      [
        'Choose a different project name',
        'Remove the existing directory if you want to recreate it',
      ],
      [`rm -rf ${name}`, `npx create-fullstack-app ${name}-v2`]
    ),

  invalidProjectName: (name: string, reason: string) =>
    new ProjectGenerationError(
      `Invalid project name: "${name}"`,
      undefined,
      [
        reason,
        'Use only lowercase letters, numbers, and hyphens',
        'Must be 1-214 characters long',
      ],
      ['Choose a valid name (e.g., my-fullstack-app)']
    ),

  configValidationFailed: (errors: string[]) =>
    new ProjectGenerationError(
      'Configuration validation failed',
      undefined,
      errors,
      ['Run the CLI again and choose valid options']
    ),

  templateNotFound: (template: string) =>
    new ProjectGenerationError(
      `Template not found: ${template}`,
      undefined,
      [
        'This is likely a bug in create-fullstack-app',
        'Please report this issue on GitHub',
      ],
      [
        'Try running: npx create-fullstack-app@latest',
        'Open an issue: https://github.com/yourusername/create-fullstack-app/issues',
      ]
    ),

  templateRenderFailed: (file: string, cause: Error) =>
    new ProjectGenerationError(
      `Failed to render template: ${file}`,
      cause,
      [
        'Template rendering error (EJS syntax issue)',
        'This is likely a bug in create-fullstack-app',
      ],
      ['Please report this issue on GitHub']
    ),

  fileCopyFailed: (src: string, dest: string, cause: Error) =>
    new ProjectGenerationError(
      `Failed to copy file: ${src} → ${dest}`,
      cause,
      [
        'Check file system permissions',
        'Ensure you have write access to the target directory',
      ],
      ['Try running with sudo (not recommended)', 'Check disk space availability']
    ),

  dependencyInstallFailed: (packageManager: string, dir: string) =>
    new ProjectGenerationError(
      'Dependency installation failed',
      undefined,
      [
        `${packageManager} install command failed`,
        'Your project was created but dependencies failed to install',
        'You can install them manually',
      ],
      [
        `cd ${dir}/mobile && ${packageManager} install`,
        `cd ${dir}/backend && ${packageManager} install`,
      ]
    ),

  gitInitFailed: (cause: Error) =>
    new ProjectGenerationError(
      'Git initialization failed',
      cause,
      [
        'Your project was created successfully',
        'But git repository initialization failed (non-critical)',
      ],
      ['Initialize git manually: git init', 'Check if git is installed: git --version']
    ),

  nodeVersionTooLow: (current: string, required: string) =>
    new ProjectGenerationError(
      `Node.js version too low: ${current} (required: >=${required})`,
      undefined,
      ['create-fullstack-app requires Node.js 18.0.0 or higher'],
      [
        'Install nvm: https://github.com/nvm-sh/nvm',
        `Install Node.js: nvm install ${required}`,
        'Or download from: https://nodejs.org/',
      ]
    ),

  diskSpaceError: () =>
    new ProjectGenerationError(
      'Insufficient disk space',
      undefined,
      ['Full-stack projects require ~500MB of space (with dependencies)'],
      ['Free up disk space', 'Try generating with --skip-install flag']
    ),

  networkError: (operation: string) =>
    new ProjectGenerationError(
      `Network error during ${operation}`,
      undefined,
      [
        'Check your internet connection',
        'Some firewalls/proxies block npm registry',
        'You can retry with --skip-install and install manually',
      ],
      [
        'Check network: ping registry.npmjs.org',
        'Configure npm proxy if needed: npm config set proxy http://proxy:port',
        'Retry with --skip-install flag',
      ]
    ),

  packageManagerNotFound: (pm: string) =>
    new ProjectGenerationError(
      `Package manager "${pm}" not found`,
      undefined,
      [
        `${pm} is not installed on your system`,
        'Install it or choose a different package manager',
      ],
      [
        pm === 'npm' ? 'npm comes with Node.js - reinstall Node.js' : `Install ${pm}: npm install -g ${pm}`,
        'Or run the CLI again and choose a different package manager',
      ]
    ),
};

/**
 * Display a warning (non-fatal)
 */
export function displayWarning(message: string, details?: string[]): void {
  console.warn();
  console.warn(chalk.yellow.bold('⚠️  Warning:'), chalk.yellow(message));

  if (details && details.length > 0) {
    details.forEach((detail) => {
      console.warn(chalk.gray(`   ${detail}`));
    });
  }

  console.warn();
}

/**
 * Display success message with box
 */
export function displaySuccess(message: string, details?: string[]): void {
  const content = [
    chalk.green.bold('✨ ' + message),
    '',
    ...(details || []).map(d => chalk.gray(d)),
  ].join('\n');

  console.log();
  console.log(
    boxen(content, {
      padding: 1,
      borderColor: 'green',
      borderStyle: 'round',
    })
  );
  console.log();
}
