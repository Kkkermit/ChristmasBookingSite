import { AsciiArt } from './AsciiArt';
import { FOOTER_SCENE } from './pieces';

/** Snowy ASCII village along the very bottom of the page. */
export function FooterScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center overflow-hidden bg-gradient-to-t from-black via-black/90 to-transparent pb-1 pt-10"
    >
      <AsciiArt lines={FOOTER_SCENE.lines} mask={FOOTER_SCENE.mask} twinkle className="text-[11px] opacity-90 sm:text-[13px]" />
    </div>
  );
}
