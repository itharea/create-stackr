import { MetadataRoute } from 'next';
import { navigation } from '@/lib/navigation';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://stackr.sh';

    const routes = navigation.flatMap((section) =>
        section.items.map((item) => ({
            url: `${baseUrl}${item.href}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }))
    );

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        ...routes,
    ];
}
