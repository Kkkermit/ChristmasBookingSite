import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { config, mockFetch, order, renderWithToasts } from '../test/utils';
import { OrderForm } from './OrderForm';

vi.mock('../lib/celebrate', () => ({ celebrate: vi.fn(), bigCelebration: vi.fn() }));

const noop = () => {};

describe('OrderForm', () => {
  it('only offers the dishes on the menu, as radio options', () => {
    renderWithToasts(<OrderForm config={config()} orders={[]} editing={null} onSaved={noop} onCancelEdit={noop} />);
    // 4 starters + skip, 5 mains (no skip), 4 desserts + skip
    expect(screen.getAllByRole('radio')).toHaveLength(15);
    expect(screen.getByRole('radio', { name: /Duck Liver & Pork Pâté/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /No starter/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /No main/ })).not.toBeInTheDocument();
  });

  it('highlights everything missing instead of submitting an empty order', async () => {
    const calls = mockFetch(() => undefined);
    renderWithToasts(<OrderForm config={config()} orders={[]} editing={null} onSaved={noop} onCancelEdit={noop} />);
    await userEvent.click(screen.getByRole('button', { name: /send my order to santa/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Please pick a starter')).toBeInTheDocument();
    expect(screen.getByText('Please pick a main')).toBeInTheDocument();
    expect(screen.getByText('Please pick a dessert')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('submits the chosen dishes and resets afterwards', async () => {
    const saved = order({ id: 'new', name: 'Amelia', starter: 'none', main: 'seabass', dessert: 'christmas_pudding', notes: 'No nuts' });
    const calls = mockFetch(() => ({ status: 201, body: { order: saved } }));
    const onSaved = vi.fn();
    renderWithToasts(<OrderForm config={config()} orders={[]} editing={null} onSaved={onSaved} onCancelEdit={noop} />);

    await userEvent.type(screen.getByPlaceholderText('Your name'), 'Amelia');
    await userEvent.click(screen.getByRole('radio', { name: /No starter/ }));
    await userEvent.click(screen.getByRole('radio', { name: /Seabass/ }));
    await userEvent.click(screen.getByRole('radio', { name: /Christmas Pudding/ }));
    await userEvent.type(screen.getByPlaceholderText(/nut allergy/), 'No nuts');
    await userEvent.click(screen.getByRole('button', { name: /send my order to santa/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved, true));
    expect(calls[0]).toEqual({
      url: '/api/orders',
      method: 'POST',
      body: { name: 'Amelia', starter: 'none', main: 'seabass', dessert: 'christmas_pudding', notes: 'No nuts' },
    });
    expect(screen.getByPlaceholderText('Your name')).toHaveValue('');
  });

  it('warns straight away if that name has already ordered', async () => {
    const calls = mockFetch(() => undefined);
    renderWithToasts(
      <OrderForm config={config()} orders={[order({ name: 'Josh' })]} editing={null} onSaved={noop} onCancelEdit={noop} />,
    );
    await userEvent.type(screen.getByPlaceholderText('Your name'), '  JOSH ');
    await userEvent.click(screen.getByRole('radio', { name: /Shrimp Cocktail/ }));
    await userEvent.click(screen.getByRole('radio', { name: /Seabass/ }));
    await userEvent.click(screen.getByRole('radio', { name: /No dessert/ }));
    await userEvent.click(screen.getByRole('button', { name: /send my order to santa/i }));

    expect(await screen.findByText(/already ordered/)).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('pre-fills an existing order for editing and saves with PUT', async () => {
    const existing = order();
    const calls = mockFetch(() => ({ status: 200, body: { order: { ...existing, main: 'turkey_dinner' } } }));
    const onSaved = vi.fn();
    const onCancel = vi.fn();
    renderWithToasts(<OrderForm config={config()} orders={[existing]} editing={existing} onSaved={onSaved} onCancelEdit={onCancel} />);

    expect(screen.getByText("✏️ Editing Josh's order")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toHaveValue('Josh');
    expect(screen.getByRole('radio', { name: /Ultimate Xmas Burger/ })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: /Turkey Dinner/ }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ ...existing, main: 'turkey_dinner' }, false));
    expect(calls[0]).toMatchObject({ url: '/api/orders/o1', method: 'PUT', body: { main: 'turkey_dinner' } });

    await userEvent.click(screen.getByRole('button', { name: /cancel editing/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows server-side field errors', async () => {
    mockFetch(() => ({
      status: 409,
      body: { error: 'Josh has already ordered', code: 'DUPLICATE', fieldErrors: { name: 'Someone with this name has already ordered' } },
    }));
    renderWithToasts(<OrderForm config={config()} orders={[]} editing={null} onSaved={noop} onCancelEdit={noop} />);
    await userEvent.type(screen.getByPlaceholderText('Your name'), 'Josh');
    await userEvent.click(screen.getByRole('radio', { name: /Shrimp Cocktail/ }));
    await userEvent.click(screen.getByRole('radio', { name: /Seabass/ }));
    await userEvent.click(screen.getByRole('radio', { name: /No dessert/ }));
    await userEvent.click(screen.getByRole('button', { name: /send my order to santa/i }));

    expect(await screen.findByText('Someone with this name has already ordered')).toBeInTheDocument();
  });

  it('is replaced by a notice once orders have closed', () => {
    renderWithToasts(
      <OrderForm config={config({ ordersOpen: false })} orders={[]} editing={null} onSaved={noop} onCancelEdit={noop} />,
    );
    expect(screen.getByText('Orders are closed')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('is replaced by a notice when the table is full', () => {
    const orders = Array.from({ length: 18 }, (_, i) => order({ id: String(i), name: `G${i}` }));
    renderWithToasts(<OrderForm config={config()} orders={orders} editing={null} onSaved={noop} onCancelEdit={noop} />);
    expect(screen.getByText('The table is full!')).toBeInTheDocument();
  });
});
