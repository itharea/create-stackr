import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { copyTemplateFiles } from '../utils/copy.js';
import { generateOnboardingPages } from './onboarding.js';
import { installDependencies } from '../utils/install.js';
import { initializeGit } from '../utils/git.js';
import { cleanup } from '../utils/cleanup.js';
import type { ProjectConfig } from '../types/index.js';

interface GeneratorConfig extends ProjectConfig {
  skipInstall?: boolean;
  verbose?: boolean;
}

/**
 * Main project generator class
 * Orchestrates the entire project generation pipeline
 */
export class ProjectGenerator {
  private targetDir: string = '';

  constructor(private config: GeneratorConfig) {}

  /**
   * Main generation pipeline
   */
  async generate(targetDir: string): Promise<void> {
    this.targetDir = targetDir;

    try {
      // Step 1: Validate target directory doesn't exist
      if (await fs.pathExists(targetDir)) {
        throw new Error(`Directory "${path.basename(targetDir)}" already exists`);
      }

      // Step 2: Create base directory
      await fs.ensureDir(targetDir);

      // Step 3: Copy and process all template files
      await this.copyTemplateFiles();

      // Step 4: Generate dynamic files (onboarding pages 4-5 if needed)
      await this.generateDynamicFiles();

      // Step 5: Install dependencies (optional, can be slow)
      if (!this.config.skipInstall) {
        await this.installDependencies();
      }

      // Step 6: Initialize git repository
      await this.initializeGit();

      // Success!
      console.log(chalk.green('\n✨ Project generated successfully!\n'));
    } catch (error) {
      // Handle error and cleanup
      await this.handleError(error);
      throw error;
    }
  }

  /**
   * Copy all template files
   * Uses existing utility from src/utils/copy.ts
   */
  private async copyTemplateFiles(): Promise<void> {
    const spinner = ora('Copying template files...').start();

    try {
      // This utility already handles:
      // - Finding all template files
      // - Checking shouldIncludeFile() for each
      // - Rendering EJS templates with config
      // - Mapping paths correctly
      // - Creating directories as needed
      await copyTemplateFiles(this.targetDir, this.config);
      spinner.succeed('Template files copied');
    } catch (error) {
      spinner.fail('Failed to copy template files');
      throw error;
    }
  }

  /**
   * Generate dynamic files (onboarding pages 4-5 if needed)
   */
  private async generateDynamicFiles(): Promise<void> {
    // Only generate if onboarding is enabled AND pages > 3
    if (!this.config.features.onboarding.enabled) {
      return;
    }

    const { pages } = this.config.features.onboarding;
    if (pages <= 3) {
      return; // Templates handle pages 1-3
    }

    const spinner = ora(`Generating onboarding pages 4-${pages}...`).start();

    try {
      // This will create pages 4-5 and update _layout.tsx
      await generateOnboardingPages(this.config, this.targetDir);
      spinner.succeed(`Onboarding pages 1-${pages} generated`);
    } catch (error) {
      spinner.fail('Failed to generate onboarding pages');
      throw error;
    }
  }

  /**
   * Install dependencies
   */
  private async installDependencies(): Promise<void> {
    const spinner = ora('Installing dependencies (this may take a few minutes)...').start();

    try {
      await installDependencies(
        this.config.packageManager,
        this.targetDir,
        (message: string) => {
          spinner.text = message;
        }
      );
      spinner.succeed('Dependencies installed');
    } catch {
      spinner.fail('Failed to install dependencies');
      // Don't throw - project is still usable, user can install manually
      console.log(
        chalk.yellow('\n⚠️  Dependency installation failed. You can install them manually later.')
      );
    }
  }

  /**
   * Initialize git repository
   */
  private async initializeGit(): Promise<void> {
    const spinner = ora('Initializing git repository...').start();

    try {
      await initializeGit(this.targetDir);
      spinner.succeed('Git repository initialized');
    } catch {
      spinner.fail('Failed to initialize git');
      // Don't throw - project is still usable
      console.log(chalk.yellow('\n⚠️  Git initialization failed. You can initialize it manually.'));
    }
  }

  /**
   * Handle generation errors
   */
  private async handleError(error: any): Promise<void> {
    console.error(chalk.red('\n❌ Project generation failed'));
    console.error(chalk.gray(`   Error: ${error.message}\n`));

    // Offer to clean up the partial project
    await cleanup(this.targetDir);
  }
}
