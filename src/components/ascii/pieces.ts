import { art } from './AsciiArt';
import { buildTree, type AsciiArt } from './tree';

/*
 * The ASCII art used around the site. Nothing here may mention the event
 * itself - this file is part of the public login page bundle.
 */

/** Places pieces of art side by side, aligned along the bottom. */
export function hstack(pieces: Array<AsciiArt | number>): AsciiArt {
  const items = pieces.map((p) => (typeof p === 'number' ? { lines: [''], mask: [''], gap: p } : { ...p, gap: 0 }));
  const height = Math.max(...items.map((p) => p.lines.length));
  const lines = Array.from({ length: height }, () => '');
  const mask = Array.from({ length: height }, () => '');
  for (const item of items) {
    const w = item.gap || Math.max(...item.lines.map((l) => l.length));
    const offset = height - item.lines.length;
    for (let r = 0; r < height; r++) {
      const src = r - offset;
      lines[r] += (src >= 0 ? (item.lines[src] ?? '') : '').padEnd(w, ' ');
      mask[r] += (src >= 0 ? (item.mask[src] ?? '') : '').padEnd(w, ' ');
    }
  }
  return { lines, mask };
}

const pair = (lines: string[], mask: string[]): AsciiArt => ({ lines, mask });

export const SNOWMAN = pair(
  art`
   _===_
   (o.o)
 \/(~~~)\/
  (  :  )
 (___:___)
`,
  art`
   rrrrr
   wkwyw
 bbwrrrwbb
  ww w ww
 wwwwwwwww
`,
);

export const GIFT_RED = pair(
  art`
 _\/_
[_||_]
[_||_]
`,
  art`
 wwww
rrwwrr
rrwwrr
`,
);

export const GIFT_WHITE = pair(
  art`
 _\/_
[_##_]
`,
  art`
 rrrr
wwrrww
`,
);

const footerTree = (seed: number, tiers: number[], starts: number[]) =>
  buildTree({ tiers, starts, slope: 1.5, star: 'small', trunk: { width: 1, height: 1 }, lightDensity: 0.16, seed });

/** Snowy scene along the bottom of every page (centre stays visible on phones). */
export const FOOTER_SCENE = (() => {
  const scene = hstack([
    footerTree(3, [3, 4], [0, 2]),
    3,
    GIFT_WHITE,
    4,
    footerTree(9, [3, 4, 4], [0, 2, 3]),
    5,
    SNOWMAN,
    2,
    GIFT_RED,
    1,
    GIFT_WHITE,
    3,
    footerTree(14, [3, 4, 5], [0, 2, 3]),
    4,
    GIFT_RED,
    5,
    footerTree(21, [3, 4], [0, 2]),
    4,
    footerTree(30, [3, 4, 4], [0, 2, 3]),
  ]);
  const width = scene.lines[0].length;
  const ground = Array.from({ length: width }, (_, i) => ((i * 7) % 11 === 0 ? '*' : (i * 5) % 7 === 0 ? '.' : '~')).join('');
  return { lines: [...scene.lines, ground], mask: [...scene.mask, 'k'.repeat(width)] };
})();

/** Glossy bauble on a string, for the wide-screen side margins. */
export const ORNAMENT = (length: number, colour: 'r' | 'w'): AsciiArt => {
  const body = art`
  _|_
 /   \
|  *  |
 \___/
`;
  const other = colour === 'r' ? 'w' : 'r';
  const bodyMask = [`  ${other}${other}${other}`, ` ${colour}   ${colour}`, `${colour}  ${other}  ${colour}`, ` ${colour}${colour}${colour}${colour}${colour}`];
  return {
    lines: [...Array.from({ length }, () => '   |  '), ...body],
    mask: [...Array.from({ length }, () => '   k  '), ...bodyMask],
  };
};

/** Santa's sleigh and two reindeer, facing left (Rudolph leads). */
export const SLEIGH = pair(
  art`
 \_/    \_/          __
 (*)__  (")__    ___(oo)___
  /\ /\  /\ /\ ~~~\_______/
`,
  art`
 bbb    bbb          rr
 wrwbb  wwwbb    wwwrwwrrrr
  bbbbb  bbbbb kkkrrrrrrrrr
`,
);

/* ------------------------------------------------------- empty & error art */

export const ART_GIFT = pair(
  art`
  _   _
 ( \_/ )
__\_|_/__
|   |   |
|   |   |
|___|___|
`,
  art`
  w   w
 wwwwwww
rrwwwwwrr
r   w   r
r   w   r
rrrrwrrrr
`,
);

export const ART_LOCK = pair(
  art`
  ___
 / _ \
| | | |
[=====]
[  o  ]
[__|__]
`,
  art`
  www
 wwwww
ww   ww
rrrrrrr
r  w  r
rrrwrrr
`,
);

export const ART_TABLE_FULL = pair(
  art`
 .-~~-.
(      )
 \____/
 |____|
 o o o o
`,
  art`
 wwwwww
wwwwwwww
 wwwwww
 wwwwww
 r w r w
`,
);

export const ART_OFFLINE = pair(
  art`
 .-~~~~-.
/ .-~~-. \
  / .. \
    ()
   (x)
`,
  art`
 kkkkkkkk
kkkkkkkkkk
  kkkkkk
    ww
   rrr
`,
);

export const ART_DATABASE = pair(
  art`
 .-----.   z
(       ) z
|'-----'|z
|       |
'-------'
`,
  art`
 wwwwwww   s
wwwwwwwww s
wwwwwwwwws
w       w
wwwwwwwww
`,
);

export const ART_CRASH = pair(
  art`
 .-----.
 | x x |
 |  ~  |
 '--+--'
   /|\
`,
  art`
 wwwwwww
 w r r w
 w  w  w
 wwwwwww
   www
`,
);

export const ART_WARNING = pair(
  art`
   /\
  /  \
 / !! \
/______\
`,
  art`
   rr
  r  r
 r ww r
rrrrrrrr
`,
);

export const ART_BIN = pair(
  art`
  _|_
|=====|
 |||||
 |||||
 |___|
`,
  art`
  www
rrrrrrr
 wrwrw
 wrwrw
 wwwww
`,
);

export const ART_SNOWFLAKE = pair(
  art`
 \ | /
--(*)--
 / | \
`,
  art`
 w w w
rrwYwrr
 w w w
`,
);
