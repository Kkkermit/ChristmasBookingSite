import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { order } from '../test/utils';
import { NiceList } from './NiceList';

describe('NiceList', () => {
  const orders = [
    order({ id: 'a', name: 'Amelia Jones', starter: 'none', notes: 'Coeliac' }),
    order({ id: 'b', name: 'Ben' }),
  ];

  it('shows an encouraging empty state', () => {
    render(<NiceList orders={[]} mine={new Set()} canEdit editingId={null} highlightId={null} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('No orders yet')).toBeInTheDocument();
  });

  it('lists each order with its dishes, notes and a "You" badge for my own', () => {
    render(<NiceList orders={orders} mine={new Set(['b'])} canEdit editingId={null} highlightId={null} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const amelia = screen.getByRole('heading', { name: 'Amelia Jones' }).closest('li')!;
    expect(within(amelia).getByText('No starter')).toBeInTheDocument();
    expect(within(amelia).getByText('Ultimate Xmas Burger')).toBeInTheDocument();
    expect(within(amelia).getByText(/Coeliac/)).toBeInTheDocument();
    expect(within(amelia).queryByText('You')).not.toBeInTheDocument();
    const ben = screen.getByRole('heading', { name: 'Ben' }).closest('li')!;
    expect(within(ben).getByText('You')).toBeInTheDocument();
  });

  it('wires up edit and delete', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<NiceList orders={orders} mine={new Set()} canEdit editingId={null} highlightId={null} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: "Edit Ben's order" }));
    expect(onEdit).toHaveBeenCalledWith(orders[1]);
    await userEvent.click(screen.getByRole('button', { name: "Delete Amelia Jones's order" }));
    expect(onDelete).toHaveBeenCalledWith(orders[0]);
  });

  it('hides edit and delete once orders are locked', () => {
    render(<NiceList orders={orders} mine={new Set()} canEdit={false} editingId={null} highlightId={null} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
