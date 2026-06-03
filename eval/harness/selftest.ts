/**
 * Scorer self-test. THROWAWAY but cheap and token-free: plant known-bad mobile
 * fixtures (and one clean control), run the scorer, and assert it flags exactly
 * what it should. Run this once after `--setup` to trust the scorer before
 * spending agent runs.
 *
 *   node eval/harness/selftest.ts
 *
 * Requires the app to be generated + git-init'd (generate-app.ts + run.ts
 * --setup). Resets the app to `start` when done. Exits non-zero on any failure.
 */
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.ts';
import { resetToStart, materializeCondition, commitConditionBaseline } from './lib.ts';
import { scoreTask, type TaskScore } from './score.ts';
import { taskById } from '../suite.ts';

const app = config.APP_DIR;
if (!fs.existsSync(path.join(app, 'sgconfig.yml'))) {
  console.error('App not generated. Run generate-app.ts + run.ts --setup first.');
  process.exit(1);
}

const plant = (rel: string, content: string): void => {
  const p = path.join(app, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};

function run(id: string, condition: string, files: [string, string][]): TaskScore {
  resetToStart(app);
  materializeCondition(app, condition, config.HARNESS_DIR);
  commitConditionBaseline(app);
  for (const [rel, content] of files) plant(rel, content);
  return scoreTask({ appDir: app, condition, task: taskById(id), scorerDir: config.SCORER_DIR, repoRoot: config.REPO_ROOT });
}

const checks: { name: string; ok: boolean; actual: unknown; wanted: unknown }[] = [];
const expect = (name: string, actual: unknown, wanted: unknown): void => {
  checks.push({ name, ok: actual === wanted, actual, wanted });
};

// P13 bad: hardcoded hex (ast-grep violation) + no useMemo(createStyles) (require miss).
{
  const s = run('P13', 'salience', [
    [
      'core/mobile/app/profile.tsx',
      `import { View, StyleSheet } from 'react-native';
export default function Profile() {
  const styles = StyleSheet.create({ box: { backgroundColor: '#ff0000' } });
  return <View style={styles.box} />;
}
`,
    ],
  ]);
  expect('P13 bad: 1 gate violation', s.gateViolations, 1);
  expect('P13 bad: 1 require miss', s.requireMisses, 1);
  expect('P13 bad: color row is violation', s.rows.find((r) => r.id === 'no-hardcoded-color')?.status, 'violation');
}

// P14 bad under OFF: missing useNativeDriver, cause must be absent-from-context.
{
  const s = run('P14', 'off', [
    [
      'core/mobile/app/feed.tsx',
      `import { Animated } from 'react-native';
export function refresh(v) { Animated.timing(v, { toValue: 1, duration: 200 }).start(); }
`,
    ],
  ]);
  expect('P14 bad: 1 gate violation', s.gateViolations, 1);
  expect('P14 bad (OFF): cause is absent-from-context', s.rows.find((r) => r.id === 'native-driver')?.cause, 'absent-from-context');
}

// P15 bad: raw fetch in a screen.
{
  const s = run('P15', 'salience', [
    [
      'core/mobile/app/orders.tsx',
      `import { View } from 'react-native';
export default function Orders() {
  fetch('https://example.com/orders').then((r) => r.json());
  return <View />;
}
`,
    ],
  ]);
  expect('P15 bad: 1 gate violation', s.gateViolations, 1);
}

// P16 bad: token persisted via AsyncStorage (NEW untracked file — exercises staging).
{
  const s = run('P16', 'salience', [
    [
      'core/mobile/src/lib/save-token.ts',
      `import AsyncStorage from '@react-native-async-storage/async-storage';
export async function saveToken(t) { await AsyncStorage.setItem('auth_token', t); }
`,
    ],
  ]);
  expect('P16 bad: gate violation fired', s.gateViolations >= 1, true);
  expect('P16 bad: secure-store require missed', s.rows.find((r) => r.id === 'uses-secure-store')?.status, 'missing');
}

// Clean control: a good P13 screen must score zero violations and pass requires.
{
  const s = run('P13', 'salience', [
    [
      'core/mobile/app/good.tsx',
      `import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/context/theme-context';
export default function Good() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.box} />;
}
const createStyles = (theme) => StyleSheet.create({ box: { backgroundColor: theme.colors.primary } });
`,
    ],
  ]);
  expect('clean control: 0 gate violations', s.gateViolations, 0);
  expect('clean control: 0 require misses', s.requireMisses, 0);
}

resetToStart(app);

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? '✓' : '✗'} ${c.name}` + (c.ok ? '' : ` (got ${JSON.stringify(c.actual)}, want ${JSON.stringify(c.wanted)})`));
  if (!c.ok) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed ? 1 : 0);
