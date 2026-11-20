/**
 * ASCII stand-ins for icons. Always decorative (aria-hidden): every control
 * that uses one also has a text label or an aria-label.
 */
export const GLYPHS = {
  send: '>>',
  save: '[s]',
  saved: '[x]',
  edit: '[~]',
  delete: '[-]',
  close: 'x',
  back: '<-',
  undo: '<<',
  download: '[v]',
  view: '<o>',
  eye: '<o>',
  eyeOff: '<->',
  refresh: '(@)',
  logout: '[->',
  key: 'o-+',
  unlock: '[>]',
  lock: '[#]',
  warn: '/!\\',
  info: '(i)',
  pin: '@',
  money: '£',
  calendar: '[25]',
  user: '\\o/',
  order: '>_',
  list: '[=]',
  workshop: '{*}',
  chef: '(^)',
  offline: '(x)',
  error: '[!]',
  ok: '[ok]',
  skip: '(-)',
  menu: '[m]',
  form: '[f]',
  notes: '[=]',
  tree: '/\\',
  star: '*',
} as const;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, className = '' }: { name: GlyphName; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-block shrink-0 whitespace-pre font-mono font-bold leading-none ${className}`}>
      {GLYPHS[name]}
    </span>
  );
}
