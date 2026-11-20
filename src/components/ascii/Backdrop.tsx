import { useDesign } from '../../lib/design';
import { ClassicTree } from './designs/ClassicTree';
import { RainTree } from './designs/RainTree';
import { SpiralTree } from './designs/SpiralTree';

/**
 * The animated ASCII backdrop behind every page: pure black with a red and
 * white glow, one of three tree designs, a soft vignette and faint CRT scanlines.
 */
export function Backdrop() {
  const design = useDesign();
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 58%, rgba(255,43,70,0.16), rgba(255,43,70,0) 72%), radial-gradient(ellipse 60% 35% at 50% 0%, rgba(255,255,255,0.07), rgba(255,255,255,0) 70%)',
        }}
      />
      {design === 'classic' && <ClassicTree />}
      {design === 'spiral' && <SpiralTree />}
      {design === 'rain' && <RainTree />}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)' }} />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 3px)' }}
      />
    </div>
  );
}
