import { motion } from 'motion/react';
import { ChristmasTree } from './decor/ChristmasTree';
import { FairyLights } from './decor/FairyLights';

const LINKS = [
  { href: '#order', label: 'Order', icon: '🍽️' },
  { href: '#nice-list', label: 'Nice list', icon: '📜' },
  { href: '#workshop', label: 'Workshop', icon: '🧾' },
];

export function Header({ onLogout, loggingOut }: { onLogout(): void; loggingOut: boolean }) {
  return (
    <>
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="sticky top-0 z-50 border-b border-white/10 bg-night-950/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <a href="#top" className="group flex items-center gap-2" aria-label="Back to top">
            <ChristmasTree className="h-10 w-9 transition group-hover:scale-110" />
            <span className="font-display text-xl leading-none sm:text-2xl">
              Xmas Feast <span className="text-gold-300">’26</span>
            </span>
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                <span className="mr-1.5">{l.icon}</span>
                {l.label}
              </a>
            ))}
          </nav>
          <button type="button" onClick={onLogout} disabled={loggingOut} className="btn-ghost min-h-10 px-3 py-2 text-sm">
            <span aria-hidden="true">🚪</span>
            <span>{loggingOut ? 'Leaving…' : 'Log out'}</span>
          </button>
        </div>
        <FairyLights />
      </motion.header>

      {/* Thumb-friendly section nav on phones */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-night-900/85 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl md:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs font-semibold text-white/80 active:bg-white/10"
          >
            <span className="text-lg leading-none">{l.icon}</span>
            {l.label}
          </a>
        ))}
      </nav>
    </>
  );
}
