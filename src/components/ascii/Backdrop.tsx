import { ClassicTree } from './designs/ClassicTree';
import { useViewport } from './engine/viewport';

export interface Placement {
  /** Horizontal centre of the tree, as a fraction of the screen width. */
  x: number;
  /** Vertical centre, as a fraction of the screen height. */
  y: number;
  /** Share of the screen height the tree may fill. */
  share: number;
}

/**
 * The animated ASCII backdrop behind every page: pure black with a red and
 * white glow, the big detailed Christmas tree, a soft vignette and faint CRT
 * scanlines. On the login page of a wide screen the tree stands to the left
 * of the login card, so it isn't hidden behind it.
 */
export function Backdrop({ beside = false }: { beside?: boolean }) {
  const view = useViewport();
  const side = beside && view.w >= 1180;
  const placement: Placement = side ? { x: 0.3, y: 0.47, share: 0.8 } : { x: 0.5, y: 0.55, share: view.w < 768 ? 0.8 : 0.88 };
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-screen overflow-hidden bg-night-950"
      // The largest viewport height, so the phone URL bar sliding never resizes the backdrop.
      style={{ height: '100lvh' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 58%, rgba(255,43,70,0.16), rgba(255,43,70,0) 72%), radial-gradient(ellipse 60% 35% at 50% 0%, rgba(255,255,255,0.07), rgba(255,255,255,0) 70%)',
        }}
      />
      <ClassicTree placement={placement} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)' }} />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #ffffff 0 1px, transparent 1px 3px)' }}
      />
    </div>
  );
}
