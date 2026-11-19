import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** One consistent heading style for every section: icon badge, title, optional actions and subtitle. */
export function SectionHeading({
  id,
  icon: Icon,
  title,
  subtitle,
  aside,
}: {
  id?: string;
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 sm:mb-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 animate-float items-center justify-center rounded-2xl bg-gold-400/15 text-gold-300">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 id={id} className="section-title min-w-0 flex-1">
          {title}
        </h2>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      {subtitle && <p className="mt-2 text-white/65">{subtitle}</p>}
    </div>
  );
}
