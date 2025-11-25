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
import type { ProjectConfig } from '../types/index.js';

/**
 * Copy all template files to target directory
 */
export async function copyTemplateFiles(
  targetDir: string,
  config: ProjectConfig
): Promise<void> {
  // Get all files from templates directory
  const files = await globby('**/*', {
    cwd: TEMPLATE_DIR,
    dot: true,
    ignore: ['**/node_modules/**'],
  });

  for (const file of files) {
    const fullPath = path.join(TEMPLATE_DIR, file);
    const stats = await fs.stat(fullPath);

    // Skip directories
    if (stats.isDirectory()) {
      continue;
    }

    // Check if file should be included
    if (!shouldIncludeFile(file, config)) {
      continue;
    }

    // Get destination path
    const destPath = getDestinationPath(file, targetDir);

    // Ensure destination directory exists
    await fs.ensureDir(path.dirname(destPath));

    // Process template or copy static file
    if (isTemplate(file)) {
      const rendered = await renderTemplate(file, config);
      await fs.writeFile(destPath, rendered);
    } else {
      await fs.copy(fullPath, destPath);
    }
  }
}

/**
 * Copy a single file or directory
 */
export async function copyFile(
  src: string,
  dest: string,
  config?: ProjectConfig
): Promise<void> {
  await fs.ensureDir(path.dirname(dest));

  if (config && isTemplate(src)) {
    const rendered = await renderTemplate(src, config);
    await fs.writeFile(dest, rendered);
  } else {
    await fs.copy(src, dest);
  }
}
