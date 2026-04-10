import fs from 'fs-extra';
import path from 'path';
import { globby } from 'globby';
import {
  TEMPLATE_DIR,
  renderTemplate,
  shouldIncludeFile,
  isTemplate,
  getDestinationPath,
} from '../utils/template.js';
import type { ServiceRenderContext } from '../types/index.js';
import { generateOnboardingPages } from './onboarding.js';

/**
 * Renders a single service subtree into `<targetDir>/<service.name>/...`.
 *
 * The service's template subtree is picked from `ctx.service.kind`:
 * - `'auth'` → `templates/services/auth/backend/**`
 * - `'base'` → `templates/services/base/backend/**`
 *
 * Mobile/web trees and feature/integration templates are layered on top
 * only when the service has `mobile.enabled` / `web.enabled`.
 *
 * Each file passes through `shouldIncludeFile(ctx)` before being rendered
 * via EJS with the full `ServiceRenderContext`.
 */
export class ServiceGenerator {
  constructor(private readonly ctx: ServiceRenderContext) {}

  async generate(targetDir: string): Promise<void> {
    const subtrees = this.pickSubtrees();

    for (const subtree of subtrees) {
      await this.copySubtree(targetDir, subtree);
    }

    // Dynamic onboarding page generation (pages 4-5) still applies when
    // onboarding is enabled and mobile is selected.
    if (this.ctx.service.mobile?.enabled && this.ctx.features.onboarding.enabled) {
      const pages = this.ctx.features.onboarding.pages;
      if (pages > 3) {
        await generateOnboardingPages(this.ctx, path.join(targetDir, this.ctx.service.name));
      }
    }
  }

  private pickSubtrees(): string[] {
    const service = this.ctx.service;
    const subtrees: string[] = [];

    if (service.kind === 'auth') {
      subtrees.push('services/auth/backend');
    } else {
      subtrees.push('services/base/backend');
    }

    if (service.mobile?.enabled) {
      subtrees.push('services/base/mobile');
      subtrees.push('features/mobile');
      subtrees.push('integrations/mobile');
    }

    if (service.web?.enabled) {
      subtrees.push('services/base/web');
      subtrees.push('features/web');
    }

    return subtrees;
  }

  private async copySubtree(targetDir: string, subtreeRelativePath: string): Promise<void> {
    const subtreeAbsolute = path.join(TEMPLATE_DIR, subtreeRelativePath);
    if (!(await fs.pathExists(subtreeAbsolute))) {
      return; // Optional subtrees (mobile / web) may be absent in some configs.
    }

    // Globby uses cwd-relative paths. We glob relative to the top-level
    // templates/ dir so `shouldIncludeFile` sees full repo-relative paths
    // like `services/base/backend/lib/constants.ts.ejs` — that's what its
    // predicates match against.
    const pattern = `${subtreeRelativePath}/**/*`;
    const files = await globby(pattern, {
      cwd: TEMPLATE_DIR,
      dot: true,
      onlyFiles: true,
      ignore: ['**/node_modules/**'],
    });

    for (const file of files) {
      if (!shouldIncludeFile(file, this.ctx)) {
        continue;
      }

      const destPath = getDestinationPath(file, targetDir, {
        serviceName: this.ctx.service.name,
      });

      await fs.ensureDir(path.dirname(destPath));

      if (isTemplate(file)) {
        const rendered = await renderTemplate(file, this.ctx as unknown as Record<string, unknown>);
        await fs.writeFile(destPath, rendered);
      } else {
        const fullSrc = path.join(TEMPLATE_DIR, file);
        await fs.copy(fullSrc, destPath);
      }
    }
  }
}
