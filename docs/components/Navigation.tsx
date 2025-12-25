'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Github, Search } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import styles from './Navigation.module.css';

export default function Navigation() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <nav className={`${styles.nav} glass`}>
            <div className="container">
                <div className={styles.inner}>
                    {/* Logo */}
                    <Link href="/" className={styles.logo}>
                        create-stackr
                    </Link>

                    {/* Desktop Navigation */}
                    <div className={styles.desktop}>
                        <div className={styles.links}>
                            <Link href="/docs/getting-started">Documentation</Link>
                            <a
                                href="https://github.com/itharea/create-stackr"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                GitHub
                            </a>
                            <a
                                href="https://www.npmjs.com/package/create-stackr"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                npm
                            </a>
                        </div>

                        <div className={styles.actions}>
                            <button
                                className={styles.searchButton}
                                aria-label="Search documentation"
                                onClick={() => {
                                    // Will trigger Command Palette
                                    const event = new KeyboardEvent('keydown', {
                                        key: 'k',
                                        metaKey: true,
                                        bubbles: true,
                                    });
                                    document.dispatchEvent(event);
                                }}
                            >
                                <Search size={18} />
                                <span>Search</span>
                                <kbd className={styles.kbd}>⌘K</kbd>
                            </button>

                            <a
                                href="https://github.com/itharea/create-stackr"
                                className={styles.iconButton}
                                aria-label="GitHub Repository"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Github size={20} />
                            </a>

                            <ThemeToggle />
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className={styles.mobileMenuButton}
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className={styles.mobileMenu}>
                    <Link href="/docs/getting-started" onClick={() => setMobileMenuOpen(false)}>
                        Documentation
                    </Link>
                    <a
                        href="https://github.com/itharea/create-stackr"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        GitHub
                    </a>
                    <a
                        href="https://www.npmjs.com/package/create-stackr"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        npm
                    </a>
                </div>
            )}
        </nav>
    );
}
