import { motion } from 'motion/react';
import { AsciiArt } from './ascii/AsciiArt';
import { Garland } from './ascii/Garland';
import { Glyph, type GlyphName } from './ascii/Glyph';
import { LOGO_TREE } from './ascii/tree';
import { Spinner } from './Spinner';

const LINKS: Array<{ href: string; label: string; glyph: GlyphName }> = [
  { href: '#order', label: 'Order', glyph: 'order' },
  { href: '#nice-list', label: 'Nice list', glyph: 'list' },
  { href: '#workshop', label: 'Workshop', glyph: 'workshop' },
];

export function Header({
  onLogout,
  loggingOut,
  active = null,
}: {
  onLogout(): void;
  loggingOut: boolean;
  /** id of the section currently on screen, highlighted in the nav */
  active?: string | null;
}) {
  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="sticky top-0 z-50 border-b border-white/10 bg-black md:bg-black/85 md:backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
          <a href="#top" className="group flex min-h-11 shrink-0 items-center gap-2.5" aria-label="Back to top">
            <AsciiArt lines={LOGO_TREE.lines} mask={LOGO_TREE.mask} twinkle className="text-[7.5px] transition-transform group-hover:scale-110 sm:text-[8.5px]" />
            <span className="whitespace-nowrap font-display text-[1.7rem] leading-none sm:text-[2rem]">
              XMAS<span className="text-holly-500">_</span>FEAST <span className="text-holly-500">’26</span>
            </span>
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const current = active === l.href.slice(1);
              return (
                <a
                  key={l.href}
                  href={l.href}
                  aria-current={current ? 'true' : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-[3px] px-3 text-sm font-bold uppercase tracking-wider transition-colors duration-200 hover:bg-white/10 hover:text-white ${
                    current ? 'bg-white text-black hover:bg-white hover:text-black' : 'text-white/70'
                  }`}
                >
                  <Glyph name={l.glyph} className={current ? 'text-holly-600' : 'text-holly-500'} />
                  {l.label}
                </a>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Log out"
            className="btn-ghost min-h-11 min-w-11 shrink-0 px-3 py-2 text-xs"
          >
            {loggingOut ? <Spinner /> : <Glyph name="logout" className="text-holly-500" />}
            <span className="hidden min-[380px]:inline">{loggingOut ? 'Leaving…' : 'Log out'}</span>
          </button>
        </div>
        <Garland />
      </motion.header>

      {/* Thumb-friendly section nav on phones */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 gap-1 rounded-[4px] border border-white/15 bg-black p-1.5 shadow-2xl shadow-black md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {LINKS.map((l) => {
          const current = active === l.href.slice(1);
          return (
            <a
              key={l.href}
              href={l.href}
              aria-current={current ? 'true' : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[3px] text-[0.7rem] font-bold uppercase tracking-wider transition-colors duration-200 active:bg-white/10 ${
                current ? 'bg-white text-black' : 'text-white/75'
              }`}
            >
              <Glyph name={l.glyph} className={`text-sm ${current ? 'text-holly-600' : 'text-holly-500'}`} />
              {l.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
