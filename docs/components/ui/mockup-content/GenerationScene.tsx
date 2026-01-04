'use client';

import { useRef } from 'react';
import { useInView } from 'framer-motion';
import styles from './GenerationScene.module.css';
import { TerminalAnimation } from './TerminalAnimation';
import { FileTree } from './FileTree';
import { useGenerationAnimation } from './useGenerationAnimation';

export function GenerationScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.3 });
  const state = useGenerationAnimation(isInView);

  // On mobile, show file tree panel after stage 2 begins (creating file structure)
  const showFileTree = state.currentStage >= 2 || state.phase === 'complete' || state.phase === 'fading';
  const isComplete = state.phase === 'complete';

  return (
    <div ref={containerRef} className={`${styles.scene} ${showFileTree ? styles.showFileTree : ''} ${isComplete ? styles.complete : ''}`}>
      <div className={styles.terminalPanel}>
        <TerminalAnimation state={state} />
      </div>
      <div className={styles.divider} />
      <div className={styles.fileTreePanel}>
        <FileTree state={state} />
      </div>
    </div>
  );
}
