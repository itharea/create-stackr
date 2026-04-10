import fs from 'fs-extra';
import path from 'path';
import { globby } from 'globby';
import {
  TEMPLATE_DIR,
  renderTemplate,
  shouldIncludeFile,
  isTemplate,
  getDestinationPath,
} from './template.js';
import type { ServiceRenderContext } from '../types/index.js';

/**
 * Copy a subtree of templates into `<targetDir>/<service.name>/...`,
 * honouring `shouldIncludeFile(ctx)` and rendering EJS with the supplied
 * `ServiceRenderContext`.
 *
 * This is the generic service-scoped copy helper used by the phase-2
 * generators. Phase 1 had a single flat `copyTemplateFiles(ctx, targetDir)`
 * that walked every template at once; phase 2 calls this per subtree
 * (backend / mobile / web) with the same context.
 */
export async function copyServiceTemplateFiles(
  targetDir: string,
  ctx: ServiceRenderContext,
  subtreeRelativePath: string
): Promise<void> {
  const subtreeAbsolute = path.join(TEMPLATE_DIR, subtreeRelativePath);
  if (!(await fs.pathExists(subtreeAbsolute))) {
    return;
  }

  const files = await globby(`${subtreeRelativePath}/**/*`, {
    cwd: TEMPLATE_DIR,
    dot: true,
    onlyFiles: true,
    ignore: ['**/node_modules/**'],
  });

  for (const file of files) {
    if (!shouldIncludeFile(file, ctx)) {
      continue;
    }

    const destPath = getDestinationPath(file, targetDir, {
      serviceName: ctx.service.name,
    });

    await fs.ensureDir(path.dirname(destPath));

    if (isTemplate(file)) {
      const rendered = await renderTemplate(file, ctx as unknown as Record<string, unknown>);
      await fs.writeFile(destPath, rendered);
    } else {
      const fullSrc = path.join(TEMPLATE_DIR, file);
      await fs.copy(fullSrc, destPath);
    }
  }
}

/**
 * Copy a single file or directory (optionally rendering EJS).
 *
 * Retained for single-file copies (e.g., AGENTS.md); pass `undefined` as
 * the context when no templating is desired.
 */
export async function copyFile(
  src: string,
  dest: string,
  ctx?: ServiceRenderContext | Record<string, unknown>
): Promise<void> {
  await fs.ensureDir(path.dirname(dest));

  if (ctx && isTemplate(src)) {
    const rendered = await renderTemplate(src, ctx as Record<string, unknown>);
    await fs.writeFile(dest, rendered);
  } else {
    await fs.copy(src, dest);
  }
}
