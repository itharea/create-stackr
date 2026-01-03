'use client';

import Link from 'next/link';
import { ArrowRight, Terminal, Zap, Shield, Smartphone, Globe, Layers, Command, Cpu, Check, Copy, Plug } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useState, useRef } from 'react';
import styles from './page.module.css';
import { FeatureSection } from '@/components/ui/FeatureSection';
import { Marquee } from '@/components/ui/Marquee';
import { CodeWindow } from '@/components/ui/CodeWindow';
import { Button } from '@/components/ui/Button';
import { PhoneMockup, BrowserMockup } from '@/components/ui/Mockups';
import { GenerationScene, PhoneAppPreview } from '@/components/ui/mockup-content';
import { UniversalStackVisual } from '@/components/ui/UniversalStackVisual';
import { ModulesVisual } from '@/components/ui/ModulesVisual';

export default function Home() {
  const [copied, setCopied] = useState(false);
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  const handleCopy = () => {
    navigator.clipboard.writeText('npx create-stackr@latest');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className={styles.main} ref={targetRef}>
      <div className="bg-grid" />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="hero-glow" />
        <div className="container">
          <motion.div
            className={styles.heroContent}
            style={{ opacity, scale }}
          >
            <motion.div
              className={styles.badge}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className={styles.badgeDot} />
              v0.2.0 is now available
            </motion.div>

            <motion.h1
              className={styles.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Ship Full-Stack Apps <br />
              <span className="text-gradient">In Minutes, Not Months</span>
            </motion.h1>

            <motion.p
              className={styles.subtitle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Production-ready mobile, web, and backend — all from one CLI.
              Expo, Next.js, Fastify, Docker, Auth, and more. Configured and ready to deploy.
            </motion.p>

            <motion.div
              className={styles.cta}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button href="/docs/getting-started">
                Get Started <ArrowRight size={16} style={{ marginLeft: 8 }} />
              </Button>
              <div className={styles.command} onClick={handleCopy}>
                <span className={styles.prompt}>$</span>
                npx create-stackr@latest
                <div className={styles.copyIcon}>
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </div>
              </div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              className={styles.heroVisual}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <BrowserMockup url="terminal">
                <GenerationScene />
              </BrowserMockup>
              <div className={styles.floatingPhone}>
                <PhoneMockup>
                  <PhoneAppPreview />
                </PhoneMockup>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Technologies Section */}
      <div className={styles.techSection}>
        <p className={styles.techLabel}>BUILT WITH</p>
        <Marquee speed={50}>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            <span>React Native</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>Expo</span>
          </div>
          <div className={styles.techItem}>
            <Globe size={20} className={styles.techIcon} />
            <span>Next.js</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M3 3h18v18H3V3zm16.525 13.707c-.131-.821-.666-1.511-2.252-2.155-.552-.259-1.165-.438-1.349-.854-.068-.248-.078-.382-.034-.529.113-.484.687-.629 1.137-.495.293.086.567.327.733.663.775-.507.775-.507 1.316-.844-.203-.314-.304-.454-.439-.586-.473-.528-1.103-.798-2.126-.775l-.528.067c-.507.124-.991.395-1.283.754-.855.968-.608 2.655.427 3.354 1.023.765 2.521.933 2.712 1.653.18.878-.652 1.159-1.475 1.058-.607-.136-.945-.439-1.316-1.002l-1.372.788c.157.359.337.517.607.832 1.305 1.316 4.568 1.249 5.153-.754.021-.067.18-.528.056-1.237l.034.049zm-6.737-5.434h-1.686c0 1.453-.007 2.898-.007 4.354 0 .924.047 1.772-.104 2.033-.247.517-.886.451-1.175.359-.297-.146-.448-.349-.623-.641-.047-.078-.082-.146-.095-.146l-1.368.844c.229.473.563.879.994 1.137.641.383 1.502.507 2.404.305.588-.17 1.095-.519 1.358-1.059.384-.697.302-1.553.299-2.509.008-1.541 0-3.083 0-4.635l.003-.042z" />
            </svg>
            <span>TypeScript</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span>Node.js</span>
          </div>
          <div className={styles.techItem}>
            <Zap size={20} className={styles.techIcon} />
            <span>Fastify</span>
          </div>
          <div className={styles.techItem}>
            <Layers size={20} className={styles.techIcon} />
            <span>Prisma</span>
          </div>
          <div className={styles.techItem}>
            <Layers size={20} className={styles.techIcon} />
            <span>Drizzle</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            <span>Redis</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <span>BetterAuth</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
            <span>PostgreSQL</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" />
            </svg>
            <span>Docker</span>
          </div>
          <div className={styles.techItem}>
            <Shield size={20} className={styles.techIcon} />
            <span>Zod</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
            </svg>
            <span>JWT</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
            </svg>
            <span>RevenueCat</span>
          </div>
          <div className={styles.techItem}>
            <svg viewBox="0 0 24 24" className={styles.techIcon}>
              <path fill="currentColor" d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" />
            </svg>
            <span>Adjust</span>
          </div>
          <div className={styles.techItem}>
            <Cpu size={20} className={styles.techIcon} />
            <span>Scate</span>
          </div>
        </Marquee>
      </div>

      {/* Feature 1: The Universal Stack */}
      <FeatureSection
        title="One Stack, Every Platform"
        description="Generate mobile (Expo), web (Next.js), and backend (Fastify) from a single command. Shared authentication, unified database, and Docker-ready infrastructure — everything wired together."
        visual={<UniversalStackVisual />}
      >
        <ul className={styles.featureList}>
          <li><Check size={16} className={styles.checkIcon} /> Mobile + Web + Backend in one project</li>
          <li><Check size={16} className={styles.checkIcon} /> Shared auth across all platforms</li>
          <li><Check size={16} className={styles.checkIcon} /> Docker dev & production configs included</li>
        </ul>
      </FeatureSection>

      {/* Feature 2: Developer Experience */}
      <FeatureSection
        title="World-Class DX"
        description="Stop fighting with configuration. Choose from battle-tested templates and let our CLI handle the heavy lifting, generating fully typed components, screens, and API endpoints in seconds."
        align="right"
        visual={
          <CodeWindow
            title="Terminal"
            code={`$ npx create-stackr@latest

? What is your project name? my-app
? Choose a starting template: Full-Featured

✔ Project created successfully!

Next steps:
  cd my-app
  npm run dev`}
          />
        }
      >
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>10x</span>
            <span className={styles.statLabel}>Faster Setup</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>100%</span>
            <span className={styles.statLabel}>Type Safety</span>
          </div>
        </div>
      </FeatureSection>

      {/* Feature 3: Seamless Integrations */}
      <FeatureSection
        title="Seamless Integrations"
        description="Don't reinvent the wheel. Enable industry-standard integrations like RevenueCat, Adjust, and BetterAuth directly during project generation. Pre-configured, fully typed, and ready to scale."
        visual={<ModulesVisual />}
      >
      </FeatureSection>

      {/* Feature 3: Backend & Security */}
      <FeatureSection
        title="Production-Grade Infrastructure"
        description="Docker-ready from day one. PostgreSQL with your choice of ORM (Prisma or Drizzle), Redis for caching and queues, and BetterAuth for enterprise authentication with OAuth, 2FA, and session management."
        visual={
          <div className={styles.backendVisual}>
            <div className={styles.backendCard}>
              <Shield size={32} className={styles.backendIcon} />
              <h3>Enterprise Auth</h3>
              <p>OAuth, 2FA, email verification, sessions.</p>
            </div>
            <div className={styles.backendCard}>
              <Zap size={32} className={styles.backendIcon} />
              <h3>Deploy-Ready</h3>
              <p>Docker Compose for dev & production.</p>
            </div>
          </div>
        }
      >
        <Button variant="outline" href="/docs/getting-started">
          View Full Stack
        </Button>
      </FeatureSection>

      {/* Pre-Footer CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <div className={styles.ctaGlow} />
          <h2 className={styles.ctaTitle}>Ready to ship your next idea?</h2>
          <p className={styles.ctaText}>
            Join thousands of developers building the future with create-stackr.
          </p>
          <div className={styles.ctaButtons}>
            <Button href="/docs/getting-started" variant="primary">
              Start Building Now
            </Button>
            <Button href="https://github.com/itharea/create-stackr" variant="outline">
              View on GitHub
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
