/**
 * One shared, cached view of the page scroll for every animation. Reading
 * scrollHeight inside an animation frame can force a layout; this keeps the
 * page height up to date with a ResizeObserver instead.
 */
const state = { y: 0, max: 1, progress: 0 };
let installed = false;

function update() {
  state.y = window.scrollY;
  state.progress = state.max > 0 ? Math.min(1, Math.max(0, state.y / state.max)) : 0;
}

function measure() {
  state.max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  update();
}

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
  }
  measure();
}

export function getScroll(): Readonly<typeof state> {
  install();
  return state;
}
