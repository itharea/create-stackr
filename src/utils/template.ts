import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { ProjectConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get template directory path
export const TEMPLATE_DIR = path.join(__dirname, '../../templates');

/**
 * Render an EJS template with configuration
 */
export async function renderTemplate(
  templatePath: string,
  config: ProjectConfig
): Promise<string> {
  const fullPath = path.join(TEMPLATE_DIR, templatePath);

  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const content = await fs.readFile(fullPath, 'utf-8');
  return ejs.render(content, config);
}

/**
 * Check if a file should be included based on configuration
 */
export function shouldIncludeFile(
  filePath: string,
  config: ProjectConfig
): boolean {
  // Skip .gitkeep files - they are only for version control
  if (filePath.endsWith('.gitkeep')) {
    return false;
  }

  // ==========================================================================
  // Platform-based filtering (consistent architecture)
  // ==========================================================================
  // All platform-specific content lives under /mobile/ or /web/ subdirectories:
  // - base/mobile/, features/mobile/, integrations/mobile/ → mobile platform
  // - base/web/, features/web/, integrations/web/ → web platform
  // - base/backend/, shared/ → always included (platform-agnostic)

  // Exclude mobile-specific content when mobile platform not selected
  if (filePath.includes('/mobile/') && !config.platforms.includes('mobile')) {
    return false;
  }

  // Exclude web-specific content when web platform not selected
  if (filePath.includes('/web/') && !config.platforms.includes('web')) {
    return false;
  }

  // Check if file is in a conditional directory
  if (filePath.includes('features/mobile/onboarding') && !config.features.onboarding.enabled) {
    return false;
  }

  // Auth check updated for new structure (mobile)
  if (filePath.includes('features/mobile/auth') && !config.features.authentication.enabled) {
    return false;
  }

  // Web auth check (mirrors mobile auth check)
  if (filePath.includes('features/web/auth') && !config.features.authentication.enabled) {
    return false;
  }

  // Email verification screens
  if (filePath.includes('verify-email') && !config.features.authentication.emailVerification) {
    return false;
  }

  // Password reset screens
  if (
    (filePath.includes('forgot-password') || filePath.includes('reset-password')) &&
    !config.features.authentication.passwordReset
  ) {
    return false;
  }

  // Two-factor screens (future scope)
  if (filePath.includes('two-factor') && !config.features.authentication.twoFactor) {
    return false;
  }

  if (filePath.includes('features/mobile/paywall') && !config.features.paywall) {
    return false;
  }

  // Note: Tabs templates are always included (not conditional)

  if (filePath.includes('integrations/mobile/revenuecat') && !config.integrations.revenueCat.enabled) {
    return false;
  }

  if (filePath.includes('integrations/mobile/adjust') && !config.integrations.adjust.enabled) {
    return false;
  }

  if (filePath.includes('integrations/mobile/scate') && !config.integrations.scate.enabled) {
    return false;
  }

  if (filePath.includes('integrations/mobile/att') && !config.integrations.att.enabled) {
    return false;
  }

  // Only include SDK initializer if at least one SDK integration is enabled
  if (filePath.includes('services/sdkInitializer')) {
    const hasAnySdk =
      config.integrations.revenueCat.enabled ||
      config.integrations.adjust.enabled ||
      config.integrations.scate.enabled;
    return hasAnySdk;
  }

  // Backend conditional files
  if (filePath.includes('controllers/event-queue') && !config.backend.eventQueue) {
    return false;
  }

  // Email service - only include when email verification or password reset is enabled
  if (filePath.includes('utils/email') &&
      !config.features.authentication.emailVerification &&
      !config.features.authentication.passwordReset) {
    return false;
  }

  // ORM-specific file filtering
  const orm = config.backend.orm;

  // Prisma-specific: filter entire prisma/ directory and .prisma.ts suffix files
  if (orm !== 'prisma') {
    // Matches: prisma/schema.prisma.ejs, prisma/generated/*, prisma/migrations/*, etc.
    if (filePath.includes('/prisma/')) {
      return false;
    }
    // Matches: db.prisma.ts, auth.prisma.ts.ejs, prisma.config.prisma.ts, etc.
    if (filePath.includes('.prisma.ts')) {
      return false;
    }
  }

  // Drizzle-specific: filter entire drizzle/ directory and .drizzle.ts suffix files
  if (orm !== 'drizzle') {
    // Matches: drizzle/schema.drizzle.ts, drizzle/migrations/*, etc.
    if (filePath.includes('/drizzle/')) {
      return false;
    }
    // Matches: db.drizzle.ts, auth.drizzle.ts.ejs, drizzle.config.drizzle.ts, etc.
    if (filePath.includes('.drizzle.ts')) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a file is an EJS template
 */
export function isTemplate(filePath: string): boolean {
  return filePath.endsWith('.ejs');
}

/**
 * Get destination path for a template file
 * Removes .ejs extension and maps template path to project path
 */
export function getDestinationPath(
  templatePath: string,
  targetDir: string
): string {
  let relativePath = templatePath;

  // Remove templates/ prefix
  if (relativePath.startsWith('templates/')) {
    relativePath = relativePath.substring('templates/'.length);
  }

  // ==========================================================================
  // Platform base paths
  // ==========================================================================
  // base/mobile/* → mobile/*
  if (relativePath.startsWith('base/mobile/')) {
    relativePath = relativePath.substring('base/'.length);
  }
  // base/backend/* → backend/*
  else if (relativePath.startsWith('base/backend/')) {
    relativePath = relativePath.substring('base/'.length);
  }
  // base/web/* → web/*
  else if (relativePath.startsWith('base/web/')) {
    relativePath = relativePath.substring('base/'.length);
  }

  // ==========================================================================
  // Mobile features and integrations (now under /mobile/ subdirectory)
  // ==========================================================================
  // features/mobile/*/app/* → mobile/app/*
  else if (relativePath.startsWith('features/mobile/')) {
    const featurePath = relativePath.substring('features/mobile/'.length);
    const restOfPath = featurePath.substring(featurePath.indexOf('/') + 1);

    if (restOfPath.startsWith('app/') || restOfPath === 'app') {
      relativePath = `mobile/${restOfPath}`;
    } else if (['services', 'store', 'hooks', 'components'].some(dir => restOfPath.startsWith(dir + '/') || restOfPath === dir)) {
      relativePath = `mobile/src/${restOfPath}`;
    } else {
      relativePath = `mobile/${restOfPath}`;
    }
  }

  // integrations/mobile/*/services/* → mobile/src/services/*
  else if (relativePath.startsWith('integrations/mobile/')) {
    const integrationPath = relativePath.substring('integrations/mobile/'.length);
    const restOfPath = integrationPath.substring(integrationPath.indexOf('/') + 1);

    if (restOfPath.startsWith('services/') || restOfPath.startsWith('store/')) {
      relativePath = `mobile/src/${restOfPath}`;
    } else {
      relativePath = `mobile/${restOfPath}`;
    }
  }

  // ==========================================================================
  // Web features and integrations (future - placeholder for consistency)
  // ==========================================================================
  // features/web/*/app/* → web/src/app/*
  else if (relativePath.startsWith('features/web/')) {
    const featurePath = relativePath.substring('features/web/'.length);
    const restOfPath = featurePath.substring(featurePath.indexOf('/') + 1);

    // Map to web directory structure (Next.js App Router)
    if (restOfPath.startsWith('app/') || restOfPath === 'app') {
      relativePath = `web/src/${restOfPath}`;
    } else if (['components', 'lib', 'hooks'].some(dir => restOfPath.startsWith(dir + '/') || restOfPath === dir)) {
      relativePath = `web/src/${restOfPath}`;
    } else {
      relativePath = `web/${restOfPath}`;
    }
  }

  // integrations/web/* → web/src/*
  else if (relativePath.startsWith('integrations/web/')) {
    const integrationPath = relativePath.substring('integrations/web/'.length);
    const restOfPath = integrationPath.substring(integrationPath.indexOf('/') + 1);

    relativePath = `web/src/${restOfPath}`;
  }

  // ==========================================================================
  // Shared templates (platform-agnostic)
  // ==========================================================================
  // shared/* → *
  else if (relativePath.startsWith('shared/')) {
    relativePath = relativePath.substring('shared/'.length);
  }

  // Remove ORM suffix from file names (.prisma.ts → .ts, .drizzle.ts → .ts)
  // This handles:
  //   - db.prisma.ts → db.ts
  //   - db.drizzle.ts → db.ts
  //   - auth.prisma.ts.ejs → auth.ts.ejs (then .ejs removed later)
  //   - prisma.config.prisma.ts → prisma.config.ts
  //   - drizzle.config.drizzle.ts → drizzle.config.ts
  //   - drizzle/schema.drizzle.ts → drizzle/schema.ts
  relativePath = relativePath.replace(/\.prisma\.ts/, '.ts');
  relativePath = relativePath.replace(/\.drizzle\.ts/, '.ts');

  // Remove .ejs extension
  if (relativePath.endsWith('.ejs')) {
    relativePath = relativePath.substring(0, relativePath.length - 4);
  }

  return path.join(targetDir, relativePath);
}
