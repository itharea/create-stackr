import { execa } from 'execa';

/**
 * Initialize a git repository with an initial commit
 */
export async function initializeGit(targetDir: string): Promise<void> {
  // Check if git is available
  try {
    await execa('git', ['--version']);
  } catch {
    throw new Error('Git is not installed or not in PATH');
  }

  // Initialize repository
  await execa('git', ['init'], { cwd: targetDir });

  // Configure git user if not already set (for CI/CD environments)
  try {
    await execa('git', ['config', 'user.email'], { cwd: targetDir });
  } catch {
    // If no user.email is set, configure a default for the initial commit
    await execa('git', ['config', 'user.email', 'create-fullstack-app@example.com'], { cwd: targetDir });
    await execa('git', ['config', 'user.name', 'create-fullstack-app'], { cwd: targetDir });
  }

  // Add all files
  await execa('git', ['add', '.'], { cwd: targetDir });

  // Create initial commit
  await execa(
    'git',
    [
      'commit',
      '-m',
      'Initial commit\n\nGenerated with create-fullstack-app\nhttps://github.com/yourusername/create-fullstack-app',
    ],
    { cwd: targetDir }
  );
}
