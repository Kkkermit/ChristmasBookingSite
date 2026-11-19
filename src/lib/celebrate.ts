import confetti from 'canvas-confetti';

let shapes: confetti.Shape[] | null = null;

function festiveShapes(): confetti.Shape[] {
  if (!shapes) {
    try {
      shapes = ['❄️', '🎄', '⭐', '🎁'].map((text) => confetti.shapeFromText({ text, scalar: 2 }));
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
      void confetti({ ...base, particleCount: 26, spread: 110, startVelocity: 36, scalar: 2, shapes: emoji, flat: true });
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
