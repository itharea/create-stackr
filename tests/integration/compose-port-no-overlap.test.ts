import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Phase 5 regression guard: dev compose and the e2e profile of the test
 * compose must be able to run concurrently, which requires their host
 * port sets to be fully disjoint. The `+10000` offset enforces this
 * today; this test fails loudly if a future service type (or a typo in
 * the generator) lands a test port back in the dev range.
 */
describe('dev vs e2e profile — host port disjointness', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-port-overlap-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  function collectHostPorts(composeYaml: string, profileFilter?: string): Set<number> {
    const parsed = YAML.parse(composeYaml) as {
      services?: Record<string, { ports?: unknown[]; profiles?: string[] }>;
    };
    const out = new Set<number>();
    if (!parsed.services) return out;
    for (const [, svc] of Object.entries(parsed.services)) {
      if (profileFilter) {
        const profiles = svc.profiles ?? [];
        if (!profiles.includes(profileFilter)) continue;
      }
      if (!Array.isArray(svc.ports)) continue;
      for (const spec of svc.ports) {
        // Port specs are usually "127.0.0.1:HOST:CONTAINER" strings; accept
        // objects too for future-compat.
        if (typeof spec === 'string') {
          const match = spec.match(/(?:^|:)(\d+):\d+(?:\/|$)/);
          if (match) out.add(Number(match[1]));
        } else if (spec && typeof spec === 'object' && 'published' in spec) {
          const published = (spec as { published: number | string }).published;
          out.add(typeof published === 'string' ? Number(published) : published);
        }
      }
    }
    return out;
  }

  it.each(PRESETS.map((p) => [p.name] as const))(
    '%s preset → dev ∩ e2e host ports is empty',
    async (presetName) => {
      const body = loadPreset(presetName);
      const config: InitConfig = applyCliOptionsToPreset(
        body,
        `port-overlap-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);

      const devYaml = await fs.readFile(
        path.join(projectDir, 'docker-compose.yml'),
        'utf-8'
      );
      const testYaml = await fs.readFile(
        path.join(projectDir, 'docker-compose.test.yml'),
        'utf-8'
      );

      const devPorts = collectHostPorts(devYaml);
      // Test compose services belong to either the `component` or `e2e`
      // profile. The e2e profile is the one that runs alongside dev; it
      // is the strictest disjointness requirement.
      const e2ePorts = new Set<number>([
        ...collectHostPorts(testYaml, 'component'),
        ...collectHostPorts(testYaml, 'e2e'),
      ]);

      expect(devPorts.size, 'dev compose must expose at least one host port').toBeGreaterThan(0);
      expect(e2ePorts.size, 'e2e profile must expose at least one host port').toBeGreaterThan(0);

      const intersection = [...devPorts].filter((p) => e2ePorts.has(p));
      expect(intersection, 'dev and e2e profiles must not share host ports').toEqual([]);
    }
  );
});
