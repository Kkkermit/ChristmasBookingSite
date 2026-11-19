import confetti from 'canvas-confetti';

let shapes: confetti.Shape[] | null = null;

function festiveShapes(): confetti.Shape[] {
  if (!shapes) {
    try {
      shapes = [
        // star
        'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3l-6.2 3.6 1.6-7L2 9.2l7.1-.6z',
        // tree
        'M12 1 5 11h3.5L4 18h16l-4.5-7H19z',
        // bauble
        'M10 2h4v2.2a8 8 0 1 1-4 0z',
      ].map((path) => confetti.shapeFromPath({ path }));
    } catch {
      shapes = [];
    }
  }
  return shapes;
}

const COLOURS = ['#f43f5e', '#22c55e', '#fcd34d', '#ffffff', '#38bdf8'];

/** A festive confetti + emoji burst. Respects prefers-reduced-motion. */
export function celebrate(origin: { x: number; y: number } = { x: 0.5, y: 0.6 }) {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const base = { origin, disableForReducedMotion: true, zIndex: 80 };
    void confetti({ ...base, particleCount: 90, spread: 80, startVelocity: 42, colors: COLOURS });
    const emoji = festiveShapes();
    if (emoji.length) {
      void confetti({ ...base, particleCount: 30, spread: 110, startVelocity: 36, scalar: 1.6, shapes: emoji, colors: COLOURS });
    }
  } catch {
    // Canvas not available (e.g. tests) - no confetti, no problem.
  }
}

/** Two side cannons - for the big "everyone has ordered" moment. */
export function bigCelebration() {
  celebrate({ x: 0.15, y: 0.7 });
  setTimeout(() => celebrate({ x: 0.85, y: 0.7 }), 250);
  setTimeout(() => celebrate({ x: 0.5, y: 0.5 }), 500);
}
