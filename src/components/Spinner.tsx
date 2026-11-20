/**
 * ASCII spinner: | / - \ frames, animated in CSS (steps), no JavaScript.
 * Kept separate from the menu code so the public login page can use it.
 */
export function Spinner({ className = '', label }: { className?: string; label?: string }) {
  return (
    <>
      <span aria-hidden="true" className={`inline-block h-[1em] w-[1ch] overflow-hidden align-[-0.125em] font-mono font-bold leading-none ${className}`}>
        <span className="flex animate-[spinner-frames_0.5s_steps(4)_infinite] flex-col">
          <span>|</span>
          <span>/</span>
          <span>-</span>
          <span>\</span>
        </span>
      </span>
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
