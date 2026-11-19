import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithToasts } from '../test/utils';
import { LoginScreen } from './LoginScreen';

vi.mock('../lib/celebrate', () => ({ celebrate: vi.fn(), bigCelebration: vi.fn() }));

describe('LoginScreen', () => {
  it('keeps the unlock button disabled until something is typed', () => {
    renderWithToasts(<LoginScreen onSuccess={() => {}} />);
    expect(screen.getByRole('button', { name: /unlock the grotto/i })).toBeDisabled();
  });

  it('shows an error and stays locked when the password is wrong', async () => {
    mockFetch(() => ({ status: 401, body: { error: "That's not the magic word. Try again!", code: 'BAD_PASSWORD' } }));
    const onSuccess = vi.fn();
    renderWithToasts(<LoginScreen onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Password'), 'mince pies');
    await userEvent.click(screen.getByRole('button', { name: /unlock the grotto/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent("That's not the magic word");
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('sends the password to the API and lets you in when it is right', async () => {
    const calls = mockFetch(() => ({ status: 200, body: { authenticated: true } }));
    const onSuccess = vi.fn();
    renderWithToasts(<LoginScreen onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Password'), 'open sesame{Enter}');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ url: '/api/auth/login', method: 'POST', body: { password: 'open sesame' } }]);
  });

  it('can reveal the password', async () => {
    renderWithToasts(<LoginScreen onSuccess={() => {}} />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});
