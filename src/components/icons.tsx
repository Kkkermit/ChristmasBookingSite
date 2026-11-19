import {
  CakeSlice,
  Cherry,
  Drumstick,
  Fish,
  Hamburger,
  Sandwich,
  Shrimp,
  Soup,
  Vegan,
  WheatOff,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';
import type { Dietary, DishIcon as DishIconName } from '../../shared/menu';
import { DIETARY_LABEL } from '../../shared/menu';

type SvgProps = LucideProps & { title?: string };

function Svg({ children, className, strokeWidth = 2, title, ...rest }: SvgProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...(rest as React.SVGProps<SVGSVGElement>)}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/* Hand-drawn festive food icons, in the same 24px / 2px-stroke style as Lucide. */

export function RoastTurkey(props: SvgProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 16a7.5 6.5 0 0 1 15 0z" />
      <path d="M7.6 11.2 5.4 8.4" />
      <circle cx="4.6" cy="7.4" r="1.4" />
      <path d="M16.4 11.2l2.2-2.8" />
      <circle cx="19.4" cy="7.4" r="1.4" />
      <path d="M2.5 16h19" />
      <path d="M4.5 16c.3 2.2 1.7 3 3.5 3h8c1.8 0 3.2-.8 3.5-3" />
    </Svg>
  );
}

export function Skewer(props: SvgProps) {
  return (
    <Svg {...props}>
      <path d="M4 20 20 4" />
      <circle cx="16" cy="8" r="2.6" />
      <rect x="8.4" y="10.4" width="6.4" height="3.6" rx="1.6" transform="rotate(-45 11.6 12.2)" />
      <circle cx="7.6" cy="16.4" r="2.6" />
    </Svg>
  );
}

export function Wellington(props: SvgProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="7.5" width="18" height="9.5" rx="4.75" />
      <path d="M8.5 8 6.5 16.5M12.5 7.5l-2 9.5M16.5 8l-2 9" />
      <path d="M2 20.5h20" />
    </Svg>
  );
}

export function ChristmasPudding(props: SvgProps) {
  return (
    <Svg {...props}>
      <path d="M4 17a8 8 0 0 1 16 0z" />
      <path d="M5.3 13c1.4.9 2.2-.6 3.3.4 1 1 2 1.1 3-.1 1-1.2 2.1-.2 3.1.3 1.1.5 2.3-.9 3.9-.6" />
      <path d="M11 7.2c-.8-1.7-2.8-2-3.8-.6 1.2.2 2.1 1 3.8.6zM13 7.2c.8-1.7 2.8-2 3.8-.6-1.2.2-2.1 1-3.8.6z" />
      <circle cx="12" cy="7.6" r=".9" fill="currentColor" />
      <path d="M2.5 20h19" />
    </Svg>
  );
}

export function Tart(props: SvgProps) {
  return (
    <Svg {...props}>
      <path d="M3 11.5c0 1.8 4 3.3 9 3.3s9-1.5 9-3.3" />
      <ellipse cx="12" cy="11.5" rx="9" ry="3.3" />
      <path d="M3 11.5 4.6 17c.5 1.5 3.6 2.7 7.4 2.7s6.9-1.2 7.4-2.7l1.6-5.5" />
      <path d="M12 11.5 18.6 9.4" />
      <path d="M6.5 15.6v2M9.2 16.3v2.2M12 16.6v2.4M14.8 16.3v2.2M17.5 15.6v2" />
    </Svg>
  );
}

const DISH_ICONS: Record<DishIconName, LucideIcon | ((p: SvgProps) => React.JSX.Element)> = {
  soup: Soup,
  pate: Sandwich,
  shrimp: Shrimp,
  wings: Drumstick,
  turkey: RoastTurkey,
  skewer: Skewer,
  fish: Fish,
  burger: Hamburger,
  wellington: Wellington,
  pudding: ChristmasPudding,
  'fudge-cake': CakeSlice,
  cheesecake: Cherry,
  tart: Tart,
};

export function DishIcon({ icon, ...props }: { icon: DishIconName } & SvgProps) {
  const Icon = DISH_ICONS[icon];
  return <Icon {...props} />;
}

/** Small "VG" / "GF" badges from the menu's dietary notes. */
export function DietaryBadges({ dietary, className = '' }: { dietary: readonly Dietary[]; className?: string }) {
  if (dietary.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {dietary.map((d) => (
        <span
          key={d}
          title={DIETARY_LABEL[d]}
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide ${
            d === 'vegan' ? 'bg-pine-500/20 text-pine-500' : 'bg-gold-400/15 text-gold-300'
          }`}
        >
          {d === 'vegan' ? <Vegan className="h-3 w-3" aria-hidden="true" /> : <WheatOff className="h-3 w-3" aria-hidden="true" />}
          {d === 'vegan' ? 'Vegan' : d === 'gf' ? 'GF' : 'GF option'}
          <span className="sr-only"> ({DIETARY_LABEL[d]})</span>
        </span>
      ))}
    </span>
  );
}

export { Spinner } from './Spinner';
