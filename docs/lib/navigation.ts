export type NavItem = {
    title: string;
    href: string;
    disabled?: boolean;
};

export type NavSection = {
    title: string;
    items: NavItem[];
};

export const navigation: NavSection[] = [
    {
        title: 'Getting Started',
        items: [
            { title: 'Introduction', href: '/docs/getting-started' },
            { title: 'Installation', href: '/docs/installation' },
            { title: 'Quick Start', href: '/docs/quick-start' },
            { title: 'Configuration', href: '/docs/configuration' },
        ],
    },
    {
        title: 'Architecture',
        items: [
            { title: 'Overview', href: '/docs/architecture' },
            { title: 'Services & Isolation', href: '/docs/architecture/services' },
            { title: 'Cross-Service Auth', href: '/docs/architecture/auth-flow' },
            { title: 'Backend', href: '/docs/architecture/backend' },
            { title: 'Frontends', href: '/docs/architecture/frontends' },
            { title: 'Testing', href: '/docs/architecture/testing' },
            { title: 'Infrastructure', href: '/docs/architecture/infrastructure' },
        ],
    },
    {
        title: 'The Context Harness',
        items: [
            { title: 'Why a Harness', href: '/docs/harness' },
            { title: 'Convention Layer', href: '/docs/harness/context' },
            { title: 'Enforcement', href: '/docs/harness/enforcement' },
            { title: 'Codegen & Anti-Drift', href: '/docs/harness/codegen' },
        ],
    },
    {
        title: 'Guides',
        items: [
            { title: 'Authentication', href: '/docs/features/authentication' },
            { title: 'Adding a Service', href: '/docs/guides/add-service' },
            { title: 'Adding a Domain Entity', href: '/docs/guides/add-entity' },
            { title: 'Testing', href: '/docs/guides/testing' },
            { title: 'Mobile (Expo)', href: '/docs/guides/mobile' },
        ],
    },
    {
        title: 'Reference',
        items: [
            { title: 'CLI Reference', href: '/docs/cli-reference' },
            { title: 'Project Structure', href: '/docs/project-structure' },
            { title: 'Development', href: '/docs/development' },
            { title: 'Deployment', href: '/docs/deployment' },
            { title: 'Troubleshooting', href: '/docs/troubleshooting' },
            { title: 'FAQ', href: '/docs/faq' },
        ],
    },
];
