'use client';

import { motion } from 'framer-motion';
import { FileCog, Lightbulb, ShieldAlert, ArrowDown } from 'lucide-react';
import styles from './ContextHarnessVisual.module.css';

const salience = [
    'AGENTS.md (nested)',
    'CLAUDE.md (bridge)',
    '.cursor/rules/*.mdc',
    '.windsurf/rules/*.md',
    '.claude/skills/*',
];

const enforcement = [
    '.stackr/sg-rules/*.yml',
    '.claude/hooks/check-edited.mjs',
];

const fade = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function ContextHarnessVisual() {
    return (
        <motion.div
            className={styles.wrapper}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
            <motion.div className={styles.source} variants={fade}>
                <FileCog size={18} />
                <div>
                    <span className={styles.sourceTitle}>context-map.ts</span>
                    <span className={styles.sourceSub}>CONTEXT_RULES — one table</span>
                </div>
            </motion.div>

            <motion.div className={styles.arrow} variants={fade}>
                <ArrowDown size={14} />
                <span>renders every format</span>
            </motion.div>

            <div className={styles.groups}>
                <motion.div className={styles.group} variants={fade}>
                    <span className={`${styles.groupLabel} ${styles.salience}`}>
                        <Lightbulb size={13} /> Salience — raises first-pass compliance
                    </span>
                    <div className={styles.chips}>
                        {salience.map((s) => (
                            <code key={s} className={styles.chip}>{s}</code>
                        ))}
                    </div>
                </motion.div>

                <motion.div className={styles.group} variants={fade}>
                    <span className={`${styles.groupLabel} ${styles.enforce}`}>
                        <ShieldAlert size={13} /> Enforcement — mechanically checks
                    </span>
                    <div className={styles.chips}>
                        {enforcement.map((s) => (
                            <code key={s} className={`${styles.chip} ${styles.chipEnforce}`}>{s}</code>
                        ))}
                    </div>
                </motion.div>
            </div>

            <motion.p className={styles.caption} variants={fade}>
                One source table, every artifact derived from it — so the rule files
                <strong> cannot disagree</strong> on which rules apply or what they say.
            </motion.p>
        </motion.div>
    );
}
