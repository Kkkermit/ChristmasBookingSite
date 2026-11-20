import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Glyph, type GlyphName } from './ascii/Glyph';
import { ScrambleText } from './ascii/Scramble';

/**
 * One heading style for every section: a red prompt glyph, the title (which
 * decodes itself as it scrolls into view), a blinking cursor and an ASCII rule.
 */
export function SectionHeading({
  id,
  glyph,
  title,
  subtitle,
  aside,
}: {
  id?: string;
  glyph: GlyphName;
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 sm:mb-6">
      <div className="flex items-end gap-3">
        <Glyph name={glyph} className="mb-1.5 text-base text-holly-500 sm:mb-2 sm:text-lg" />
        <h2 id={id} className="section-title min-w-0 flex-1 [text-shadow:0_0_14px_#000,0_0_4px_#000,0_0_2px_#000]">
          <ScrambleText text={title} />
          <span aria-hidden="true" className="ml-1 animate-blink text-holly-500">
            _
          </span>
        </h2>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      <motion.div
        aria-hidden="true"
        className="mt-2 overflow-hidden whitespace-nowrap font-mono text-xs leading-none text-holly-500/60"
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        whileInView={{ clipPath: 'inset(0 0% 0 0)' }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {'=-'.repeat(120)}
      </motion.div>
      {subtitle && <p className="mt-3 text-sm text-white/70 [text-shadow:0_0_8px_#000,0_0_2px_#000]">{subtitle}</p>}
    </div>
  );
}
