'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { navigation } from '@/lib/navigation';
import { useSidebar } from '@/lib/sidebar-context';
import styles from './Sidebar.module.css';
import clsx from 'clsx';

export default function Sidebar() {
    const pathname = usePathname();
    const { isOpen, close } = useSidebar();

    // Close sidebar on route change
    useEffect(() => {
        close();
    }, [pathname, close]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className={clsx(styles.backdrop, { [styles.backdropVisible]: isOpen })}
                onClick={close}
                aria-hidden="true"
            />

            <aside className={clsx(styles.sidebar, { [styles.sidebarOpen]: isOpen })}>
                {/* Mobile close button */}
                <div className={styles.mobileHeader}>
                    <span className={styles.mobileTitle}>Navigation</span>
                    <button
                        className={styles.closeButton}
                        onClick={close}
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className={styles.nav}>
                    {navigation.map((section) => (
                        <div key={section.title} className={styles.section}>
                            <h4 className={styles.title}>{section.title}</h4>
                            <ul className={styles.list}>
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={clsx(styles.link, {
                                                    [styles.active]: isActive,
                                                    [styles.disabled]: item.disabled,
                                                })}
                                                onClick={close}
                                            >
                                                {item.title}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>
        </>
    );
}
