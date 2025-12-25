'use client';

import { motion, AnimatePresence } from 'framer-motion';
import styles from './TerminalAnimation.module.css';
import { CheckIcon, CircleIcon } from './Icons';
import type { GenerationState } from './useGenerationAnimation';

interface TerminalAnimationProps {
  state: GenerationState;
}

const COMMAND = 'npx create-stackr@latest';

const STAGES = [
  { id: 1, text: 'Initializing project' },
  { id: 2, text: 'Creating file structure' },
  { id: 3, text: 'Setting up backend' },
  { id: 4, text: 'Configuring TypeScript' },
];

function TypingText({ text, progress }: { text: string; progress: number }) {
  const visibleChars = Math.floor(text.length * progress);
  const displayText = text.slice(0, visibleChars);
  const showCursor = progress < 1;

  return (
    <span className={styles.commandText}>
      {displayText}
      {showCursor && <span className={styles.cursor} />}
    </span>
  );
}

function StageItem({
  stage,
  isActive,
  isComplete,
  index,
}: {
  stage: { id: number; text: string };
  isActive: boolean;
  isComplete: boolean;
  index: number;
}) {
  return (
    <motion.div
      className={styles.stage}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        delay: index * 0.08
      }}
    >
      <span className={styles.stageStatus}>
        {isComplete ? (
          <motion.span
            className={styles.checkmark}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <CheckIcon size={12} />
          </motion.span>
        ) : isActive ? (
          <span className={styles.spinner} />
        ) : (
          <span className={styles.pending}>
            <CircleIcon size={10} />
          </span>
        )}
      </span>
      <span className={`${styles.stageText} ${isComplete ? styles.stageComplete : ''}`}>
        {stage.text}
      </span>
    </motion.div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressTrack}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <span className={styles.progressPercent}>{Math.round(progress)}%</span>
    </div>
  );
}

export function TerminalAnimation({ state }: TerminalAnimationProps) {
  const { phase, typingProgress, currentStage, progress } = state;
  const showCommand = phase !== 'idle';
  const showStages = currentStage > 0 || phase === 'complete' || phase === 'fading';
  const showProgress = showStages;

  return (
    <AnimatePresence mode="wait">
      {phase !== 'fading' ? (
        <motion.div
          className={styles.terminal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.content}>
            {/* Prompt line */}
            <div className={styles.line}>
              <span className={styles.prompt}>$</span>
              {showCommand ? (
                <TypingText text={COMMAND} progress={typingProgress} />
              ) : (
                <span className={styles.cursor} />
              )}
            </div>

            {/* Stages */}
            {showStages && (
              <motion.div
                className={styles.stages}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {STAGES.map((stage, index) => {
                  const stageNum = stage.id;
                  const isActive = currentStage === stageNum;
                  const isComplete = currentStage > stageNum || phase === 'complete';
                  const isVisible = currentStage >= stageNum || phase === 'complete';

                  if (!isVisible) return null;

                  return (
                    <StageItem
                      key={stage.id}
                      stage={stage}
                      isActive={isActive}
                      isComplete={isComplete}
                      index={index}
                    />
                  );
                })}
              </motion.div>
            )}

            {/* Progress bar */}
            {showProgress && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <ProgressBar progress={progress} />
              </motion.div>
            )}

            {/* Success message */}
            {phase === 'complete' && (
              <motion.div
                className={styles.success}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  delay: 0.1
                }}
              >
                <span className={styles.successIcon}>
                  <CheckIcon size={10} />
                </span>
                <span>Project ready!</span>
              </motion.div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          className={styles.terminal}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </AnimatePresence>
  );
}
