import { memo } from 'react';

const PATTERN = '~-~o-~-*-~-o~-~-';
const REPEAT = 12;

/**
 * A string of ASCII fairy lights along the bottom of the header. The bulbs
 * chase in red and white; only opacity animates (no repaints).
 */
export const Garland = memo(function Garland() {
  let bulb = 0;
  const chars = Array.from({ length: REPEAT }, () => PATTERN).join('').split('');
  return (
    <div aria-hidden="true" className="pointer-events-none flex h-5 items-center justify-center overflow-hidden whitespace-pre font-mono text-[13px] leading-none">
      <span>
        {chars.map((ch, i) => {
          if (ch !== 'o' && ch !== '*') return <span key={i} className="text-pine-700">{ch}</span>;
          const n = bulb++;
          return (
            <span
              key={i}
              className={`inline-block animate-chase font-bold ${ch === '*' ? 'text-star' : n % 2 ? 'text-white' : 'text-holly-500'}`}
              style={{ animationDelay: `${((n % 3) * 0.6).toFixed(1)}s` }}
            >
              {ch === '*' ? '*' : n % 2 ? 'o' : 'O'}
            </span>
          );
        })}
      </span>
    </div>
  );
});
