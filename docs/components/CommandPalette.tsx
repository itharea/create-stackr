'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Search, FileText, Settings, Laptop, Moon, Sun, Boxes, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import styles from './CommandPalette.module.css';

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { setTheme } = useTheme();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className={styles.dialog}
            overlayClassName={styles.overlay}
        >
            <VisuallyHidden.Root>
                <Dialog.Title>Global Command Menu</Dialog.Title>
            </VisuallyHidden.Root>
            <div className={styles.inputWrapper}>
                <Search className={styles.searchIcon} size={20} />
                <Command.Input className={styles.input} placeholder="Type a command or search..." />
            </div>

            <Command.List className={styles.list}>
                <Command.Empty className={styles.empty}>No results found.</Command.Empty>

                <Command.Group heading="Documentation">
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/getting-started'))}
                    >
                        <FileText size={16} />
                        <span>Getting Started</span>
                    </Command.Item>
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/installation'))}
                    >
                        <FileText size={16} />
                        <span>Installation</span>
                    </Command.Item>
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/quick-start'))}
                    >
                        <FileText size={16} />
                        <span>Quick Start</span>
                    </Command.Item>
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/configuration'))}
                    >
                        <Settings size={16} />
                        <span>Configuration</span>
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="Architecture">
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/architecture'))}
                    >
                        <Boxes size={16} />
                        <span>Architecture Overview</span>
                    </Command.Item>
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/architecture/auth-flow'))}
                    >
                        <Boxes size={16} />
                        <span>Cross-Service Auth</span>
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="The Context Harness">
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/harness'))}
                    >
                        <Sparkles size={16} />
                        <span>Why a Harness</span>
                    </Command.Item>
                    <Command.Item
                        className={styles.item}
                        onSelect={() => runCommand(() => router.push('/docs/harness/enforcement'))}
                    >
                        <Sparkles size={16} />
                        <span>Enforcement</span>
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="Theme">
                    <Command.Item className={styles.item} onSelect={() => runCommand(() => setTheme('light'))}>
                        <Sun size={16} />
                        <span>Light Mode</span>
                    </Command.Item>
                    <Command.Item className={styles.item} onSelect={() => runCommand(() => setTheme('dark'))}>
                        <Moon size={16} />
                        <span>Dark Mode</span>
                    </Command.Item>
                    <Command.Item className={styles.item} onSelect={() => runCommand(() => setTheme('system'))}>
                        <Laptop size={16} />
                        <span>System</span>
                    </Command.Item>
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
}
