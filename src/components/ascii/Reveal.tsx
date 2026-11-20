import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({ children, className = '', id, delay = 0 }: { children: ReactNode; className?: string; id?: string; delay?: number }) {
  return (
    <motion.div
      id={id}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
