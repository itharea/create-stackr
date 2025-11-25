import { expect } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

/**
 * Custom assertion: directory exists
 */
export async function expectDirectoryExists(dirPath: string) {
  const exists = await fs.pathExists(dirPath);
  expect(exists).toBe(true);
}

/**
 * Custom assertion: file exists
 */
export async function expectFileExists(filePath: string) {
  const exists = await fs.pathExists(filePath);
  expect(exists).toBe(true);
}

/**
 * Custom assertion: file does NOT exist
 */
export async function expectFileNotExists(filePath: string) {
  const exists = await fs.pathExists(filePath);
  expect(exists).toBe(false);
}

/**
 * Custom assertion: valid JSON file
 */
export async function expectValidJson(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  expect(() => JSON.parse(content)).not.toThrow();
}

/**
 * Custom assertion: package.json has dependency
 */
export async function expectDependency(
  projectDir: string,
  subDir: 'mobile' | 'backend',
  depName: string
) {
  const pkgPath = path.join(projectDir, subDir, 'package.json');
  const pkg = await fs.readJSON(pkgPath);
  const hasDep = pkg.dependencies?.[depName] || pkg.devDependencies?.[depName];
  expect(hasDep).toBeTruthy();
}

/**
 * Custom assertion: package.json does NOT have dependency
 */
export async function expectNoDependency(
  projectDir: string,
  subDir: 'mobile' | 'backend',
  depName: string
) {
  const pkgPath = path.join(projectDir, subDir, 'package.json');
  const pkg = await fs.readJSON(pkgPath);
  const hasDep = pkg.dependencies?.[depName] || pkg.devDependencies?.[depName];
  expect(hasDep).toBeFalsy();
}
