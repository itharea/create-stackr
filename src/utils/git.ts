import { execa } from 'execa';

/**
 * Initialize a git repository with an initial commit.
 *
 * No-op when `STACKR_SKIP_GIT_INIT` is set. The test harness flips this in
 * `tests/utils/setup.ts` so integration tests don't pay the cost of
 * `git init` + `git add .` + `git commit` (≈100 ms each) and don't race
 * with git's async background writes (gc / fsmonitor / pack writes) during
 * `fs.remove(tempDir)` cleanup — the source of the ENOTEMPTY flake on
 * `.git/objects/` we hit on Linux CI.
 */
export async function initializeGit(targetDir: string): Promise<void> {
  if (process.env.STACKR_SKIP_GIT_INIT) return;

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
