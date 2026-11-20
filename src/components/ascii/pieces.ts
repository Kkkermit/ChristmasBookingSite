import { art } from './AsciiArt';
import type { AsciiArt } from './tree';

/*
 * The ASCII art used around the site. Nothing here may mention the event
 * itself - this file is part of the public login page bundle.
 */

const pair = (lines: string[], mask: string[]): AsciiArt => ({ lines, mask });

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
