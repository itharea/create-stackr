'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { navigation } from '@/lib/navigation';
import styles from './Breadcrumbs.module.css';

// Map of valid routes from navigation
const getValidRoutes = () => {
    const routes = new Map<string, string>();
    routes.set('/docs', 'Docs');

    navigation.forEach((section) => {
        section.items.forEach((item) => {
            routes.set(item.href, item.title);
        });
    });

    return routes;
};

// Get a readable label for a segment
const getSegmentLabel = (segment: string): string => {
    return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

// Find the first valid child route for a parent path
const findFirstChildRoute = (parentPath: string): string | null => {
    for (const section of navigation) {
        for (const item of section.items) {
            if (item.href.startsWith(parentPath + '/')) {
                return item.href;
            }
        }
    }
    return null;
};

export default function Breadcrumbs() {
    const pathname = usePathname();
    const validRoutes = getValidRoutes();

    if (!pathname || pathname === '/' || pathname === '/docs') return null;

    const segments = pathname.split('/').filter(Boolean);

    // Build breadcrumb items
    const items: { label: string; href: string | null; isCurrentPage: boolean }[] = [];

    // Always start with Docs
    items.push({
        label: 'Docs',
        href: '/docs/getting-started',
        isCurrentPage: false,
    });

    // Process remaining segments (skip 'docs')
    let currentPath = '/docs';
    for (let i = 1; i < segments.length; i++) {
        currentPath += '/' + segments[i];
        const isLast = i === segments.length - 1;

        // Check if this is a valid route
        const isValidRoute = validRoutes.has(currentPath);
        const label = validRoutes.get(currentPath) || getSegmentLabel(segments[i]);

        if (isLast) {
            // Current page - not a link
            items.push({
                label,
                href: null,
                isCurrentPage: true,
            });
        } else if (isValidRoute) {
            // Valid intermediate route
            items.push({
                label,
                href: currentPath,
                isCurrentPage: false,
            });
        } else {
            // Invalid intermediate route (like /docs/features)
            // Find first valid child and link to it, or just show as text
            const firstChild = findFirstChildRoute(currentPath);
            items.push({
                label,
                href: firstChild,
                isCurrentPage: false,
            });
        }
    }

    if (items.length <= 1) return null;

    return (
        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
            <ol className={styles.list}>
                {items.map((item, index) => (
                    <li key={index} className={styles.item}>
                        {index > 0 && (
                            <ChevronRight className={styles.separator} aria-hidden="true" />
                        )}
                        {item.isCurrentPage ? (
                            <span className={styles.current} aria-current="page">
                                {item.label}
                            </span>
                        ) : item.href ? (
                            <Link href={item.href} className={styles.link}>
                                {item.label}
                            </Link>
                        ) : (
                            <span className={styles.text}>{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
