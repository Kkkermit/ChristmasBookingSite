import type { Dietary, DishIcon as DishIconName } from '../../shared/menu';
import { DIETARY_LABEL } from '../../shared/menu';

/* Hand-typed ASCII food: a 3-line picture per dish, plus a 3-character glyph for lists. */

const DISH_ART: Record<DishIconName, string[]> = {
  soup: [' ) ) ) ', '\\~~~~~/', " '---' "],
  pate: [' _____ ', '(#####)', '|_____|'],
  shrimp: ['\\@@@@/ ', ' \\~~/  ', '  ||   '],
  wings: ['  .--. ', '=(    )', "  '--' "],
  turkey: [' _.--._ ', '(      )', "o'----'o"],
  skewer: ['        ', '-o-#-o->', '        '],
  fish: ['   _,  ', '><(((o>', "   '   "],
  burger: [' .---. ', '(=====)', " '---' "],
  wellington: [' .----. ', '(//////)', " '----' "],
  pudding: ['  _%_  ', " /'''\\ ", '(:::::)'],
  'fudge-cake': ['  /|  ', ' /#|  ', '/##|  '],
  cheesecake: [' @ @  ', '.===. ', '|___| '],
  tart: [' .~~~. ', '(-----)', ' \\___/ '],
};

const DISH_GLYPH: Record<DishIconName, string> = {
  soup: '\\~/',
  pate: '[#]',
  shrimp: '\\@/',
  wings: '=()',
  turkey: '(_)',
  skewer: '-o-',
  fish: '<><',
  burger: '(=)',
  wellington: '(/)',
  pudding: '(%)',
  'fudge-cake': '/#|',
  cheesecake: '[@]',
  tart: '(~)',
};

/** Three-line ASCII picture of a dish (decorative). */
export function DishArt({ icon, className = '' }: { icon: DishIconName; className?: string }) {
  return (
    <pre aria-hidden="true" className={`ascii m-0 leading-[1.1] ${className}`}>
      {DISH_ART[icon].join('\n')}
    </pre>
  );
}

/** Three-character ASCII glyph for a dish, for lists (decorative). */
export function DishGlyph({ icon, className = '' }: { icon: DishIconName; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-block w-[3ch] shrink-0 whitespace-pre font-mono font-bold leading-none ${className}`}>
      {DISH_GLYPH[icon]}
    </span>
  );
}

/** Small [VEGAN] / [GF] tags from the menu's dietary notes. */
export function DietaryBadges({ dietary, className = '' }: { dietary: readonly Dietary[]; className?: string }) {
  if (dietary.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap gap-1 ${className}`}>
      {dietary.map((d) => (
        <span
          key={d}
          title={DIETARY_LABEL[d]}
          className={`inline-flex items-center rounded-[2px] border px-1 py-px font-mono text-[0.7rem] font-bold uppercase leading-tight tracking-wide ${
            d === 'vegan' ? 'border-pine-500/50 text-pine-400' : 'border-white/30 text-white/80'
          }`}
        >
          [{d === 'vegan' ? 'Vegan' : d === 'gf' ? 'GF' : 'GF opt'}]
          <span className="sr-only"> ({DIETARY_LABEL[d]})</span>
        </span>
      ))}
    </span>
  );
}

export { Spinner } from './Spinner';
