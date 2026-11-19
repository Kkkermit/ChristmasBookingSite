import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { config, mockFetch, order } from './test/utils';

vi.mock('./lib/celebrate', () => ({ celebrate: vi.fn(), bigCelebration: vi.fn() }));

const emptyDetails = {
  bookingName: '',
  contactNumber: '',
  email: '',
  bookingDate: '',
  bookingTime: '',
  companyName: '',
  secondaryNumber: '',
  address: '',
};

describe('App', () => {
  it('shows only the password gate when not logged in', async () => {
    const calls = mockFetch((url) => (url === '/api/auth/session' ? { status: 200, body: { authenticated: false } } : undefined));
    render(<App />);
    expect(await screen.findByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByText('Place your order')).not.toBeInTheDocument();
    expect(calls.map((c) => c.url)).toEqual(['/api/auth/session']);
  });

  it('loads the orders once logged in', async () => {
    mockFetch((url) => {
      if (url === '/api/auth/session') return { status: 200, body: { authenticated: true } };
      if (url === '/api/state') {
        return { status: 200, body: { config: config(), orders: [order({ name: 'Josh' })], details: emptyDetails } };
      }
      return undefined;
    });
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Place your order/ })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Josh' })).toBeInTheDocument();
    expect(screen.getByText(/elves have ordered/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download booking form/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /download menu/i })).toHaveAttribute('href', '/files/smokehouse-christmas-menu-2026.pdf');
  });

  it('shows a skeleton while loading, then a retryable error if the database is down', async () => {
    let fail = true;
    mockFetch((url) => {
      if (url === '/api/auth/session') return { status: 200, body: { authenticated: true } };
      if (url === '/api/state') {
        return fail
          ? { status: 503, body: { error: "Can't reach the North Pole database right now", code: 'DB_UNAVAILABLE' } }
          : { status: 200, body: { config: config(), orders: [], details: emptyDetails } };
      }
      return undefined;
    });
    render(<App />);
    expect(await screen.findByRole('status', { name: 'Loading the orders' })).toBeInTheDocument();
    expect(await screen.findByText('The database is napping')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
  });

  it('returns to the password gate if the session expires', async () => {
    mockFetch((url) => {
      if (url === '/api/auth/session') return { status: 200, body: { authenticated: true } };
      if (url === '/api/state') return { status: 401, body: { error: 'Please enter the password first', code: 'UNAUTHENTICATED' } };
      return undefined;
    });
    render(<App />);
    expect(await screen.findByLabelText('Password')).toBeInTheDocument();
  });

  it('logs out', async () => {
    const calls = mockFetch((url) => {
      if (url === '/api/auth/session') return { status: 200, body: { authenticated: true } };
      if (url === '/api/state') return { status: 200, body: { config: config(), orders: [], details: emptyDetails } };
      if (url === '/api/auth/logout') return { status: 200, body: { authenticated: false } };
      return undefined;
    });
    render(<App />);
    await userEvent.click(await screen.findByRole('button', { name: /log out/i }));
    expect(await screen.findByLabelText('Password')).toBeInTheDocument();
    expect(calls.some((c) => c.url === '/api/auth/logout' && c.method === 'POST')).toBe(true);
  });
});
