'use client';

import { motion } from 'framer-motion';
import { Terminal, FileCode2, Database, GitMerge, CheckCircle2, ChevronRight } from 'lucide-react';
import styles from './EntityCodegenVisual.module.css';

type Stage = {
    icon: React.ElementType;
    title: string;
    items: string[];
};

const stages: Stage[] = [
    {
        icon: Terminal,
        title: 'stackr add entity blog comment',
        items: ['one command'],
    },
    {
        icon: FileCode2,
        title: 'Generates the slice',
        items: ['schema.ts', 'repository.ts', 'service.ts'],
    },
    {
        icon: GitMerge,
        title: 'Merges the ORM table',
        items: ['additive AST merge', 'existing tables untouched'],
    },
    {
        icon: Database,
        title: 'Records a pending migration',
        items: ['drizzle-kit generate', 'stackr migrations ack'],
    },
];

export function EntityCodegenVisual() {
    return (
        <div className={styles.wrapper}>
            <motion.div
                className={styles.flow}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
                {stages.map((stage, i) => (
                    <motion.div
                        key={stage.title}
                        className={styles.stageWrap}
                        variants={{
                            hidden: { opacity: 0, y: 14 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                        }}
                    >
                        <div className={styles.stage}>
                            <span className={styles.stageIcon}><stage.icon size={17} /></span>
                            <span className={styles.stageTitle}>{stage.title}</span>
                            <div className={styles.items}>
                                {stage.items.map((it) => (
                                    <code key={it} className={styles.item}>{it}</code>
                                ))}
                            </div>
                        </div>
                        {i < stages.length - 1 && (
                            <span className={styles.chevron} aria-hidden><ChevronRight size={18} /></span>
                        )}
                    </motion.div>
                ))}
            </motion.div>

            <p className={styles.caption}>
                <CheckCircle2 size={14} /> Correct-by-construction: the generated code always compiles and
                already follows the conventions the harness enforces.
            </p>
        </div>
    );
}
