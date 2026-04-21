import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ejs from 'ejs';
import { globby } from 'globby';
import { TEMPLATE_DIR, shouldIncludeProjectFile } from '../utils/template.js';
import { saveStackrConfig } from '../utils/config-file.js';
import { initializeGit } from '../utils/git.js';
import { cleanup } from '../utils/cleanup.js';
import type { InitConfig } from '../types/index.js';
import { AI_TOOL_FILES } from '../types/index.js';
import { ServiceGenerator } from './service.js';
import { buildServiceContext, buildStackrConfig } from './service-context.js';
import { renderDockerCompose } from './docker-compose.js';
import { renderDockerComposeTest } from './docker-compose-test.js';
import { writeEnvFilesWithCredentials } from './env-files.js';
import { readStackrVersion } from '../utils/version.js';
import { computeTestPorts } from '../utils/port-allocator.js';
import {
  generateServiceCredentials,
  type ServiceCredentials,
} from '../utils/credentials.js';

/**
 * Orchestrates full-project generation for `create-stackr`.
 *
 * Steps (from `plans/meta_phases.md` §6 generator split):
 *   1. ensureDir(targetDir)
 *   2. Render project-shell templates once (README, DESIGN, scripts,
 *      .env.example, .gitignore)
 *   3. For each service: ServiceGenerator.generate(targetDir)
 *   4. Render + write docker-compose.yml + docker-compose.prod.yml
 *   5. Save stackr.config.json
 *   6. Generate AI tool files
 *   7. Make scripts executable
 *   8. Initialize git
 */
export class MonorepoGenerator {
  private targetDir: string = '';

  constructor(private readonly initConfig: InitConfig, private readonly options: { verbose?: boolean } = {}) {}

  async generate(targetDir: string): Promise<void> {
    this.targetDir = targetDir;

    try {
      if (await fs.pathExists(targetDir)) {
        throw new Error(`Directory "${path.basename(targetDir)}" already exists`);
      }

      await fs.ensureDir(targetDir);

      // 1. Monorepo root files
      await this.renderMonorepoRoot();

      // 2. Per-service generation. Test-infra ports are computed once per
      //    monorepo so every service sees the same +10000 assignments.
      //    Credentials are generated UPFRONT (before rendering) so each
      //    service's `.env.test` can embed the same literal values the
      //    root `.env` will publish — dotenv doesn't expand `${VAR}`.
      const testPorts = computeTestPorts(this.initConfig.services);
      const credentialsByService = new Map<string, ServiceCredentials>();
      for (const svc of this.initConfig.services) {
        credentialsByService.set(svc.name, generateServiceCredentials());
      }
      for (const svc of this.initConfig.services) {
        const ctx = buildServiceContext(
          this.initConfig,
          svc,
          testPorts,
          credentialsByService
        );
        await new ServiceGenerator(ctx).generate(targetDir);
      }

      // 3. Docker compose files
      const stackrConfig = buildStackrConfig(this.initConfig);
      const devCompose = renderDockerCompose(stackrConfig, 'dev');
      const prodCompose = renderDockerCompose(stackrConfig, 'prod');
      await fs.writeFile(path.join(targetDir, 'docker-compose.yml'), devCompose);
      await fs.writeFile(path.join(targetDir, 'docker-compose.prod.yml'), prodCompose);

      // 3a. Test compose — emitted only when at least one service opts in
      //     (backend.tests === true). --no-tests at init leaves this off.
      if (stackrConfig.services.some((s) => s.backend.tests)) {
        const testCompose = renderDockerComposeTest(stackrConfig);
        await fs.writeFile(
          path.join(targetDir, 'docker-compose.test.yml'),
          testCompose
        );
      }

      // 3b. Write real .env files with strong random credentials. Each
      //     service gets fresh Postgres / Redis / BetterAuth secrets that
      //     land in BOTH the root .env (where docker-compose reads them
      //     to start the db / redis containers and to build the backend
      //     service environments) and the service's own backend/.env
      //     (used when running a backend locally without docker). The
      //     committed .env.example files are left untouched — they ship
      //     with human-readable placeholder values as documentation.
      //     This restores the v0.4 behaviour that was lost when the
      //     multi-microservice refactor dropped `setup.sh`'s inline
      //     openssl-rand credential generation.
      await writeEnvFilesWithCredentials({
        targetDir,
        serviceNames: this.initConfig.services.map((s) => s.name),
        credentialsByService,
      });

      // 4. stackr.config.json
      await saveStackrConfig(targetDir, stackrConfig);

      // 5. AI tool guideline files (claude/cursor/codex/windsurf)
      await this.generateAIToolFiles();

      // 6. Make scripts executable (setup.sh, docker-dev.sh, docker-prod.sh)
      await this.makeScriptsExecutable();

      // 7. Initialize git
      await this.initializeGit();
    } catch (err) {
      await this.handleError(err);
      throw err;
    }
  }

  /**
   * Copy project-shell templates into the project root. These are the
   * files rendered ONCE per project (README, DESIGN, scripts,
   * .env.example, .gitignore, etc.) — not per service.
   *
   * Context is a thin wrapper around initConfig with the service list
   * exposed so EJS templates can loop over `services`.
   */
  private async renderMonorepoRoot(): Promise<void> {
    const rootCtx = {
      projectName: this.initConfig.projectName,
      packageManager: this.initConfig.packageManager,
      orm: this.initConfig.orm,
      appScheme: this.initConfig.appScheme,
      aiTools: this.initConfig.aiTools,
      services: this.initConfig.services,
      preset: this.initConfig.preset,
      // Pinned to the current CLI version so `templates/project/package.json.ejs`
      // can emit a `devDependency` on `create-stackr@^<version>` and the
      // generated project can run `npx stackr add service …` post-install.
      stackrVersion: readStackrVersion(),
    };

    const subtrees = ['project'];
    for (const subtree of subtrees) {
      const subtreeAbsolute = path.join(TEMPLATE_DIR, subtree);
      if (!(await fs.pathExists(subtreeAbsolute))) {
        continue;
      }

      const files = await globby(`${subtree}/**/*`, {
        cwd: TEMPLATE_DIR,
        dot: true,
        onlyFiles: true,
        ignore: ['**/node_modules/**'],
      });

      for (const file of files) {
        if (!shouldIncludeProjectFile(file, { services: this.initConfig.services })) {
          continue;
        }

        // Strip the `project/` prefix so the file lands at the
        // project root. Remove `.ejs` if present.
        let rel = file.slice(`${subtree}/`.length);
        if (rel.endsWith('.ejs')) {
          rel = rel.slice(0, -4);
        }

        const destPath = path.join(this.targetDir, rel);
        await fs.ensureDir(path.dirname(destPath));

        if (file.endsWith('.ejs')) {
          const content = await fs.readFile(path.join(TEMPLATE_DIR, file), 'utf-8');
          const rendered = ejs.render(content, rootCtx);
          await fs.writeFile(destPath, rendered);
        } else {
          await fs.copy(path.join(TEMPLATE_DIR, file), destPath);
        }
      }
    }

    // Also copy `templates/shared/.gitignore.ejs` if it still exists from
    // phase 1 as the canonical root `.gitignore`. Phase 2 ships a root-level
    // version under `project/` once created, but we keep this as a
    // fallback so nothing goes missing if the move is incomplete.
    const sharedGitignore = path.join(TEMPLATE_DIR, 'shared/.gitignore.ejs');
    const rootGitignore = path.join(this.targetDir, '.gitignore');
    if ((await fs.pathExists(sharedGitignore)) && !(await fs.pathExists(rootGitignore))) {
      const content = await fs.readFile(sharedGitignore, 'utf-8');
      const rendered = ejs.render(content, rootCtx);
      await fs.writeFile(rootGitignore, rendered);
    }
  }

  private async generateAIToolFiles(): Promise<void> {
    if (!this.initConfig.aiTools || this.initConfig.aiTools.length === 0) {
      return;
    }

    const templatePath = path.join(TEMPLATE_DIR, 'shared/AGENTS.md.ejs');
    if (!(await fs.pathExists(templatePath))) {
      return;
    }
    const templateContent = await fs.readFile(templatePath, 'utf-8');

    for (const tool of this.initConfig.aiTools) {
      const fileName = AI_TOOL_FILES[tool];
      const rendered = ejs.render(templateContent, {
        projectName: this.initConfig.projectName,
        packageManager: this.initConfig.packageManager,
        orm: this.initConfig.orm,
        services: this.initConfig.services,
        aiTools: this.initConfig.aiTools,
        guidelineFileName: fileName,
      });
      await fs.writeFile(path.join(this.targetDir, fileName), rendered);
    }
  }

  private async makeScriptsExecutable(): Promise<void> {
    const scriptNames = ['setup.sh', 'docker-dev.sh', 'docker-prod.sh', 'test-e2e.sh'];
    for (const name of scriptNames) {
      const scriptPath = path.join(this.targetDir, 'scripts', name);
      try {
        if (await fs.pathExists(scriptPath)) {
          await fs.chmod(scriptPath, 0o755);
        }
      } catch {
        console.log(
          chalk.yellow(`\n⚠️  Could not chmod ${scriptPath}; run it manually.`)
        );
      }
    }
  }

  private async initializeGit(): Promise<void> {
    try {
      await initializeGit(this.targetDir);
    } catch {
      console.log(chalk.yellow('\n⚠️  Git initialization failed. You can initialize it manually.'));
    }
  }

  private async handleError(err: unknown): Promise<void> {
    console.error(chalk.red('\n❌ Project generation failed'));
    console.error(chalk.gray(`   Error: ${(err as Error).message}\n`));
    await cleanup(this.targetDir);
  }

  // Accessor for verbose flag (hook for future progress UI).
  get verbose(): boolean {
    return Boolean(this.options.verbose);
  }
}
