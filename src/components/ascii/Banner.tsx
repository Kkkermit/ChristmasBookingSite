import { useScramble } from './Scramble';

/**
 * A FIGlet banner that scales with the screen (never wider than `fit` of the
 * viewport, never bigger than `maxPx`) and decodes itself on first show.
 */
export function Banner({
  lines,
  className = '',
  maxPx,
  gutter = '2.5rem',
  delay = 0,
}: {
  lines: readonly string[];
  className?: string;
  maxPx: number;
  /** Horizontal space around the banner, subtracted from the viewport width. */
  gutter?: string;
  delay?: number;
}) {
  const cols = Math.max(...lines.map((l) => l.length));
  const shown = useScramble(lines.join('\n'), true, 900 + delay);
  return (
    <pre
      aria-hidden="true"
      className={`ascii m-0 inline-block text-left ${className}`}
      style={{ fontSize: `min(${maxPx}px, calc((100vw - ${gutter}) / ${(cols * 0.6).toFixed(2)}))`, lineHeight: 1.08 }}
    >
      {shown}
    </pre>
  );
}
