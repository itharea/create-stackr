'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import styles from './BackToTop.module.css';

export default function BackToTop() {
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();

    // Don't show on home page
    const isHomePage = pathname === '/';

    useEffect(() => {
        const toggleVisibility = () => {
            setIsVisible(window.scrollY > 300);
        };

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    if (isHomePage) return null;

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <button
            className={`${styles.button} ${isVisible ? styles.visible : ''}`}
            onClick={scrollToTop}
            aria-label="Back to top"
        >
            <ArrowUp size={20} />
        </button>
    );
}
