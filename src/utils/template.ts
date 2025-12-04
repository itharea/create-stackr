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
  // Check if file is in a conditional directory
  if (filePath.includes('features/onboarding') && !config.features.onboarding.enabled) {
    return false;
  }

  // Auth check updated for new structure
  if (filePath.includes('features/auth') && !config.features.authentication.enabled) {
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

  if (filePath.includes('features/paywall') && !config.features.paywall) {
    return false;
  }

  // Note: Tabs templates are always included (not conditional)

  if (filePath.includes('integrations/revenuecat') && !config.integrations.revenueCat.enabled) {
    return false;
  }

  if (filePath.includes('integrations/adjust') && !config.integrations.adjust.enabled) {
    return false;
  }

  if (filePath.includes('integrations/scate') && !config.integrations.scate.enabled) {
    return false;
  }

  if (filePath.includes('integrations/att') && !config.integrations.att.enabled) {
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

  // Map template structure to project structure
  // base/mobile/* → mobile/*
  if (relativePath.startsWith('base/mobile/')) {
    relativePath = relativePath.substring('base/'.length);
  }
  // base/backend/* → backend/*
  else if (relativePath.startsWith('base/backend/')) {
    relativePath = relativePath.substring('base/'.length);
  }
  // features/*/app/* → mobile/app/*
  else if (relativePath.startsWith('features/')) {
    const parts = relativePath.split('/');
    if (parts[2] === 'app') {
      relativePath = 'mobile/' + parts.slice(2).join('/');
    } else if (parts[2] === 'services' || parts[2] === 'store' || parts[2] === 'hooks' || parts[2] === 'components') {
      relativePath = 'mobile/src/' + parts.slice(2).join('/');
    }
  }
  // integrations/*/services/* → mobile/src/services/*
  else if (relativePath.startsWith('integrations/')) {
    const parts = relativePath.split('/');
    relativePath = 'mobile/src/' + parts.slice(2).join('/');
  }
  // shared/* → *
  else if (relativePath.startsWith('shared/')) {
    relativePath = relativePath.substring('shared/'.length);
  }

  // Remove .ejs extension
  if (relativePath.endsWith('.ejs')) {
    relativePath = relativePath.substring(0, relativePath.length - 4);
  }

  return path.join(targetDir, relativePath);
}
