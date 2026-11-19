import { useId } from 'react';

const LIGHTS = [
  { x: 50, y: 30, c: '#fcd34d' },
  { x: 40, y: 44, c: '#f43f5e' },
  { x: 60, y: 47, c: '#38bdf8' },
  { x: 33, y: 64, c: '#22d3ee' },
  { x: 52, y: 60, c: '#fcd34d' },
  { x: 68, y: 66, c: '#f43f5e' },
  { x: 26, y: 84, c: '#e879f9' },
  { x: 44, y: 80, c: '#f43f5e' },
  { x: 61, y: 83, c: '#fcd34d' },
  { x: 76, y: 86, c: '#38bdf8' },
];

interface TreeProps {
  className?: string;
  /** Darker, flatter trees read as further away. */
  tone?: 'bright' | 'mid' | 'dark';
  lights?: boolean;
  star?: boolean;
  delay?: number;
}

/** A layered SVG Christmas tree with a pulsing star, garland and twinkling baubles. */
export function ChristmasTree({ className, tone = 'bright', lights = true, star = true, delay = 0 }: TreeProps) {
  const id = useId().replace(/:/g, '');
  const greens = {
    bright: ['#4ade80', '#15803d'],
    mid: ['#22c55e', '#14532d'],
    dark: ['#166534', '#052e16'],
  }[tone];

  return (
    <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={greens[0]} />
          <stop offset="1" stopColor={greens[1]} />
        </linearGradient>
      </defs>
      <rect x="44" y="98" width="12" height="16" rx="2" fill="#78350f" />
      <path d="M50 52 L14 100 H86 Z" fill={`url(#g-${id})`} />
      <path d="M50 34 L22 76 H78 Z" fill={`url(#g-${id})`} />
      <path d="M50 14 L30 52 H70 Z" fill={`url(#g-${id})`} />
      {/* snow caps */}
      <path d="M30 52 Q40 48 50 52 Q60 48 70 52 L66 46 Q50 42 34 46 Z" fill="#f8fafc" opacity="0.85" />
      <path d="M22 76 Q36 71 50 76 Q64 71 78 76 L72 69 Q50 64 28 69 Z" fill="#f8fafc" opacity="0.85" />
      <path d="M14 100 Q32 94 50 100 Q68 94 86 100 L80 92 Q50 86 20 92 Z" fill="#f8fafc" opacity="0.85" />
      {lights && (
        <>
          <path
            d="M36 40 Q50 50 64 42 M28 62 Q50 74 72 62 M20 88 Q50 100 80 86"
            fill="none"
            stroke="#fcd34d"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            opacity="0.8"
          />
          {LIGHTS.map((l, i) => (
            <circle
              key={i}
              cx={l.x}
              cy={l.y}
              r="3"
              fill={l.c}
              className="animate-twinkle"
              style={{
                animationDelay: `${delay + i * 0.27}s`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
                filter: `drop-shadow(0 0 3px ${l.c})`,
              }}
            />
          ))}
        </>
      )}
      {star && (
        <g className="animate-star" style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${delay}s` }}>
          <path d="M50 1 l3.5 7.2 7.9 1.1-5.7 5.6 1.4 7.8L50 19l-7.1 3.7 1.4-7.8-5.7-5.6 7.9-1.1z" fill="#fde047" />
        </g>
      )}
    </svg>
  );
}
