import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { resetDesignForTests } from '../../lib/design';
import { AsciiArt } from './AsciiArt';
import { DesignPicker, DesignSwitcher } from './DesignSwitcher';
import { FOOTER_SCENE, SLEIGH, SNOWMAN } from './pieces';
import { BIG_TREE, LOGIN_TREE, LOGO_TREE, buildTree } from './tree';

afterEach(() => {
  resetDesignForTests();
  window.localStorage.clear();
});

describe('ASCII trees', () => {
  it.each([
    ['big', BIG_TREE],
    ['login', LOGIN_TREE],
    ['logo', LOGO_TREE],
  ])('%s tree has a colour for every character', (_, tree) => {
    expect(tree.lines).toHaveLength(tree.height);
    for (let row = 0; row < tree.lines.length; row++) {
      expect(tree.lines[row]).toHaveLength(tree.width);
      expect(tree.mask[row]).toHaveLength(tree.width);
      for (let col = 0; col < tree.width; col++) {
        expect(tree.lines[row][col] === ' ').toBe(tree.mask[row][col] === ' ');
      }
    }
  });

  it('puts a star on top, lights in the branches and a trunk at the bottom', () => {
    expect(BIG_TREE.mask[1]).toContain('Y');
    expect(BIG_TREE.lights.length).toBeGreaterThan(20);
    expect(BIG_TREE.lights.every((l) => l.y > 0 && l.y < 1)).toBe(true);
    expect(BIG_TREE.lines.some((l) => l.includes('|||||'))).toBe(true);
  });

  it('is the same on every load', () => {
    const again = buildTree({ tiers: [6, 7, 8, 9], starts: [0, 4, 7, 10], slope: 1.6, star: 'big', trunk: { width: 5, height: 3 }, lightDensity: 0.085, garlands: 4, presents: true, ground: true, seed: 2026 });
    expect(again.lines).toEqual(BIG_TREE.lines);
  });

  it('keeps the other art pieces rectangular with matching masks', () => {
    for (const art of [SNOWMAN, SLEIGH, FOOTER_SCENE]) {
      const width = art.lines[0].length;
      expect(art.lines.every((l) => l.length === width)).toBe(true);
      expect(art.mask.every((m) => m.length <= width)).toBe(true);
    }
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
