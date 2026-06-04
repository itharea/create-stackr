import createMDX from '@next/mdx';

const withMDX = createMDX({
    extension: /\.mdx?$/,
    options: {
        remarkPlugins: [],
        rehypePlugins: ['rehype-slug'],
    },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
    reactStrictMode: true,
    images: {
        formats: ['image/avif', 'image/webp'],
    },
    async redirects() {
        return [
            {
                source: '/docs',
                destination: '/docs/getting-started',
                permanent: true,
            },
            // v0.2.0 → v0.7.0 documentation moves. The old pages described a
            // single-app scaffolder; their content now lives under the new
            // Architecture / Harness / Guides sections.
            { source: '/docs/presets', destination: '/docs/configuration', permanent: true },
            { source: '/docs/features/backend', destination: '/docs/architecture/backend', permanent: true },
            { source: '/docs/features/web-platform', destination: '/docs/architecture/frontends', permanent: true },
            { source: '/docs/features/session-management', destination: '/docs/architecture/auth-flow', permanent: true },
            { source: '/docs/features/onboarding', destination: '/docs/guides/mobile', permanent: true },
            { source: '/docs/features/paywall', destination: '/docs/guides/mobile', permanent: true },
            { source: '/docs/integrations/revenuecat', destination: '/docs/guides/mobile', permanent: true },
            { source: '/docs/integrations/adjust', destination: '/docs/guides/mobile', permanent: true },
            { source: '/docs/integrations/scate', destination: '/docs/guides/mobile', permanent: true },
            { source: '/docs/integrations/att', destination: '/docs/guides/mobile', permanent: true },
        ];
    },
};

export default withMDX(nextConfig);
