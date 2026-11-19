import { useEffect, useState } from 'react';

/** Which of the given section ids is currently in the middle band of the screen (for nav highlighting). */
export function useActiveSection(ids: readonly string[], ready = true): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join('|');

  useEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // First section (in page order) that crosses the band wins.
        setActive(key.split('|').find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    const elements = key
      .split('|')
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key, ready]);

  return active;
}
