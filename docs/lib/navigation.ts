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
            { title: 'Configuration', href: '/docs/configuration' },
            { title: 'Presets', href: '/docs/presets' },
        ],
    },
    {
        title: 'Features',
        items: [
            { title: 'Authentication', href: '/docs/features/authentication' },
            { title: 'Onboarding', href: '/docs/features/onboarding' },
            { title: 'Paywall', href: '/docs/features/paywall' },
            { title: 'Session Management', href: '/docs/features/session-management' },
            { title: 'Web Platform', href: '/docs/features/web-platform' },
            { title: 'Backend', href: '/docs/features/backend' },
        ],
    },
    {
        title: 'Integrations',
        items: [
            { title: 'RevenueCat', href: '/docs/integrations/revenuecat' },
            { title: 'Adjust', href: '/docs/integrations/adjust' },
            { title: 'Scate', href: '/docs/integrations/scate' },
            { title: 'App Tracking Transparency', href: '/docs/integrations/att' },
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
