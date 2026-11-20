import { memo, useMemo, type CSSProperties, type ReactNode } from 'react';

/** Colour for each mask key. Lights ('*') cycle through LIGHT_COLOURS. */
export const PALETTE: Record<string, string> = {
  g: 'text-pine-600',
  G: 'text-pine-500',
  l: 'text-pine-400',
  r: 'text-holly-500',
  R: 'text-holly-400',
  p: 'text-holly-300',
  P: 'text-holly-500',
  w: 'text-white',
  W: 'text-white font-bold',
  s: 'text-white/60',
  k: 'text-white/30',
  y: 'text-star',
  Y: 'text-star font-bold',
  b: 'text-bark',
};

export const LIGHT_COLOURS = ['text-holly-500', 'text-white', 'text-star', 'text-holly-400', 'text-white'];

export interface ArtProps {
  lines: readonly string[];
  /** Same shape as lines; each character picks the colour of the matching art character. */
  mask?: readonly string[];
  /** Colour by character instead of (or as well as) a mask, e.g. { '/': 'g' }. */
  colors?: Readonly<Record<string, string>>;
  /** Lights twinkle (mask key '*'). */
  twinkle?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Gives the art an accessible name; otherwise it is hidden from screen readers. */
  label?: string;
}

/** Renders one line, merging runs of the same colour into a single span. */
function renderLine(line: string, maskLine: string | undefined, colors: ArtProps['colors'], twinkle: boolean, row: number, counter: { n: number }) {
  const out: ReactNode[] = [];
  let run = '';
  let runKey = '';
  const flush = (i: number) => {
    if (!run) return;
    const cls = PALETTE[runKey];
    out.push(cls ? <span key={i} className={cls}>{run}</span> : run);
    run = '';
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const key = (maskLine && maskLine[i] !== ' ' && maskLine[i]) || colors?.[ch] || '';
    if (key === '*') {
      flush(i);
      const n = counter.n++;
      out.push(
        <span
          key={`l${i}`}
          className={`${LIGHT_COLOURS[n % LIGHT_COLOURS.length]} ${twinkle ? 'inline-block animate-twinkle' : ''}`}
          style={twinkle ? { animationDelay: `${((n * 0.37 + row * 0.11) % 2.4).toFixed(2)}s` } : undefined}
        >
          {ch}
        </span>,
      );
      continue;
    }
    if (key !== runKey) {
      flush(i);
      runKey = key;
    }
    run += ch;
  }
  flush(line.length);
  return out;
}

/** A coloured block of ASCII art. */
export const AsciiArt = memo(function AsciiArt({ lines, mask, colors, twinkle = false, className = '', style, label }: ArtProps) {
  const content = useMemo(() => {
    const counter = { n: 0 };
    return lines.map((line, row) => (
      <span key={row} className="block">
        {renderLine(line, mask?.[row], colors, twinkle, row, counter)}
        {line.length === 0 ? ' ' : null}
      </span>
    ));
  }, [lines, mask, colors, twinkle]);
  return (
    <pre
      className={`ascii m-0 ${className}`}
      style={style}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {content}
    </pre>
  );
});

/** Splits a template literal into lines (drop the leading and trailing newline). */
export function art(strings: TemplateStringsArray): string[] {
  const lines = String.raw(strings).split('\n');
  if (lines[0] === '') lines.shift();
  if (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const width = Math.max(...lines.map((l) => l.length));
  return lines.map((l) => l.padEnd(width, ' '));
}

/** Width in characters of the widest line. */
export const artWidth = (lines: readonly string[]) => Math.max(0, ...lines.map((l) => l.length));
