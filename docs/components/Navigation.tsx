'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Search, ArrowUpRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import styles from './Navigation.module.css';

export default function Navigation() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Body scroll lock when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    const triggerSearch = () => {
        setMobileMenuOpen(false);
        const event = new KeyboardEvent('keydown', {
            key: 'k',
            metaKey: true,
            bubbles: true,
        });
        document.dispatchEvent(event);
    };

    return (
        <>
            <nav className={styles.nav}>
                <div className="container">
                    <div className={styles.inner}>
                        {/* Left: Logo + Nav Links */}
                        <div className={styles.left}>
                            <Link href="/" className={styles.logo}>
                                stackr
                            </Link>
                            <div className={styles.links}>
                                <Link href="/docs/getting-started">Documentation</Link>
                                <a
                                    href="https://github.com/itharea/create-stackr"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.externalLink}
                                >
                                    GitHub
                                    <ArrowUpRight size={12} />
                                </a>
                                <a
                                    href="https://www.npmjs.com/package/create-stackr"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.externalLink}
                                >
                                    npm
                                    <ArrowUpRight size={12} />
                                </a>
                            </div>
                        </div>

                        {/* Right: Search + Theme */}
                        <div className={styles.actions}>
                            <button
                                className={styles.searchButton}
                                aria-label="Search documentation"
                                onClick={triggerSearch}
                            >
                                <Search size={18} />
                                <span>Search</span>
                                <kbd className={styles.kbd}>⌘K</kbd>
                            </button>

                            <ThemeToggle />
                        </div>

                        {/* Mobile Actions */}
                        <div className={styles.mobileActions}>
                            <button
                                className={styles.iconButton}
                                onClick={triggerSearch}
                                aria-label="Search documentation"
                            >
                                <Search size={20} />
                            </button>
                            <button
                                className={styles.mobileMenuButton}
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            >
                                <Menu size={24} className={`${styles.menuIcon} ${mobileMenuOpen ? styles.menuIconHidden : ''}`} />
                                <X size={24} className={`${styles.closeIcon} ${mobileMenuOpen ? '' : styles.closeIconHidden}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu - Below navbar overlay */}
            <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.mobileMenuOpen : ''}`}>
                {/* Mobile Navigation Links */}
                <nav className={styles.mobileNav}>
                    <Link href="/docs/getting-started" onClick={() => setMobileMenuOpen(false)}>
                        Documentation
                    </Link>
                    <a
                        href="https://github.com/itharea/create-stackr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.externalLink}
                    >
                        GitHub
                        <ArrowUpRight size={14} />
                    </a>
                    <a
                        href="https://www.npmjs.com/package/create-stackr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.externalLink}
                    >
                        npm
                        <ArrowUpRight size={14} />
                    </a>
                </nav>

                {/* Mobile Footer */}
                <div className={styles.mobileFooter}>
                    <ThemeToggle />
                </div>
            </div>
        </>
    );
}
