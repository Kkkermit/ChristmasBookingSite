import { motion } from 'motion/react';
import { DESIGNS, setDesign, useDesign, type DesignId } from '../../lib/design';
import { AsciiArt, art } from './AsciiArt';

/** Compact 1 / 2 / 3 switch (login page corner). */
export function DesignSwitcher({ className = '' }: { className?: string }) {
  const design = useDesign();
  return (
    <div
      role="radiogroup"
      aria-label="Backdrop design"
      className={`flex items-center gap-1 rounded-[3px] border border-white/15 bg-black/80 p-1 font-mono text-xs ${className}`}
    >
      <span aria-hidden="true" className="px-1.5 uppercase tracking-widest text-white/45">
        tree
      </span>
      {DESIGNS.map((d) => {
        const active = design === d.id;
        return (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Backdrop ${d.number}: ${d.name}`}
            title={d.name}
            onClick={() => setDesign(d.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-[2px] font-bold transition-colors ${
              active ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {d.number}
          </button>
        );
      })}
    </div>
  );
}

const PREVIEWS: Record<DesignId, { lines: string[]; mask: string[] }> = {
  classic: {
    lines: art`
    *
   /o\
  /.'*\
   /*.\
 /o.'.o\
/.'*.'.'\
   |||
`,
    mask: art`
    Y
   g*g
  gGG*g
   g*Gg
 g*GgG*g
gGg*GgGgg
   bbb
`,
  },
  spiral: {
    lines: art`
    *
   /=\
  /#=.\
  =.#=\
 /.=#=.\
/=.:#=.=\
   |||
`,
    mask: art`
    Y
   grg
  gwrGg
  rGwrg
 gGrwrGg
grGgwrGrg
   bbb
`,
  },
  rain: {
    lines: art`
: 1 * ' 0
' : /^\ :
| ./*o^\'
: /^^@^\|
'/^*^^o^\
0 . ||| :
`,
    mask: art`
r w Y r w
k r g*g r
w kgG*Ggk
r gGG*Ggr
kgG*GG*gk
r k bbb w
`,
  },
};

/** The full picker with little previews (Santa's Workshop). */
export function DesignPicker() {
  const design = useDesign();
  return (
    <div role="radiogroup" aria-label="Backdrop design" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {DESIGNS.map((d) => {
        const active = design === d.id;
        const preview = PREVIEWS[d.id];
        return (
          <motion.button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setDesign(d.id)}
            whileTap={{ scale: 0.97 }}
            className={`relative flex items-center gap-4 rounded-[3px] border p-3 text-left transition-colors sm:flex-col sm:items-stretch sm:text-center ${
              active ? 'border-white bg-white/[0.08] shadow-[0_0_24px_-8px_rgba(255,255,255,0.5)]' : 'border-white/15 hover:border-white/40 hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex shrink-0 justify-center rounded-[2px] bg-black px-2 py-2 sm:px-0">
              <AsciiArt lines={preview.lines} mask={preview.mask} twinkle={active} className="text-[10px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-display text-2xl leading-none sm:justify-center">
                <span aria-hidden="true" className={active ? 'text-holly-500' : 'text-white/40'}>
                  {active ? '(*)' : '( )'}
                </span>
                {d.number}. {d.name}
              </span>
              <span className="mt-1 block text-xs leading-snug text-white/60">{d.blurb}</span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
