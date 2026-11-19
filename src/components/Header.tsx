import { LogOut, ScrollText, UtensilsCrossed, Wrench } from 'lucide-react';
import { motion } from 'motion/react';
import { ChristmasTree } from './decor/ChristmasTree';
import { FairyLights } from './decor/FairyLights';
import { Spinner } from './Spinner';

const LINKS = [
  { href: '#order', label: 'Order', Icon: UtensilsCrossed },
  { href: '#nice-list', label: 'Nice list', Icon: ScrollText },
  { href: '#workshop', label: 'Workshop', Icon: Wrench },
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
        className="sticky top-0 z-50 border-b border-white/10 bg-night-950 md:bg-night-950/80 md:backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
          <a href="#top" className="group flex min-h-11 shrink-0 items-center gap-2" aria-label="Back to top">
            <ChristmasTree className="h-9 w-8 transition group-hover:scale-110 sm:h-10 sm:w-9" />
            <span className="whitespace-nowrap font-display text-xl leading-none sm:text-2xl">
              Xmas Feast <span className="text-gold-300">’26</span>
            </span>
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                aria-current={active === l.href.slice(1) ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors duration-200 hover:bg-white/10 hover:text-white ${
                  active === l.href.slice(1) ? 'bg-white/10 text-gold-300' : 'text-white/75'
                }`}
              >
                <l.Icon className="h-4 w-4" aria-hidden="true" />
                {l.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Log out"
            className="btn-ghost min-h-11 min-w-11 shrink-0 px-3 py-2 text-sm"
          >
            {loggingOut ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden min-[380px]:inline">{loggingOut ? 'Leaving…' : 'Log out'}</span>
          </button>
        </div>
        <FairyLights />
      </motion.header>

      {/* Thumb-friendly section nav on phones */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-night-900 p-1.5 shadow-2xl shadow-black/60 md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            aria-current={active === l.href.slice(1) ? 'true' : undefined}
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-semibold transition-colors duration-200 active:bg-white/10 ${
              active === l.href.slice(1) ? 'bg-white/10 text-gold-300' : 'text-white/80'
            }`}
          >
            <l.Icon className="h-5 w-5" aria-hidden="true" />
            {l.label}
          </a>
        ))}
      </nav>
    </>
  );
}
