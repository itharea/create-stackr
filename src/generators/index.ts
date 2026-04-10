import type { InitConfig } from '../types/index.js';
import { MonorepoGenerator } from './monorepo.js';

/**
 * Thin backwards-compat wrapper for tests / downstream imports that still
 * reference `ProjectGenerator`. Delegates to `MonorepoGenerator`, which is
 * the real generator in phase 2. New code should import `MonorepoGenerator`
 * directly.
 *
 * @deprecated Use `MonorepoGenerator` from `./monorepo.js`.
 */
export class ProjectGenerator {
  private readonly inner: MonorepoGenerator;

  constructor(config: InitConfig & { verbose?: boolean }) {
    const { verbose, ...initConfig } = config;
    this.inner = new MonorepoGenerator(initConfig, { verbose });
  }

  async generate(targetDir: string): Promise<void> {
    return this.inner.generate(targetDir);
  }
}

export { MonorepoGenerator } from './monorepo.js';
export { ServiceGenerator } from './service.js';
export { buildServiceContext, buildStackrConfig } from './service-context.js';
export { renderDockerCompose } from './docker-compose.js';
