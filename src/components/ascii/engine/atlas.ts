import { COLOURS } from './palette';

/*
 * Glyph atlas: every (character, colour) pair is drawn once into an
 * offscreen canvas, then copied cell by cell with drawImage. Copying sprites
 * is much faster than fillText for thousands of characters per frame, and
 * because cells are whole device pixels the glyphs stay pin-sharp.
 */

export const FONT_FAMILY = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/** Cell size for a font size, in CSS px (JetBrains Mono: 0.6em advance; 1.18 line height). */
export const CHAR_W = 0.6;
export const LINE_H = 1.18;

/** Characters the shading can use, light to dense (re-sorted by measured ink coverage when possible). */
const CANDIDATES = ".'`,-:_;~\"^!*=+/\\|<>il1#%&@8";
const STATIC_RAMP = ".'`,-_:;~\"^!*=+<>/\\|il1#%&8@";

/** Star facets: dim to bright. */
export const STAR_CHARS = ".+*#@";

let ramp: string | null = null;

/** Characters ordered from least to most ink, measured in the real font. */
export function getRamp(): string {
  if (ramp) return ramp;
  try {
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 48;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return STATIC_RAMP;
    ctx.font = `36px ${FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const scored = Array.from(CANDIDATES).map((ch) => {
      ctx.clearRect(0, 0, 40, 48);
      ctx.fillStyle = '#fff';
      ctx.fillText(ch, 20, 24);
      const data = ctx.getImageData(0, 0, 40, 48).data;
      let ink = 0;
      for (let i = 3; i < data.length; i += 4) ink += data[i];
      return { ch, ink };
    });
    if (scored.every((s) => s.ink === 0)) return STATIC_RAMP;
    ramp = scored.sort((a, b) => a.ink - b.ink).map((s) => s.ch).join('');
    return ramp;
  } catch {
    return STATIC_RAMP;
  }
}

/** Character for a brightness in [0,1], using the slice [lo, hi] of the ramp. */
export function rampChar(r: string, lum: number, lo = 0, hi = 1): string {
  const t = lo + (lum < 0 ? 0 : lum > 1 ? 1 : lum) * (hi - lo);
  return r[Math.min(r.length - 1, Math.floor(t * r.length))];
}

export interface Atlas {
  /** Cell size in device pixels. */
  cw: number;
  ch: number;
  fontPx: number;
  dpr: number;
  /** Draws one character in a palette colour at device-pixel position (x, y). */
  draw(ctx: CanvasRenderingContext2D, char: string, colour: number, x: number, y: number): void;
  /**
   * Pre-renders every brightness of the given characters and colour families.
   * Adding glyphs mid-animation would force the browser to re-copy the whole
   * sheet on the next draw, so animations warm up everything they use first.
   */
  prewarm(chars: string, families: readonly number[]): void;
}

const atlases = new Map<string, Atlas>();

/** Forget all atlases (e.g. once the web font has loaded). */
export function resetAtlases() {
  atlases.clear();
  ramp = null;
}

export function cellSize(fontPx: number, dpr: number) {
  return { cw: Math.max(2, Math.round(fontPx * CHAR_W * dpr)), ch: Math.max(3, Math.round(fontPx * LINE_H * dpr)) };
}

export function getAtlas(fontPx: number, dpr: number): Atlas {
  const key = `${fontPx.toFixed(2)}@${dpr}`;
  const existing = atlases.get(key);
  if (existing) return existing;

  const { cw, ch } = cellSize(fontPx, dpr);
  const sheet = document.createElement('canvas');
  const perRow = Math.max(1, Math.floor(2048 / cw));
  sheet.width = perRow * cw;
  sheet.height = ch * 16;
  let sctx = sheet.getContext('2d')!;
  const slots = new Map<number, number>();
  let next = 0;

  const setFont = () => {
    sctx.font = `${fontPx * dpr}px ${FONT_FAMILY}`;
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
  };
  setFont();

  const slotFor = (char: string, colour: number) => {
    const key = colour * 128 + (char.charCodeAt(0) & 127);
    let slot = slots.get(key);
    if (slot === undefined) {
      slot = next++;
      const sy = Math.floor(slot / perRow) * ch;
      if (sy + ch > sheet.height) {
        // Grow the sheet, keeping what is already drawn.
        const copy = document.createElement('canvas');
        copy.width = sheet.width;
        copy.height = sheet.height;
        copy.getContext('2d')!.drawImage(sheet, 0, 0);
        sheet.height *= 2;
        sctx = sheet.getContext('2d')!;
        sctx.drawImage(copy, 0, 0);
        setFont();
      }
      sctx.fillStyle = COLOURS[colour];
      sctx.fillText(char, (slot % perRow) * cw + cw / 2, sy + ch / 2 + ch * 0.04);
      slots.set(key, slot);
    }
    return slot;
  };

  const atlas: Atlas = {
    cw,
    ch,
    fontPx,
    dpr,
    draw(ctx, char, colour, x, y) {
      const slot = slotFor(char, colour);
      ctx.drawImage(sheet, (slot % perRow) * cw, Math.floor(slot / perRow) * ch, cw, ch, x, y, cw, ch);
    },
    prewarm(chars, families) {
      const unique = Array.from(new Set(Array.from(chars)));
      for (const fam of families) for (let level = 0; level < 16; level++) for (const c of unique) slotFor(c, fam * 16 + level);
    },
  };
  atlases.set(key, atlas);
  return atlas;
}

const glows = new Map<string, HTMLCanvasElement>();

/** A soft round glow sprite in a colour (drawn scaled, usually with 'lighter' blending). */
export function glowSprite(rgb: string): HTMLCanvasElement {
  let sprite = glows.get(rgb);
  if (!sprite) {
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const g = sprite.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb},0.9)`);
    grad.addColorStop(0.25, `rgba(${rgb},0.35)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glows.set(rgb, sprite);
  }
  return sprite;
}
