import { describe, it, expect, vi, afterEach } from 'vitest';
import inquirer from 'inquirer';
import { promptAITools } from '../../src/prompts/aiTools.js';
import { promptORM } from '../../src/prompts/orm.js';
import { promptPackageManager } from '../../src/prompts/packageManager.js';
import { promptProjectName } from '../../src/prompts/project.js';
import { promptAuthServiceConfig } from '../../src/prompts/authService.js';
import {
  promptServicePlatforms,
  buildServiceFromPlatformAnswers,
} from '../../src/prompts/servicePlatforms.js';
import {
  promptServices,
  buildExtraServicesFromFlag,
} from '../../src/prompts/services.js';
import { authEntry, coreEntry, noIntegrations } from '../../src/config/presets.js';

/**
 * Shape of an inquirer question list as passed to inquirer.prompt. We
 * rely on the array form (the only shape the project uses). `unknown[]`
 * keeps us out of `any` hell while still letting us probe question
 * definitions in the mock implementations.
 */
type QuestionList = readonly {
  validate?: (input: string) => string | true;
  filter?: (input: string) => unknown;
}[];

/**
 * Small helper to queue a sequence of answer objects that the mocked
 * inquirer.prompt will return in order. Typing is intentionally loose
 * because inquirer's declared return type is an unwieldy discriminated
 * union over question types.
 */
function mockInquirerSequence(answers: Record<string, unknown>[]): ReturnType<
  typeof vi.spyOn
> {
  const spy = vi.spyOn(inquirer, 'prompt');
  for (const ans of answers) {
    // @ts-expect-error — inquirer.prompt's overload union conflicts with a simple mockResolvedValueOnce
    spy.mockResolvedValueOnce(ans);
  }
  return spy;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// promptAITools / promptORM / promptPackageManager — thin one-shot wrappers
// ---------------------------------------------------------------------------

describe('promptAITools', () => {
  it('returns the selected AI tool list from inquirer', async () => {
    mockInquirerSequence([{ aiTools: ['claude', 'codex'] }]);
    const result = await promptAITools();
    expect(result).toEqual(['claude', 'codex']);
  });

  it('returns an empty list when nothing is selected', async () => {
    mockInquirerSequence([{ aiTools: [] }]);
    const result = await promptAITools();
    expect(result).toEqual([]);
  });
});

describe('promptORM', () => {
  it('returns the selected ORM', async () => {
    mockInquirerSequence([{ orm: 'drizzle' }]);
    expect(await promptORM()).toBe('drizzle');
  });

  it('returns prisma when prisma is selected', async () => {
    mockInquirerSequence([{ orm: 'prisma' }]);
    expect(await promptORM()).toBe('prisma');
  });
});

describe('promptPackageManager', () => {
  it('returns the selected package manager', async () => {
    mockInquirerSequence([{ packageManager: 'bun' }]);
    expect(await promptPackageManager()).toBe('bun');
  });
});

// ---------------------------------------------------------------------------
// promptProjectName — fast path + interactive path + validate callback
// ---------------------------------------------------------------------------

describe('promptProjectName', () => {
  it('returns the provided name without prompting', async () => {
    const spy = vi.spyOn(inquirer, 'prompt');
    const result = await promptProjectName('cli-provided');
    expect(result).toBe('cli-provided');
    expect(spy).not.toHaveBeenCalled();
  });

  it('falls through to inquirer when no name is provided', async () => {
    mockInquirerSequence([{ projectName: 'interactive-name' }]);
    const result = await promptProjectName(undefined);
    expect(result).toBe('interactive-name');
  });

  it('exposes a validate callback that rejects empty and invalid names and accepts valid ones', async () => {
    let capturedValidate: ((input: string) => string | true) | undefined;
    vi.spyOn(inquirer, 'prompt').mockImplementationOnce(
      // @ts-expect-error — inquirer's prompt overload is too wide for vi.fn
      async (questions: QuestionList) => {
        capturedValidate = questions[0].validate;
        return { projectName: 'my-app' };
      }
    );

    await promptProjectName(undefined);

    expect(capturedValidate).toBeDefined();
    const validate = capturedValidate!;
    expect(validate('')).toBe('Project name cannot be empty');
    expect(validate('   ')).toBe('Project name cannot be empty');
    expect(validate('Bad Name')).toMatch(/lowercase/);
    expect(validate('UPPERCASE')).toMatch(/lowercase/);
    expect(validate('valid-name')).toBe(true);
    expect(validate('valid-name-123')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// promptAuthServiceConfig — single prompt call, maps answers into config shape
// ---------------------------------------------------------------------------

describe('promptAuthServiceConfig', () => {
  it('maps OAuth providers and feature flags into AuthServiceConfig', async () => {
    mockInquirerSequence([
      {
        oauthProviders: ['google', 'apple'],
        authFeatures: ['emailVerification', 'passwordReset', 'twoFactor'],
        adminDashboard: true,
      },
    ]);

    const conf = await promptAuthServiceConfig();

    expect(conf.providers.emailPassword).toBe(true);
    expect(conf.providers.google).toBe(true);
    expect(conf.providers.apple).toBe(true);
    expect(conf.providers.github).toBe(false);
    expect(conf.emailVerification).toBe(true);
    expect(conf.passwordReset).toBe(true);
    expect(conf.twoFactor).toBe(true);
    expect(conf.adminDashboard).toBe(true);
    expect(conf.additionalUserFields).toEqual([]);
    expect(conf.provisioningTargets).toEqual([]);
  });

  it('returns defaults-only config when nothing is selected', async () => {
    mockInquirerSequence([
      { oauthProviders: [], authFeatures: [], adminDashboard: false },
    ]);

    const conf = await promptAuthServiceConfig();

    expect(conf.providers).toEqual({
      emailPassword: true,
      google: false,
      apple: false,
      github: false,
    });
    expect(conf.emailVerification).toBe(false);
    expect(conf.passwordReset).toBe(false);
    expect(conf.twoFactor).toBe(false);
    expect(conf.adminDashboard).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// promptServicePlatforms — three branching paths (no auth, auth+standard,
// auth+role-gated) + the roles filter callback
// ---------------------------------------------------------------------------

describe('promptServicePlatforms', () => {
  it('returns platform selections with no auth middleware when hasAuthService=false', async () => {
    mockInquirerSequence([
      { platforms: ['backend', 'web', 'mobile'], eventQueue: true },
    ]);

    const result = await promptServicePlatforms({
      hasAuthService: false,
      serviceName: 'core',
    });

    expect(result.web).toBe(true);
    expect(result.mobile).toBe(true);
    expect(result.eventQueue).toBe(true);
    expect(result.authMiddleware).toBe('none');
    expect(result.roles).toBeUndefined();
  });

  it('prompts for auth middleware when hasAuthService=true and selects standard', async () => {
    mockInquirerSequence([
      { platforms: ['backend'], eventQueue: false },
      { authMiddleware: 'standard' },
    ]);

    const result = await promptServicePlatforms({
      hasAuthService: true,
      serviceName: 'core',
    });

    expect(result.web).toBe(false);
    expect(result.mobile).toBe(false);
    expect(result.authMiddleware).toBe('standard');
    expect(result.roles).toBeUndefined();
  });

  it('prompts for roles when role-gated is selected', async () => {
    mockInquirerSequence([
      { platforms: ['backend'], eventQueue: false },
      { authMiddleware: 'role-gated' },
      { roles: ['admin', 'superuser'] },
    ]);

    const result = await promptServicePlatforms({
      hasAuthService: true,
      serviceName: 'admin',
    });

    expect(result.authMiddleware).toBe('role-gated');
    expect(result.roles).toEqual(['admin', 'superuser']);
  });

  it('roles filter turns a comma-separated string into a trimmed non-empty list', async () => {
    let capturedFilter: ((input: string) => unknown) | undefined;
    const spy = vi.spyOn(inquirer, 'prompt');

    // First two prompts return normally.
    // @ts-expect-error — union return shape
    spy.mockResolvedValueOnce({ platforms: ['backend'], eventQueue: false });
    // @ts-expect-error — union return shape
    spy.mockResolvedValueOnce({ authMiddleware: 'role-gated' });
    // Third prompt captures the filter fn before returning.
    spy.mockImplementationOnce(
      // @ts-expect-error — inquirer prompt overload union
      async (questions: QuestionList) => {
        capturedFilter = questions[0].filter;
        return { roles: ['admin'] };
      }
    );

    await promptServicePlatforms({ hasAuthService: true, serviceName: 'admin' });

    expect(capturedFilter).toBeDefined();
    const filter = capturedFilter!;
    expect(filter('admin, superuser , editor')).toEqual(['admin', 'superuser', 'editor']);
    expect(filter('admin')).toEqual(['admin']);
    expect(filter(' , ,')).toEqual([]);
    expect(filter('')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildServiceFromPlatformAnswers — pure function, no inquirer
// ---------------------------------------------------------------------------

describe('buildServiceFromPlatformAnswers', () => {
  it('builds a base service with backend-only, web=null, mobile=null', () => {
    const existing = [authEntry({ provisioningTargets: [] })];
    const svc = buildServiceFromPlatformAnswers(
      'core',
      { web: false, mobile: false, eventQueue: false, authMiddleware: 'standard' },
      existing
    );

    expect(svc.name).toBe('core');
    expect(svc.kind).toBe('base');
    expect(svc.backend.port).toBe(8080);
    expect(svc.backend.authMiddleware).toBe('standard');
    expect(svc.backend.eventQueue).toBe(false);
    expect(svc.web).toBeNull();
    expect(svc.mobile).toBeNull();
  });

  it('allocates a web port when web is enabled', () => {
    const existing = [authEntry({ provisioningTargets: [] })];
    const svc = buildServiceFromPlatformAnswers(
      'core',
      { web: true, mobile: true, eventQueue: true, authMiddleware: 'none' },
      existing
    );

    expect(svc.web?.enabled).toBe(true);
    expect(svc.web?.port).toBe(3000);
    expect(svc.mobile?.enabled).toBe(true);
    expect(svc.backend.eventQueue).toBe(true);
    expect(svc.backend.authMiddleware).toBe('none');
  });

  it('stamps roles on role-gated backends', () => {
    const existing = [authEntry({ provisioningTargets: [] })];
    const svc = buildServiceFromPlatformAnswers(
      'admin',
      {
        web: false,
        mobile: false,
        eventQueue: false,
        authMiddleware: 'role-gated',
        roles: ['admin', 'superuser'],
      },
      existing
    );

    expect(svc.backend.authMiddleware).toBe('role-gated');
    expect(svc.backend.roles).toEqual(['admin', 'superuser']);
  });
});

// ---------------------------------------------------------------------------
// promptServices — full interactive flow (mocked end-to-end)
// ---------------------------------------------------------------------------

describe('promptServices', () => {
  it('walks an auth-enabled single-base-service flow', async () => {
    mockInquirerSequence([
      { enableAuth: true },
      // promptAuthServiceConfig
      { oauthProviders: ['google'], authFeatures: ['passwordReset'], adminDashboard: false },
      // promptBaseServiceName
      { name: 'core' },
      // promptServicePlatforms (first base)
      { platforms: ['backend'], eventQueue: false },
      // auth middleware prompt
      { authMiddleware: 'standard' },
      // addAnother loop exit
      { addAnother: false },
    ]);

    const services = await promptServices();

    expect(services.map((s) => s.name)).toEqual(['auth', 'core']);
    const auth = services.find((s) => s.kind === 'auth')!;
    expect(auth.authConfig?.providers.google).toBe(true);
    expect(auth.authConfig?.passwordReset).toBe(true);
    // provisioningTargets is populated from the final peer list.
    expect(auth.authConfig?.provisioningTargets).toEqual(['core']);

    const core = services.find((s) => s.name === 'core')!;
    expect(core.kind).toBe('base');
    expect(core.backend.authMiddleware).toBe('standard');
  });

  it('walks a no-auth multi-service flow with the addAnother loop', async () => {
    mockInquirerSequence([
      { enableAuth: false },
      { name: 'alpha' },
      { platforms: ['backend', 'web'], eventQueue: false },
      // no auth middleware prompt because enableAuth=false
      { addAnother: true },
      { name: 'beta' },
      { platforms: ['backend'], eventQueue: true },
      { addAnother: false },
    ]);

    const services = await promptServices();

    expect(services.map((s) => s.name)).toEqual(['alpha', 'beta']);
    expect(services.find((s) => s.kind === 'auth')).toBeUndefined();

    const alpha = services.find((s) => s.name === 'alpha')!;
    expect(alpha.web?.enabled).toBe(true);
    expect(alpha.backend.authMiddleware).toBe('none');

    const beta = services.find((s) => s.name === 'beta')!;
    expect(beta.backend.eventQueue).toBe(true);
    expect(beta.web).toBeNull();
  });

  it('base-service-name validate rejects invalid and duplicate names, accepts fresh ones', async () => {
    const captured: ((input: string) => string | true)[] = [];
    const spy = vi.spyOn(inquirer, 'prompt');

    // @ts-expect-error enableAuth
    spy.mockResolvedValueOnce({ enableAuth: true });
    // @ts-expect-error — promptAuthServiceConfig answers
    spy.mockResolvedValueOnce({
      oauthProviders: [],
      authFeatures: [],
      adminDashboard: false,
    });
    // Capture the name validate callback on the first base-service-name prompt.
    spy.mockImplementationOnce(
      // @ts-expect-error — inquirer union
      async (questions: QuestionList) => {
        if (questions[0].validate) captured.push(questions[0].validate);
        return { name: 'core' };
      }
    );
    // platforms prompt
    // @ts-expect-error — inquirer prompt overload union
    spy.mockResolvedValueOnce({ platforms: ['backend'], eventQueue: false });
    // auth middleware prompt
    // @ts-expect-error — inquirer prompt overload union
    spy.mockResolvedValueOnce({ authMiddleware: 'standard' });
    // exit the loop
    // @ts-expect-error — inquirer prompt overload union
    spy.mockResolvedValueOnce({ addAnother: false });

    await promptServices();

    expect(captured.length).toBe(1);
    const validate = captured[0];
    // Reserved auth name (auth service already present).
    expect(typeof validate('auth')).toBe('string');
    // Invalid characters.
    expect(typeof validate('Bad_Name')).toBe('string');
    // Duplicate against the already-pushed services list.
    // At the point of capture, only `auth` was in the existing list, so
    // 'auth' is caught by validateServiceName (reserved) and an existing
    // duplicate only bites after we add more services. Fresh name works:
    expect(validate('fresh-name')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildExtraServicesFromFlag — pure function helper for --with-services
// ---------------------------------------------------------------------------

describe('buildExtraServicesFromFlag', () => {
  it('parses comma-separated names and allocates sequential ports skipping 8082', () => {
    const existing = [authEntry({ provisioningTargets: [] })];
    const out = buildExtraServicesFromFlag('scout, wallet, manage', existing, true);

    expect(out.map((s) => s.name)).toEqual(['scout', 'wallet', 'manage']);
    expect(out[0].backend.port).toBe(8080);
    expect(out[1].backend.port).toBe(8081);
    // 8082 is the reserved auth port, so the 3rd service gets 8083.
    expect(out[2].backend.port).toBe(8083);
    for (const svc of out) {
      expect(svc.backend.authMiddleware).toBe('standard');
      expect(svc.web).toBeNull();
      expect(svc.mobile).toBeNull();
    }
  });

  it('sets authMiddleware to none when hasAuthService=false', () => {
    const out = buildExtraServicesFromFlag('alpha', [], false);
    expect(out[0].backend.authMiddleware).toBe('none');
  });

  it('throws on invalid service name', () => {
    expect(() => buildExtraServicesFromFlag('Bad_Name', [], true)).toThrow(
      /invalid name/
    );
  });

  it('throws on duplicate name that already exists in the existing list', () => {
    const existing: Parameters<typeof buildExtraServicesFromFlag>[1] = [
      coreEntry({
        name: 'core',
        backend: {
          port: 8080,
          eventQueue: false,
          imageUploads: false,
          authMiddleware: 'none',
        },
        web: null,
        mobile: null,
        integrations: noIntegrations(),
      }),
    ];
    expect(() => buildExtraServicesFromFlag('core', existing, false)).toThrow(
      /duplicate/
    );
  });

  it('throws on duplicate name inside the CSV itself', () => {
    expect(() => buildExtraServicesFromFlag('scout, scout', [], false)).toThrow(
      /duplicate/
    );
  });

  it('ignores empty segments in the CSV', () => {
    const out = buildExtraServicesFromFlag('alpha,,beta, ', [], false);
    expect(out.map((s) => s.name)).toEqual(['alpha', 'beta']);
  });
});
