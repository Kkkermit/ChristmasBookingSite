import { useEffect, useRef, useState, type RefObject } from 'react';

const NOISE = '!<>-_\\/[]{}=+*^?#%&@~:;';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/** True once the element has scrolled into view (and stays true). */
export function useSeen(ref: RefObject<Element | null>, margin = '0px 0px -10% 0px'): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin, seen]);
  return seen;
}

/**
 * "Decodes" text: every character flickers through random symbols before
 * settling, left to right. Returns the text to show for the current frame.
 */
export function useScramble(text: string, active: boolean, duration = 700): string {
  const reduced = useRef(prefersReducedMotion()).current;
  const [frame, setFrame] = useState(() => (reduced ? text : scrambleAll(text)));
  useEffect(() => {
    if (reduced) {
      setFrame(text);
      return;
    }
    if (!active) return;
    const start = performance.now();
    const settleAt = Array.from(text, (_, i) => (i / Math.max(1, text.length)) * duration * 0.75 + Math.random() * duration * 0.25);
    let raf = 0;
    let lastPaint = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= duration) {
        setFrame(text);
        return;
      }
      raf = requestAnimationFrame(tick);
      if (now - lastPaint < 45) return; // ~20 changes per second is plenty
      lastPaint = now;
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        out += c === ' ' || c === '\n' || elapsed >= settleAt[i] ? c : NOISE[Math.floor(Math.random() * NOISE.length)];
      }
      setFrame(out);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, active, duration, reduced]);
  return frame;
}

function scrambleAll(text: string) {
  return Array.from(text, (c) => (c === ' ' || c === '\n' ? c : NOISE[(c.charCodeAt(0) * 7) % NOISE.length])).join('');
}

/**
 * Text that decodes itself the first time it scrolls into view. Screen
 * readers (and tests) always get the real text.
 */
export function ScrambleText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useSeen(ref);
  const shown = useScramble(text, seen);
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
