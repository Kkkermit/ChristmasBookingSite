import { LoaderCircle } from 'lucide-react';

/** Kept separate from icons.tsx so the public login page never pulls in the menu. */
export function Spinner({ className = 'h-5 w-5', label }: { className?: string; label?: string }) {
  return (
    <>
      <LoaderCircle className={`${className} animate-spin`} aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
