import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { copyTemplateFiles } from '../utils/copy.js';
import { TEMPLATE_DIR } from '../utils/template.js';
import { generateOnboardingPages } from './onboarding.js';
import { initializeGit } from '../utils/git.js';
import { cleanup } from '../utils/cleanup.js';
import { saveStackrConfig } from '../utils/config-file.js';
import { readStackrVersion } from '../utils/version.js';
import type { ProjectConfig } from '../types/index.js';
import { AI_TOOL_FILES } from '../types/index.js';
import type { StackrConfigFile, ServiceEntry } from '../types/config-file.js';

interface GeneratorConfig extends ProjectConfig {
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

      // Step 4: Generate AI tool guideline files
      await this.generateAIToolFiles();

      // Step 5: Generate dynamic files (onboarding pages 4-5 if needed)
      await this.generateDynamicFiles();

      // Step 6: Make setup script executable
      await this.makeSetupScriptExecutable();

      // Step 7: Write stackr.config.json
      // MUST run before initializeGit() — initializeGit() runs
      // `git add . && git commit` in one step, so any file written after
      // it lands in the working tree untracked.
      await this.writeStackrConfig();

      // Step 8: Initialize git repository
      await this.initializeGit();
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
   * Generate AI tool guideline files based on user selection
   */
  private async generateAIToolFiles(): Promise<void> {
    if (!this.config.aiTools || this.config.aiTools.length === 0) {
      return;
    }

    const templatePath = path.join(TEMPLATE_DIR, 'shared/AGENTS.md.ejs');
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    for (const tool of this.config.aiTools) {
      const fileName = AI_TOOL_FILES[tool];
      const rendered = ejs.render(templateContent, {
        ...this.config,
        guidelineFileName: fileName,
      });
      await fs.writeFile(path.join(this.targetDir, fileName), rendered);
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
   * Make setup script executable
   */
  private async makeSetupScriptExecutable(): Promise<void> {
    const setupScriptPath = path.join(this.targetDir, 'scripts', 'setup.sh');

    try {
      if (await fs.pathExists(setupScriptPath)) {
        await fs.chmod(setupScriptPath, 0o755);
      }
    } catch {
      // Non-critical, user can chmod manually
      console.log(
        chalk.yellow('\n⚠️  Could not make setup.sh executable. Run: chmod +x ./scripts/setup.sh')
      );
    }
  }

  /**
   * Write the initial `stackr.config.json` at the project root.
   *
   * Phase 1 emits exactly one `'core'` service with `kind: 'base'`. Auth is
   * still embedded in `core/backend` (phase 2 will extract it), so
   * `authMiddleware` is deliberately `'none'` — the other three values
   * mean "forwarding to a peer auth service" per meta_phases.md §7, which
   * would be a lie for phase 1 projects.
   *
   * Integration toggles are copied field-by-field (`{ enabled }` only) —
   * the live `ProjectConfig.integrations` shape carries API keys
   * (iosKey, androidKey, appToken, apiKey) that MUST NEVER be serialized
   * into stackr.config.json, which is committed to git. A unit test
   * enforces this.
   */
  private async writeStackrConfig(): Promise<void> {
    const now = new Date().toISOString();
    const stackrVersion = readStackrVersion();

    const coreEntry: ServiceEntry = {
      name: 'core',
      kind: 'base',
      backend: {
        port: 8080,
        eventQueue: this.config.backend.eventQueue,
        imageUploads: false,
        // See JSDoc above: phase 1 does not forward to a peer auth service.
        authMiddleware: 'none',
      },
      web: this.config.platforms.includes('web') ? { enabled: true, port: 3000 } : null,
      mobile: this.config.platforms.includes('mobile') ? { enabled: true } : null,
      integrations: {
        revenueCat: { enabled: this.config.integrations.revenueCat.enabled },
        adjust: { enabled: this.config.integrations.adjust.enabled },
        scate: { enabled: this.config.integrations.scate.enabled },
        att: { enabled: this.config.integrations.att.enabled },
      },
      generatedAt: now,
      generatedBy: stackrVersion,
    };

    const cfg: StackrConfigFile = {
      version: 1,
      stackrVersion,
      projectName: this.config.projectName,
      createdAt: now,
      packageManager: this.config.packageManager,
      orm: this.config.backend.orm,
      aiTools: this.config.aiTools,
      appScheme: this.config.appScheme,
      services: [coreEntry],
    };

    await saveStackrConfig(this.targetDir, cfg);
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
