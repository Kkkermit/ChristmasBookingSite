import confetti from 'canvas-confetti';

let shapes: confetti.Shape[] | null = null;

/** ASCII confetti: * + o x # ~ characters in red, white and gold (text shapes carry their own colour). */
function asciiShapes(): confetti.Shape[] {
  if (!shapes) {
    try {
      shapes = ['#ff2b46', '#ffffff', '#ff2b46', '#ffdf7e'].flatMap((color) =>
        ['*', '+', 'o', 'x', '#', '~'].map((text) => confetti.shapeFromText({ text, scalar: 2, color, fontFamily: '"JetBrains Mono", monospace' })),
      );
    } catch {
      shapes = [];
    }
  }
  return shapes;
}

const COLOURS = ['#ff2b46', '#ffffff', '#ffa3ae', '#ffdf7e', '#ff5a6e'];

/** A red and white confetti burst of ASCII characters. Respects prefers-reduced-motion. */
export function celebrate(origin: { x: number; y: number } = { x: 0.5, y: 0.6 }) {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const base = { origin, disableForReducedMotion: true, zIndex: 80 };
    const ascii = asciiShapes();
    if (ascii.length) {
      void confetti({ ...base, particleCount: 70, spread: 95, startVelocity: 40, scalar: 2, shapes: ascii, colors: COLOURS, flat: true });
    }
    void confetti({ ...base, particleCount: 50, spread: 70, startVelocity: 45, scalar: 0.8, shapes: ['square'], colors: COLOURS });
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
