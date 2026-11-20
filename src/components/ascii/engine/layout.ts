import { LINE_H, cellSize, type Atlas } from './atlas';
import { EMPTY, shift } from './palette';
import { treeGeometry, type TreeScene } from './treeModel';

export interface TreeLayout {
  fontPx: number;
  dpr: number;
  /** Cell size in device pixels. */
  cw: number;
  ch: number;
  rows: number;
  cols: number;
  /** Size of the whole tree scene in CSS pixels. */
  widthCss: number;
  heightCss: number;
}

/**
 * Picks the character size and grid for a tree that fills `share` of the
 * screen height without being wider than the screen. Smaller screens get
 * smaller characters, so the tree keeps its detail everywhere.
 */
export function treeLayout(viewW: number, viewH: number, dpr: number, opts: { ground: boolean; small: boolean; share?: number; detail?: number }): TreeLayout {
  const widthFactor = treeGeometry(100, opts.ground).widthFactor;
  const heightCss = Math.max(120, Math.min(viewH * (opts.share ?? 0.86), (viewW * 0.98) / widthFactor));
  const targetRows = opts.detail ?? (opts.small ? 92 : 112);
  const fontPx = Math.min(10, Math.max(opts.small ? 3.6 : 4.2, heightCss / (targetRows * LINE_H)));
  const { cw, ch } = cellSize(fontPx, dpr);
  const rows = Math.max(24, Math.floor((heightCss * dpr) / ch));
  const cols = Math.ceil(treeGeometry(rows, opts.ground).widthFactor * rows * (ch / cw)) | 1;
  return { fontPx, dpr, cw, ch, rows, cols, widthCss: (cols * cw) / dpr, heightCss: (rows * ch) / dpr };
}

/** Draws a whole scene (device pixels), optionally dimmed by some brightness levels. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Pick<TreeScene, 'cols' | 'rows' | 'glyph' | 'colour'>, atlas: Atlas, x0 = 0, y0 = 0, dim = 0) {
  const { cols, rows, glyph, colour } = scene;
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * atlas.ch;
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col;
      const c = colour[i];
      if (c === EMPTY) continue;
      atlas.draw(ctx, glyph[i], dim ? shift(c, -dim) : c, x0 + col * atlas.cw, y);
    }
  }
}
