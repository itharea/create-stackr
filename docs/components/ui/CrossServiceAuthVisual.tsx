'use client';

import { motion } from 'framer-motion';
import { Smartphone, Lock, ShieldCheck, UserCheck, ArrowDown } from 'lucide-react';
import styles from './CrossServiceAuthVisual.module.css';

type Step = {
    icon: React.ElementType;
    title: string;
    detail: string;
    edge?: string;
    accent?: boolean;
};

const steps: Step[] = [
    {
        icon: Smartphone,
        title: 'Client request',
        detail: 'Web or mobile sends a request carrying the BetterAuth session cookie.',
        edge: 'Cookie: better-auth.session_token',
    },
    {
        icon: Lock,
        title: 'requireAuth (onRequest hook)',
        detail: 'The base service intercepts the request before the route handler runs.',
        edge: 'forwards the cookie →',
    },
    {
        icon: ShieldCheck,
        title: 'auth :8888 · /api/auth/get-session',
        detail: 'The trust anchor validates the session and returns the principal.',
        edge: '← { user, session }',
        accent: true,
    },
    {
        icon: UserCheck,
        title: 'request.user is decorated',
        detail: 'The handler executes with a verified user — never a client-supplied id.',
    },
];

export function CrossServiceAuthVisual() {
    return (
        <div className={styles.wrapper}>
            <motion.ol
                className={styles.flow}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            >
                {steps.map((step, i) => (
                    <motion.li
                        key={step.title}
                        className={styles.stepItem}
                        variants={{
                            hidden: { opacity: 0, y: 14 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                        }}
                    >
                        <div className={`${styles.node} ${step.accent ? styles.accent : ''}`}>
                            <span className={styles.num}>{i + 1}</span>
                            <span className={styles.nodeIcon}><step.icon size={18} /></span>
                            <div className={styles.nodeBody}>
                                <span className={styles.title}>{step.title}</span>
                                <span className={styles.detail}>{step.detail}</span>
                            </div>
                        </div>
                        {step.edge && (
                            <div className={styles.edge}>
                                <ArrowDown size={13} />
                                <code>{step.edge}</code>
                            </div>
                        )}
                    </motion.li>
                ))}
            </motion.ol>

            <p className={styles.note}>
                With the <code>flexible</code> middleware flavor, the same hook also accepts an
                <code>x-device-session-token</code> header for native clients that can&apos;t carry cookies.
            </p>
        </div>
    );
}
