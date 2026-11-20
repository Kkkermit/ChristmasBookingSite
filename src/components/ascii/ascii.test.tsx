import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { resetDesignForTests } from '../../lib/design';
import { AsciiArt } from './AsciiArt';
import { DesignPicker, DesignSwitcher } from './DesignSwitcher';
import { getRamp, rampChar } from './engine/atlas';
import { bauble, cottage, lamp, paintArt, presents, sleigh, snowman, village } from './engine/art';
import { EMPTY, FAM, code, shift } from './engine/palette';
import { renderTree, treeGeometry } from './engine/treeModel';
import { LOGO_TREE } from './tree';

afterEach(() => {
  resetDesignForTests();
  window.localStorage.clear();
});

const ramp = getRamp();
const text = (art: { cols: number; rows: number; glyph: string[] }) =>
  Array.from({ length: art.rows }, (_, r) => art.glyph.slice(r * art.cols, (r + 1) * art.cols).map((c) => c || ' ').join(''));

describe('procedural tree renderer', () => {
  const tree = renderTree({ rows: 90, aspect: 2, ramp, ground: true, seed: 2026 });

  it('fills a grid sized to the tree, every drawn cell with a glyph and a colour', () => {
    expect(tree.rows).toBe(90);
    expect(tree.cols).toBe(Math.ceil(treeGeometry(90, true).widthFactor * 90 * 2) | 1);
    for (let i = 0; i < tree.glyph.length; i++) expect(tree.glyph[i] === '').toBe(tree.colour[i] === EMPTY);
  });

  it('draws branches, a star, lights, baubles, presents and snow', () => {
    const families = new Set(Array.from(tree.colour).filter((c) => c !== EMPTY).map((c) => c >> 4));
    for (const fam of [FAM.green, FAM.gold, FAM.red, FAM.white, FAM.bark, FAM.snow]) expect(families.has(fam)).toBe(true);
    expect(tree.lights.length).toBeGreaterThan(25);
    expect(tree.lights.every((l) => l.y >= 0 && l.y <= 1 && tree.glyph[l.row * tree.cols + l.col] === 'o')).toBe(true);
    expect(tree.glyph[tree.star.row * tree.cols + tree.star.col]).not.toBe('');
    // The tree is wider at the bottom than at the top.
    const width = (row: number) => text(tree)[row].trim().length;
    expect(width(70)).toBeGreaterThan(width(20));
  });

  it('is identical on every load, and scales to any size', () => {
    const again = renderTree({ rows: 90, aspect: 2, ramp, ground: true, seed: 2026 });
    expect(again.glyph).toEqual(tree.glyph);
    const small = renderTree({ rows: 30, aspect: 2, ramp });
    expect(small.lights.length).toBeGreaterThan(3);
    expect(small.cols).toBeLessThan(tree.cols);
  });
});

describe('art pieces', () => {
  it('builds the cottage, snowman, lamp, presents and sleigh as tidy blocks', () => {
    for (const art of [cottage(), snowman(), lamp(), presents(), sleigh()]) {
      expect(art.glyph).toHaveLength(art.cols * art.rows);
      expect(art.colour.some((c) => c !== EMPTY)).toBe(true);
    }
    expect(lamp().lights).toHaveLength(1);
  });

  it('lays out a village as wide as asked, with the snowman in the middle', () => {
    const art = village(160, 32, 2, ramp);
    expect(art.cols).toBe(160);
    const rows = text(art);
    expect(rows.slice(-3).every((r) => r.trim().length > 120)).toBe(true);
    expect(rows.some((r) => r.slice(70, 90).includes('o   o'))).toBe(true);
  });

  it('shades a bauble with a cap and a highlight', () => {
    const art = bauble(3, 2, FAM.red, ramp, 6);
    expect(text(art)[6]).toContain('[=]');
    expect(Array.from(art.colour)).toContain(code(FAM.white, 1));
  });

  it('paints hand-drawn art by key, with twinkling lights', () => {
    const art = paintArt(['/\\', '@!'], (ch) => (ch === '@' ? '*' : 'g'));
    expect(art.lights).toHaveLength(1);
    expect(art.colour[0] >> 4).toBe(FAM.green);
  });

  it('maps brightness to characters and shifts colours within a family', () => {
    expect(rampChar(ramp, 0)).toBe(ramp[0]);
    expect(rampChar(ramp, 1)).toBe(ramp[ramp.length - 1]);
    expect(shift(code(FAM.red, 0.5), 20) & 15).toBe(15);
    expect(shift(code(FAM.red, 0.5), -20) & 15).toBe(0);
    expect(shift(code(FAM.red, 0.5), 2) >> 4).toBe(FAM.red);
  });

  it('keeps the little header logo rectangular', () => {
    expect(LOGO_TREE.lines.every((l) => l.length === LOGO_TREE.width)).toBe(true);
  });
});

describe('AsciiArt', () => {
  it('is decorative unless given a label', () => {
    const { container, rerender } = render(<AsciiArt lines={['/\\']} />);
    expect(container.querySelector('pre')).toHaveAttribute('aria-hidden', 'true');
    rerender(<AsciiArt lines={['/\\']} label="A tree" />);
    expect(screen.getByRole('img', { name: 'A tree' })).toBeInTheDocument();
  });
});

describe('backdrop picker', () => {
  it('switches design and shows which one is on', async () => {
    render(<DesignPicker />);
    expect(screen.getByRole('radio', { name: /Classic/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: /Code Rain/ }));
    expect(screen.getByRole('radio', { name: /Code Rain/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Classic/ })).toHaveAttribute('aria-checked', 'false');
    expect(window.localStorage.getItem('xmas-backdrop')).toBe('rain');
  });

  it('has a compact 1 / 2 / 3 switch for the login page', async () => {
    render(<DesignSwitcher />);
    await userEvent.click(screen.getByRole('radio', { name: 'Backdrop 2: 3D Spiral' }));
    expect(screen.getByRole('radio', { name: 'Backdrop 2: 3D Spiral' })).toHaveAttribute('aria-checked', 'true');
  });
});
