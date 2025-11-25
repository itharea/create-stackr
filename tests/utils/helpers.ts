import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Create a temporary directory for testing
 * @param prefix - Directory name prefix
 * @returns Absolute path to created directory
 */
export async function createTempDir(prefix = 'test-'): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/**
 * Clean up a temporary directory
 * @param dir - Directory to remove
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  await fs.remove(dir);
}

/**
 * Verify project has the expected directory structure
 * @param projectDir - Project root directory
 * @param expectedDirs - Array of expected directory paths
 */
export async function verifyDirectoryStructure(
  projectDir: string,
  expectedDirs: string[]
): Promise<void> {
  for (const dir of expectedDirs) {
    const fullPath = path.join(projectDir, dir);
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      throw new Error(`Expected directory not found: ${dir}`);
    }
  }
}

/**
 * Verify project has the expected files
 * @param projectDir - Project root directory
 * @param expectedFiles - Array of expected file paths
 */
export async function verifyFiles(
  projectDir: string,
  expectedFiles: string[]
): Promise<void> {
  for (const file of expectedFiles) {
    const fullPath = path.join(projectDir, file);
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      throw new Error(`Expected file not found: ${file}`);
    }
  }
}

/**
 * Verify files do NOT exist
 * @param projectDir - Project root directory
 * @param unexpectedFiles - Array of files that should not exist
 */
export async function verifyFilesNotExist(
  projectDir: string,
  unexpectedFiles: string[]
): Promise<void> {
  for (const file of unexpectedFiles) {
    const fullPath = path.join(projectDir, file);
    const exists = await fs.pathExists(fullPath);
    if (exists) {
      throw new Error(`File should not exist: ${file}`);
    }
  }
}

/**
 * Verify package.json has expected dependencies
 * @param projectDir - Project root directory
 * @param subDir - Subdirectory (mobile/backend)
 * @param expectedDeps - Dependencies that should exist
 * @param notExpectedDeps - Dependencies that should NOT exist
 */
export async function verifyPackageJson(
  projectDir: string,
  subDir: 'mobile' | 'backend',
  expectedDeps: string[],
  notExpectedDeps: string[] = []
): Promise<void> {
  const pkgPath = path.join(projectDir, subDir, 'package.json');
  const pkg = await fs.readJSON(pkgPath);

  // Check expected dependencies
  for (const dep of expectedDeps) {
    if (!pkg.dependencies?.[dep] && !pkg.devDependencies?.[dep]) {
      throw new Error(`Missing expected dependency: ${dep}`);
    }
  }

  // Check unexpected dependencies don't exist
  for (const dep of notExpectedDeps) {
    if (pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]) {
      throw new Error(`Found unexpected dependency: ${dep}`);
    }
  }
}

/**
 * Verify JSON file is valid
 * @param filePath - Path to JSON file
 */
export async function verifyValidJson(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  try {
    JSON.parse(content);
  } catch (error: any) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

/**
 * Count files matching a pattern
 * @param dir - Directory to search
 * @param pattern - Glob pattern
 */
export async function countFiles(dir: string, pattern: string): Promise<number> {
  const { globby } = await import('globby');
  const files = await globby(pattern, { cwd: dir });
  return files.length;
}

/**
 * Read file content and verify it contains expected strings
 * @param filePath - File to read
 * @param expectedStrings - Strings that should be present
 */
export async function verifyFileContains(
  filePath: string,
  expectedStrings: string[]
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  for (const str of expectedStrings) {
    if (!content.includes(str)) {
      throw new Error(`File ${filePath} does not contain: ${str}`);
    }
  }
}

/**
 * Read file content and verify it does NOT contain strings
 * @param filePath - File to read
 * @param unexpectedStrings - Strings that should NOT be present
 */
export async function verifyFileNotContains(
  filePath: string,
  unexpectedStrings: string[]
): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  for (const str of unexpectedStrings) {
    if (content.includes(str)) {
      throw new Error(`File ${filePath} should not contain: ${str}`);
    }
  }
}

/**
 * Standard directory structure for minimal project
 */
export const MINIMAL_STRUCTURE = {
  directories: [
    'mobile',
    'mobile/app',
    'mobile/src',
    'mobile/src/components',
    'mobile/src/services',
    'mobile/src/store',
    'backend',
    'backend/controllers',
    'backend/domain',
    'scripts',
  ],
  files: [
    'mobile/package.json',
    'mobile/app.json',
    'mobile/tsconfig.json',
    'backend/package.json',
    'backend/tsconfig.json',
    'README.md',
    '.gitignore',
  ],
};

/**
 * Standard directory structure for full-featured project
 */
export const FULL_FEATURED_STRUCTURE = {
  directories: [
    ...MINIMAL_STRUCTURE.directories,
    'mobile/app/(onboarding)',
    'mobile/app/(auth)',
  ],
  files: [
    ...MINIMAL_STRUCTURE.files,
    'mobile/src/services/revenuecatService.ts',
    'mobile/src/services/adjustService.ts',
    'mobile/src/services/scateService.ts',
    'mobile/src/services/attService.ts',
  ],
};
