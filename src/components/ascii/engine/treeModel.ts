import { STAR_CHARS, rampChar } from './atlas';
import { clamp01, fbm, hash2, noise2, random } from './noise';
import { EMPTY, FAM, code } from './palette';

/*
 * A procedural Christmas tree, "rendered" into a grid of characters: every
 * cell gets a glyph (by brightness, from a measured density ramp) and a
 * colour. Layered drooping branches with needle texture and lighting,
 * snow on the branch tips, tinsel and bead garlands, shaded baubles with
 * highlights, a bevelled star, bark, wrapped presents and snowy ground.
 *
 * Coordinates: v runs 0 (top) -> 1 (bottom) over the scene height; u is the
 * horizontal offset from the centre in the same units (so shapes are round
 * even though character cells are tall).
 */

export interface Light {
  col: number;
  row: number;
  /** 0 at the top of the tree, 1 at the bottom (used to switch lights on as you scroll). */
  y: number;
  /** 0 red, 1 white, 2 gold, 3 pink */
  hue: number;
  phase: number;
  speed: number;
}

export interface TreeScene {
  cols: number;
  rows: number;
  glyph: string[];
  colour: Uint8Array;
  lights: Light[];
  star: { col: number; row: number };
}

export interface TreeOptions {
  rows: number;
  /** Character cell height / width. */
  aspect: number;
  ramp: string;
  seed?: number;
  /** Snowy ground with presents under the tree. */
  ground?: boolean;
  /** Draw the branches (the 3D spiral draws its own). */
  foliage?: boolean;
  /** Baubles, garlands and lights. */
  decorations?: boolean;
  /** The star on top (the 3D spiral spins its own). */
  star?: boolean;
}

export interface TreeGeometry {
  vStar: number;
  starOuter: number;
  starInner: number;
  vTop: number;
  vBot: number;
  Hf: number;
  maxHW: number;
  tiers: number;
  trunkEnd: number;
  groundAt: number;
  widthFactor: number;
}

export function treeGeometry(rows: number, ground: boolean): TreeGeometry {
  const vTop = 0.085;
  const vBot = ground ? 0.8 : 0.9;
  const Hf = vBot - vTop;
  const maxHW = 0.36 * Hf;
  return {
    vStar: 0.052,
    starOuter: 0.05,
    starInner: 0.021,
    vTop,
    vBot,
    Hf,
    maxHW,
    tiers: rows >= 80 ? 7 : rows >= 48 ? 6 : 5,
    trunkEnd: ground ? 0.9 : 0.985,
    groundAt: 0.895,
    widthFactor: ground ? 2 * maxHW * 1.32 : 2 * maxHW * 1.08,
  };
}

/** Half-width of the branches at s (0 = tip, 1 = bottom), with the layered saw-tooth flare. */
export function layerWidth(g: TreeGeometry, s: number): { hw: number; f: number; k: number } {
  const sc = Math.min(Math.max(s, 0), 0.99999);
  const tp = sc * g.tiers;
  const k = Math.floor(tp);
  const f = tp - k;
  const base = (0.05 + 0.95 * sc) * g.maxHW;
  return { hw: base * (0.64 + 0.36 * Math.pow(f, 0.75)), f, k };
}

/** Star glyph: a bright core, '*' on lit facets, '+' on shaded ones, '.' at the tips. */
export function starChar(core: number, facet: number, lum: number): string {
  if (core < 0.55) return STAR_CHARS[4];
  if (lum < 0.5) return STAR_CHARS[0];
  return facet > 0 ? STAR_CHARS[2] : STAR_CHARS[1];
}

/** Lifts the dark end so shading reads on a black page. */
export const tone = (l: number) => clamp01(Math.pow(clamp01(l), 0.72) * 1.08);

const M_LEAF = 1;
const M_GARLAND = 2;
const M_OTHER = 3;

export function renderTree(opts: TreeOptions): TreeScene {
  const R = opts.rows;
  const ground = opts.ground ?? false;
  const g = treeGeometry(R, ground);
  const aspect = opts.aspect;
  const cols = Math.ceil(g.widthFactor * R * aspect) | 1;
  const seed = opts.seed ?? 7;
  const ramp = opts.ramp;
  const rand = random(seed * 977 + R);
  const n = cols * R;
  const glyph: string[] = new Array(n).fill('');
  const colour = new Uint8Array(n).fill(EMPTY);
  const mat = new Uint8Array(n);
  const lights: Light[] = [];

  const uAt = (col: number) => (col + 0.5 - cols / 2) / (R * aspect);
  const vAt = (row: number) => (row + 0.5) / R;
  const colOf = (u: number) => Math.floor(u * R * aspect + cols / 2);
  const rowOf = (v: number) => Math.floor(v * R);
  const set = (i: number, ch: string, c: number, m: number) => {
    glyph[i] = ch;
    colour[i] = c;
    mat[i] = m;
  };
  const lightY = (row: number) => clamp01((vAt(row) - g.vTop) / g.Hf);
  const addLight = (col: number, row: number) => {
    const r = rand();
    lights.push({ col, row, y: lightY(row), hue: r < 0.42 ? 0 : r < 0.72 ? 1 : r < 0.92 ? 2 : 3, phase: rand() * Math.PI * 2, speed: 0.6 + rand() * 1.2 });
  };

  /* ---------------------------------------------------------- snowy ground */
  if (ground) {
    for (let row = 0; row < R; row++) {
      const v = vAt(row);
      for (let col = 0; col < cols; col++) {
        const u = uAt(col);
        const surface = g.groundAt + 0.011 * Math.sin(u * 9 + 0.7) + 0.006 * Math.sin(u * 27 + 2);
        if (v < surface) continue;
        const depth = v - surface;
        const shadow = Math.exp(-((u / (g.maxHW * 1.2)) ** 2) - ((v - g.groundAt - 0.01) / 0.03) ** 2);
        let lum = (0.78 - depth * 3 + 0.14 * noise2(col * 0.35, row * 0.8, seed + 31)) * (1 - 0.55 * shadow);
        const i = row * cols + col;
        if (depth < 0.9 / R) {
          set(i, lum > 0.5 ? '~' : '-', code(FAM.snow, lum + 0.1), M_OTHER);
        } else if (hash2(col, row, seed + 3) > 0.985) {
          set(i, '*', code(FAM.snow, 1), M_OTHER);
        } else {
          lum = clamp01(lum);
          set(i, rampChar(ramp, lum * 0.55, 0.02, 0.6), code(FAM.snow, lum * 0.9), M_OTHER);
        }
      }
    }
  }

  /* ----------------------------------------------------------------- trunk */
  for (let row = rowOf(g.vBot - 0.05); row < Math.min(R, rowOf(g.trunkEnd) + 1); row++) {
    const v = vAt(row);
    const t = clamp01((v - g.vBot) / Math.max(0.01, g.trunkEnd - g.vBot));
    const tw = g.maxHW * (0.085 + 0.045 * t);
    for (let col = colOf(-tw); col <= colOf(tw); col++) {
      if (col < 0 || col >= cols) continue;
      const u = uAt(col);
      if (Math.abs(u) > tw) continue;
      const lum = (0.3 + 0.4 * noise2(col * 0.9, row * 0.15, seed + 7)) * (0.35 + 0.65 * t) * (1 - 0.4 * (u / tw));
      const bark = '|!l|I:|';
      set(row * cols + col, bark[Math.floor(hash2(col, Math.floor(row / 2), seed) * bark.length)], code(FAM.bark, lum), M_OTHER);
    }
  }

  /* -------------------------------------------------------------- branches */
  if (opts.foliage !== false) {
    // First pass: which layer (if any) covers each cell.
    const tier = new Int8Array(n).fill(-1);
    const fArr = new Float32Array(n);
    const hwArr = new Float32Array(n);
    const hang = new Uint8Array(n);
    for (let row = rowOf(g.vTop); row < R; row++) {
      const v = vAt(row);
      const s = (v - g.vTop) / g.Hf;
      if (s > 1.08) break;
      for (let col = 0; col < cols; col++) {
        const u = uAt(col);
        const jag = 1 + 0.13 * (fbm(row * 0.5, col * 0.11 + (u < 0 ? 3 : 9), seed, 2) - 0.5);
        const i = row * cols + col;
        if (s <= 1) {
          const { hw, f, k } = layerWidth(g, s);
          if (Math.abs(u) <= hw * jag) {
            tier[i] = k;
            fArr[i] = f;
            hwArr[i] = hw * jag;
            continue;
          }
        }
        // Drooping tips of the layer above hang over the top of the next one.
        const tp = Math.min(s, 1.2) * g.tiers;
        const above = s > 1 ? g.tiers - 1 : Math.floor(tp) - 1;
        if (above < 0) continue;
        const into = tp - (above + 1);
        const aboveHW = (0.05 + 0.95 * Math.min(1, (above + 1) / g.tiers)) * g.maxHW * jag;
        const scallop = 0.32 * (0.25 + 0.75 * Math.abs(Math.sin((u / aboveHW) * Math.PI * 4.5 + above * 1.7)));
        if (into >= 0 && into < scallop && Math.abs(u) <= aboveHW * (1 - into * 0.5)) {
          tier[i] = above;
          fArr[i] = 1;
          hwArr[i] = aboveHW;
          hang[i] = 1;
        }
      }
    }
    // Second pass: light and texture each needle.
    for (let row = 0; row < R; row++) {
      const v = vAt(row);
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        if (tier[i] < 0) continue;
        const u = uAt(col);
        const hw = hwArr[i];
        const f = fArr[i];
        const nx = Math.max(-1, Math.min(1, u / hw));
        const nz = Math.sqrt(1 - nx * nx);
        const diffuse = 0.2 + 0.62 * nz - 0.3 * nx;
        const layer = hang[i] ? 0.88 : 0.3 + 0.7 * Math.pow(f, 1.3);
        // Branches: soft diagonal streaks running down and out from the trunk.
        const streak = 0.5 + 0.5 * Math.sin((v - Math.abs(u) * 0.8) * R * 1.15 + fbm(col * 0.08, row * 0.16, seed + 5, 2) * 5);
        const grain = noise2(col * 0.5, row * 0.7, seed + 9);
        const lum = tone(diffuse * layer * (0.5 + 0.34 * streak + 0.16 * grain));
        const left = col > 0 && tier[i - 1] >= 0;
        const right = col < cols - 1 && tier[i + 1] >= 0;
        // Snow resting on the branch tips (mostly on the lit side).
        if ((f > 0.84 || hang[i]) && noise2(col * 0.45, row * 1.1, seed + 21) > 0.6 - 0.15 * Math.max(0, -nx)) {
          const flake = ".'~*\"";
          set(i, flake[Math.floor(hash2(col, row, seed + 2) * flake.length)], code(FAM.snow, 0.65 + 0.35 * lum), M_LEAF);
          continue;
        }
        let ch: string;
        if (!left) ch = '/';
        else if (!right) ch = '\\';
        else ch = rampChar(ramp, lum, 0.04, 0.9);
        set(i, ch, code(FAM.green, 0.08 + lum * 0.86 + 0.06 * grain), M_LEAF);
      }
    }

    /* --------------------------------------------------------- decorations */
    if (opts.decorations !== false) {
      // Garlands: alternating gold tinsel and red/white bead strands, swooping across each layer.
      const strands = g.tiers - 1;
      const every = Math.max(4, Math.round(R * aspect * 0.028));
      for (let s = 0; s < strands; s++) {
        const sg = (s + 0.66) / g.tiers;
        const vg = g.vTop + sg * g.Hf;
        const hwg = (0.05 + 0.95 * sg) * g.maxHW;
        const tilt = (s % 2 ? 1 : -1) * 0.14;
        const sag = 0.035 * g.Hf;
        const tinsel = s % 2 === 0;
        let count = 0;
        for (let col = colOf(-hwg); col <= colOf(hwg); col++) {
          if (col < 0 || col >= cols) continue;
          const u = uAt(col);
          const vc = vg + tilt * u + sag * (1 - (u / hwg) ** 2);
          const row = rowOf(vc);
          if (row < 0 || row >= R) continue;
          const i = row * cols + col;
          if (mat[i] !== M_LEAF || glyph[i] === '/' || glyph[i] === '\\') continue;
          const shine = 0.55 + 0.45 * noise2(col * 0.8, row, seed + 41);
          if (tinsel) {
            set(i, (col & 1) === 0 ? '~' : '-', code(FAM.gold, shine), M_GARLAND);
          } else {
            const bead = (col >> 1) & 1;
            set(i, (col & 1) === 0 ? 'o' : '-', code(bead ? FAM.red : FAM.white, 0.45 + 0.5 * shine), M_GARLAND);
          }
          if (count++ % every === Math.floor(every / 2)) addLight(col, row);
        }
      }

      // A few more fairy lights scattered through the branches.
      const extra = Math.round((cols * R) / 260);
      for (let tries = 0, made = 0; tries < extra * 20 && made < extra; tries++) {
        const col = Math.floor(rand() * cols);
        const row = Math.floor(rand() * R);
        const i = row * cols + col;
        if (mat[i] !== M_LEAF || glyph[i] === '/' || glyph[i] === '\\') continue;
        if (lights.some((l) => Math.abs(l.col - col) < 3 && Math.abs(l.row - row) < 2)) continue;
        addLight(col, row);
        made++;
      }

      // Baubles: shaded spheres with a highlight and a little cap.
      const rb = Math.max(0.017, 2.3 / R);
      const want = Math.min(30, Math.round(8 + R / 6));
      const placed: Array<{ u: number; v: number; fam: number }> = [];
      for (let tries = 0; tries < 600 && placed.length < want; tries++) {
        const v = g.vTop + g.Hf * (0.14 + rand() * 0.82);
        const { hw } = layerWidth(g, (v - g.vTop) / g.Hf);
        const u = (rand() * 2 - 1) * hw * 0.8;
        if (placed.some((p) => (p.u - u) ** 2 + (p.v - v) ** 2 < (rb * 2.9) ** 2)) continue;
        const r = rand();
        placed.push({ u, v, fam: r < 0.55 ? FAM.red : r < 0.82 ? FAM.white : FAM.gold });
      }
      for (const b of placed) {
        for (let row = rowOf(b.v - rb) - 1; row <= rowOf(b.v + rb) + 1; row++) {
          if (row < 0 || row >= R) continue;
          for (let col = colOf(b.u - rb) - 1; col <= colOf(b.u + rb) + 1; col++) {
            if (col < 0 || col >= cols) continue;
            const nx = (uAt(col) - b.u) / rb;
            const ny = (vAt(row) - b.v) / rb;
            const r2 = nx * nx + ny * ny;
            if (r2 > 1) continue;
            const nz = Math.sqrt(1 - r2);
            const diff = Math.max(0, -0.45 * nx - 0.55 * ny + 0.7 * nz);
            const spec = Math.pow(Math.max(0, -0.24 * nx - 0.3 * ny + 0.92 * nz), 26);
            const lum = tone(0.12 + 0.75 * diff + 0.9 * spec);
            let ch = rampChar(ramp, lum, 0.2, 0.92);
            if (r2 > 0.62 && Math.abs(nx) > 0.72) ch = nx < 0 ? '(' : ')';
            set(row * cols + col, ch, spec > 0.45 ? code(FAM.white, 1) : code(b.fam, lum), M_OTHER);
          }
        }
        const capRow = rowOf(b.v - rb) - 1;
        const capCol = colOf(b.u);
        if (capRow >= 0 && capCol >= 0 && capCol < cols) set(capRow * cols + capCol, '=', code(FAM.gold, 0.55), M_OTHER);
      }
    }
  }

  /* -------------------------------------------------------------- presents */
  if (ground) {
    const base = g.groundAt + 0.006;
    const boxes = [
      { at: 0.86, w: 0.3, h: 0.19, fam: FAM.green, ribbon: FAM.gold, paper: ':' },
      { at: -0.88, w: 0.4, h: 0.26, fam: FAM.red, ribbon: FAM.white, paper: '%' },
      { at: 0.5, w: 0.36, h: 0.24, fam: FAM.gold, ribbon: FAM.red, paper: '/' },
      { at: -0.47, w: 0.3, h: 0.17, fam: FAM.white, ribbon: FAM.red, paper: '+' },
    ];
    for (const box of boxes) {
      const cx = box.at * g.maxHW * 1.05;
      const w = box.w * g.maxHW;
      const h = box.h * g.maxHW;
      const d = h * 0.34;
      const skew = 0.7;
      const top = base - h;
      const cellW = 1 / (R * aspect);
      const cellH = 1 / R;
      for (let row = rowOf(top - d - 0.03); row <= rowOf(base); row++) {
        if (row < 0 || row >= R) continue;
        const v = vAt(row);
        for (let col = colOf(cx - w / 2) - 1; col <= colOf(cx + w / 2 + d * skew) + 1; col++) {
          if (col < 0 || col >= cols) continue;
          const u = uAt(col);
          let ch = '';
          let fam: number = box.fam;
          let lum = 0;
          if (Math.abs(u - cx) <= w / 2 && v >= top && v <= base) {
            // Front face: paper pattern, ribbon cross, crisp edges.
            const x = u - cx;
            lum = 0.62 - 0.2 * (x / w);
            ch = (col + row) % 3 === 0 ? box.paper : box.paper === '/' ? '/' : (col + row) & 1 ? '.' : box.paper;
            if (box.fam === FAM.white && ((col >> 1) + row) % 3 === 0) {
              ch = '*';
              fam = FAM.red;
            }
            if (Math.abs(x) < w * 0.08) {
              ch = '#';
              fam = box.ribbon;
              lum = 0.85;
            } else if (Math.abs(v - (top + h / 2)) < h * 0.09) {
              ch = '=';
              fam = box.ribbon;
              lum = 0.85;
            }
            if (x < -w / 2 + cellW) ch = '|';
            else if (x > w / 2 - cellW) ch = '|';
            else if (v > base - cellH) ch = '_';
            if (ch === '|' || ch === '_') {
              fam = box.fam;
              lum = 0.35;
            }
          } else if (v < top && v >= top - d) {
            // Top face, seen from slightly above.
            const t = top - v;
            const shift = t * skew;
            if (u >= cx - w / 2 + shift && u <= cx + w / 2 + shift) {
              ch = t < cellH ? '_' : '=';
              lum = 0.9;
              if (Math.abs(u - shift - cx) < w * 0.08 || Math.abs(t - d / 2) < d * 0.2) {
                ch = '#';
                fam = box.ribbon;
                lum = 0.95;
              }
            }
          } else if (u > cx + w / 2 && u <= cx + w / 2 + d * skew) {
            // Right side face, in shadow.
            const off = (u - cx - w / 2) / skew;
            if (v >= top - off && v <= base - off) {
              ch = '/';
              lum = 0.32;
              if (Math.abs(v - (top + h / 2 - off)) < h * 0.09) {
                fam = box.ribbon;
                lum = 0.5;
              }
            }
          }
          // Bow on top.
          const bx = cx + (d / 2) * skew;
          const by = top - d / 2 - 0.016;
          for (const side of [-1, 1]) {
            const ex = (u - (bx + side * w * 0.12)) / (w * 0.12);
            const ey = (v - by) / 0.018;
            const e = ex * ex + ey * ey;
            if (e < 1 && e > 0.3) {
              ch = e > 0.75 ? (ex * side < 0 ? '(' : ')') : 'o';
              fam = box.ribbon;
              lum = 0.8 - 0.2 * ey;
            }
          }
          if (!ch) continue;
          set(row * cols + col, ch, code(fam, clamp01(lum)), M_OTHER);
        }
      }
    }
  }

  /* ------------------------------------------------------------------ star */
  const starRow = rowOf(g.vStar);
  const starCol = colOf(0);
  if (opts.star !== false) for (let row = rowOf(g.vStar - g.starOuter) - 1; row <= rowOf(g.vStar + g.starOuter) + 1; row++) {
    if (row < 0 || row >= R) continue;
    const dv = vAt(row) - g.vStar;
    for (let col = colOf(-g.starOuter) - 1; col <= colOf(g.starOuter) + 1; col++) {
      if (col < 0 || col >= cols) continue;
      const du = uAt(col);
      const r = Math.hypot(du, dv);
      const a = Math.atan2(du, -dv);
      const rs = g.starInner + (g.starOuter - g.starInner) * Math.pow(Math.abs(Math.cos(2.5 * a)), 2.4);
      if (r > rs) continue;
      const facet = Math.sin(5 * a) > 0 ? -1 : 1;
      const lum = clamp01(0.62 + 0.22 * facet * (r / rs) + 0.35 * (1 - r / rs));
      set(row * cols + col, starChar(r / g.starInner, facet, lum), r < g.starInner * 0.55 ? code(FAM.white, 1) : code(FAM.gold, lum), M_OTHER);
    }
  }

  // Lights only where branches or garlands still show.
  const visibleLights = lights.filter((l) => {
    const i = l.row * cols + l.col;
    if (mat[i] !== M_LEAF && mat[i] !== M_GARLAND) return false;
    glyph[i] = 'o';
    colour[i] = code([FAM.red, FAM.white, FAM.gold, FAM.pink][l.hue], 0.35);
    return true;
  });

  return { cols, rows: R, glyph, colour, lights: visibleLights, star: { col: starCol, row: starRow } };
}

/** Light colours: [palette family, glow rgb]. */
export const LIGHT_HUES: Array<{ fam: number; rgb: string }> = [
  { fam: FAM.red, rgb: '255,60,85' },
  { fam: FAM.white, rgb: '255,255,255' },
  { fam: FAM.gold, rgb: '255,214,120' },
  { fam: FAM.pink, rgb: '255,140,180' },
];
