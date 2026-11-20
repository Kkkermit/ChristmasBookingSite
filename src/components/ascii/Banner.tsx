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
  depth,
}: {
  lines: readonly string[];
  className?: string;
  maxPx: number;
  /** Horizontal space around the banner, subtracted from the viewport width. */
  gutter?: string;
  delay?: number;
  /** Colour class of an extruded copy behind the banner, for a 3D look. */
  depth?: string;
}) {
  const cols = Math.max(...lines.map((l) => l.length));
  const shown = useScramble(lines.join('\n'), true, 900 + delay);
  const style = { fontSize: `min(${maxPx}px, calc((100vw - ${gutter}) / ${(cols * 0.6).toFixed(2)}))`, lineHeight: 1.08 };
  const banner = (
    <pre aria-hidden="true" className={`ascii relative m-0 inline-block text-left ${className}`} style={style}>
      {shown}
    </pre>
  );
  if (!depth) return banner;
  return (
    <span className="relative inline-block">
      {[3, 2, 1].map((k) => (
        <pre
          key={k}
          aria-hidden="true"
          className={`ascii absolute left-0 top-0 m-0 text-left ${depth}`}
          style={{ ...style, transform: `translate(${k * 0.09}em, ${k * 0.09}em)`, opacity: 1 - k * 0.22 }}
        >
          {shown}
        </pre>
      ))}
      {banner}
    </span>
  );
}
