'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Box, Database, Server, MessageSquare, Globe, Smartphone, Lock, KeyRound } from 'lucide-react';
import styles from './ServiceIsolationVisual.module.css';

type Resource = { label: string; icon: React.ElementType };

type ServiceCard = {
    name: string;
    role: string;
    backendPort: string;
    webPort?: string;
    trustAnchor?: boolean;
    resources: Resource[];
    footer: { label: string; icon: React.ElementType };
};

const services: ServiceCard[] = [
    {
        name: 'auth',
        role: 'trust anchor',
        backendPort: ':8888',
        webPort: ':3333',
        trustAnchor: true,
        resources: [
            { label: 'Fastify · BetterAuth', icon: ShieldCheck },
            { label: 'PostgreSQL', icon: Database },
            { label: 'Redis', icon: Server },
        ],
        footer: { label: 'owns identity', icon: KeyRound },
    },
    {
        name: 'core',
        role: 'base service',
        backendPort: ':8080',
        resources: [
            { label: 'Fastify API', icon: Box },
            { label: 'PostgreSQL', icon: Database },
            { label: 'Redis', icon: Server },
        ],
        footer: { label: 'verifies via auth:8888', icon: Lock },
    },
    {
        name: 'wallet',
        role: 'base service',
        backendPort: ':8081',
        resources: [
            { label: 'Fastify API', icon: Box },
            { label: 'PostgreSQL', icon: Database },
            { label: 'BullMQ + Redis', icon: MessageSquare },
        ],
        footer: { label: 'verifies via auth:8888', icon: Lock },
    },
];

const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
};

const card = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function ServiceIsolationVisual() {
    return (
        <div className={styles.wrapper}>
            {/* Clients */}
            <div className={styles.clients}>
                <span className={styles.clientPill}><Globe size={14} /> Web</span>
                <span className={styles.clientPill}><Smartphone size={14} /> Mobile</span>
            </div>
            <div className={styles.clientRail} aria-hidden />

            {/* Services */}
            <motion.div
                className={styles.grid}
                variants={container}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
            >
                {services.map((svc) => (
                    <motion.div
                        key={svc.name}
                        variants={card}
                        className={`${styles.card} ${svc.trustAnchor ? styles.anchor : ''}`}
                    >
                        <div className={styles.cardHead}>
                            <span className={styles.svcName}>
                                {svc.trustAnchor ? <ShieldCheck size={16} /> : <Box size={16} />}
                                {svc.name}
                            </span>
                            <span className={styles.role}>{svc.role}</span>
                        </div>
                        <div className={styles.ports}>
                            <span className={styles.port}>{svc.backendPort}</span>
                            {svc.webPort && <span className={styles.port}>web {svc.webPort}</span>}
                        </div>
                        <div className={styles.resources}>
                            {svc.resources.map((r) => (
                                <span key={r.label} className={styles.resource}>
                                    <r.icon size={13} /> {r.label}
                                </span>
                            ))}
                        </div>
                        <span className={`${styles.footer} ${svc.trustAnchor ? styles.footerAnchor : ''}`}>
                            <svc.footer.icon size={12} /> {svc.footer.label}
                        </span>
                    </motion.div>
                ))}
            </motion.div>

            <p className={styles.caption}>
                Each service owns its own database and Redis — there are <strong>no database-to-database
                edges</strong>. The only cross-service call is a base service verifying a session against
                the <code>auth</code> trust anchor.
            </p>
        </div>
    );
}
