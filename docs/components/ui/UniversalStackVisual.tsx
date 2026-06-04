'use client';

import { motion } from 'framer-motion';
import { Smartphone, Globe, Layers, Zap, MessageSquare, Database } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from './UniversalStackVisual.module.css';

interface TechItem {
  name: string;
  icon: React.ElementType;
}

const uiTechnologies: TechItem[] = [
  { name: 'React Native', icon: Smartphone },
  { name: 'Next.js', icon: Globe },
  { name: '& More', icon: Layers },
];

const controllers: TechItem[] = [
  { name: 'REST API', icon: Zap },
  { name: 'Event Queue', icon: MessageSquare },
];

const backend: TechItem[] = [
  { name: 'Your Business Logic', icon: Database },
];

interface ConnectionPath {
  id: string;
  d: string;
}

export function UniversalStackVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<{ upper: ConnectionPath[]; lower: ConnectionPath[] }>({
    upper: [],
    lower: [],
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const calculatePaths = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const uiLayer = container.querySelector('[data-layer="ui"]') as HTMLElement;
      const controllerLayer = container.querySelector('[data-layer="controller"]') as HTMLElement;
      const backendLayer = container.querySelector('[data-layer="backend"]') as HTMLElement;

      if (!uiLayer || !controllerLayer || !backendLayer) return;

      const containerRect = container.getBoundingClientRect();

      // Get the actual layer positions relative to container
      const uiBottom = uiLayer.offsetTop + uiLayer.offsetHeight;
      const controllerTop = controllerLayer.offsetTop;
      const controllerBottom = controllerLayer.offsetTop + controllerLayer.offsetHeight;
      const backendTop = backendLayer.offsetTop;

      // Calculate upper connections (UI to Controllers)
      const upperPaths: ConnectionPath[] = [];
      const uiItems = uiLayer.querySelectorAll('[data-tech-item]');
      const controllerItems = controllerLayer.querySelectorAll('[data-tech-item]');

      uiItems.forEach((uiItem, i) => {
        const uiItemRect = uiItem.getBoundingClientRect();
        const startX = uiItemRect.left + uiItemRect.width / 2 - containerRect.left;
        const startY = uiBottom;

        // Connect to corresponding controller item
        const targetIndex = i % controllerItems.length;
        const controllerItem = controllerItems[targetIndex];
        if (controllerItem) {
          const controllerItemRect = controllerItem.getBoundingClientRect();
          const endX = controllerItemRect.left + controllerItemRect.width / 2 - containerRect.left;
          const endY = controllerTop;

          const midY = (startY + endY) / 2;
          const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
          upperPaths.push({ id: `upper-${i}`, d });
        }
      });

      // Calculate lower connections (Controllers to Backend)
      const lowerPaths: ConnectionPath[] = [];
      const backendItem = backendLayer.querySelector('[data-tech-item]');

      if (backendItem) {
        const backendItemRect = backendItem.getBoundingClientRect();
        const endX = backendItemRect.left + backendItemRect.width / 2 - containerRect.left;
        const endY = backendTop;

        controllerItems.forEach((controllerItem, i) => {
          const controllerItemRect = controllerItem.getBoundingClientRect();
          const startX = controllerItemRect.left + controllerItemRect.width / 2 - containerRect.left;
          const startY = controllerBottom;

          const midY = (startY + endY) / 2;
          const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
          lowerPaths.push({ id: `lower-${i}`, d });
        });
      }

      setPaths({ upper: upperPaths, lower: lowerPaths });
    };

    // Initial calculation with delay to ensure DOM is ready
    const timeoutId = setTimeout(calculatePaths, 100);

    // Recalculate on resize
    const resizeObserver = new ResizeObserver(calculatePaths);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Set visible after a short delay for animation
    const visibilityTimeout = setTimeout(() => setIsVisible(true), 200);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(visibilityTimeout);
      resizeObserver.disconnect();
    };
  }, []);

  const layerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    }),
  };

  const techItemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: 0.3 + i * 0.05,
        duration: 0.3,
        ease: 'easeOut' as const,
      },
    }),
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {/* SVG Connections Layer */}
      <svg className={styles.connectionsSvg} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--fg-tertiary)" stopOpacity="0.2" />
            <stop offset="50%" stopColor="var(--fg-tertiary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--fg-tertiary)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Upper connections */}
        {isVisible && paths.upper.map((path, index) => (
          <g key={path.id}>
            {/* Main elegant line */}
            <motion.path
              d={path.d}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={1}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 + index * 0.08, ease: 'easeOut' }}
            />
            {/* Subtle animated dot traveling along path */}
            <motion.circle
              r={2}
              fill="var(--fg-tertiary)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: 1 + index * 0.3,
                ease: 'easeInOut',
              }}
            >
              <animateMotion
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${1 + index * 0.3}s`}
                path={path.d}
              />
            </motion.circle>
          </g>
        ))}

        {/* Lower connections */}
        {isVisible && paths.lower.map((path, index) => (
          <g key={path.id}>
            <motion.path
              d={path.d}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={1}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 + index * 0.08, ease: 'easeOut' }}
            />
            <motion.circle
              r={2}
              fill="var(--fg-tertiary)"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: 1.5 + index * 0.3,
                ease: 'easeInOut',
              }}
            >
              <animateMotion
                dur="2.5s"
                repeatCount="indefinite"
                begin={`${1.5 + index * 0.3}s`}
                path={path.d}
              />
            </motion.circle>
          </g>
        ))}
      </svg>

      {/* UI Layer */}
      <motion.div
        className={styles.layer}
        data-layer="ui"
        custom={0}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={layerVariants}
      >
        <span className={styles.layerLabel}>UI Layer</span>
        <div className={styles.techGrid}>
          {uiTechnologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              className={styles.techItem}
              data-tech-item
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={techItemVariants}
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <tech.icon size={18} className={styles.techIcon} />
              <span>{tech.name}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Connection Zone - Upper */}
      <div className={styles.connectionZone} />

      {/* Controller Layer */}
      <motion.div
        className={styles.layer}
        data-layer="controller"
        custom={1}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={layerVariants}
      >
        <span className={styles.layerLabel}>Controllers</span>
        <div className={styles.techGrid}>
          {controllers.map((tech, index) => (
            <motion.div
              key={tech.name}
              className={styles.techItem}
              data-tech-item
              custom={index + uiTechnologies.length}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={techItemVariants}
              whileHover={{ scale: 1.05, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <tech.icon size={18} className={styles.techIcon} />
              <span>{tech.name}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Connection Zone - Lower */}
      <div className={styles.connectionZone} />

      {/* Backend Layer */}
      <motion.div
        className={`${styles.layer} ${styles.backendLayer}`}
        data-layer="backend"
        custom={2}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={layerVariants}
      >
        <span className={styles.layerLabel}>Backend</span>
        <div className={styles.techGrid}>
          {backend.map((tech, index) => (
            <motion.div
              key={tech.name}
              className={`${styles.techItem} ${styles.backendItem}`}
              data-tech-item
              custom={index + uiTechnologies.length + controllers.length}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={techItemVariants}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <tech.icon size={20} className={styles.techIcon} />
              <span>{tech.name}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
