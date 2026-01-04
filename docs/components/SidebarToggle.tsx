'use client';

import { Menu } from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';
import styles from './SidebarToggle.module.css';

export default function SidebarToggle() {
    const { open } = useSidebar();

    return (
        <button
            className={styles.toggle}
            onClick={open}
            aria-label="Open navigation"
        >
            <Menu size={20} />
            <span>Menu</span>
        </button>
    );
}
