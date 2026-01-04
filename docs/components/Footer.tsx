import Link from 'next/link';
import { Github } from 'lucide-react';
import styles from './Footer.module.css';

function NpmIcon({ size = 18 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z" />
        </svg>
    );
}

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className="container">
                <div className={styles.content}>
                    <div className={styles.left}>
                        <div className={styles.brand}>
                            <div className={styles.logoIcon} />
                            <span className={styles.logoText}>stackr</span>
                        </div>
                        <span className={styles.separator} />
                        <p className={styles.tagline}>
                            Build production-ready full-stack apps in minutes.
                        </p>
                    </div>

                    <div className={styles.right}>
                        <nav className={styles.links}>
                            <Link href="/docs/getting-started">Docs</Link>
                            <Link href="/privacy">Privacy</Link>
                            <Link href="/terms">Terms</Link>
                        </nav>
                        <div className={styles.socials}>
                            <a
                                href="https://github.com/itharea/create-stackr"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="GitHub"
                            >
                                <Github size={18} />
                            </a>
                            <a
                                href="https://www.npmjs.com/package/create-stackr"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="npm"
                            >
                                <NpmIcon size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
