import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import type { Order, PublicConfig } from '../../shared/types';
import { ToastProvider } from '../components/Toasts';

export function renderWithToasts(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

export const config = (overrides: Partial<PublicConfig> = {}): PublicConfig => ({
  deadline: '2026-12-08T23:59:59.000Z',
  ordersOpen: true,
  partySize: 12,
  maxGuests: 18,
  restaurantName: 'Smokehouse & Cellar',
  ...overrides,
});

export const order = (overrides: Partial<Order> = {}): Order => ({
  id: 'o1',
  name: 'Josh',
  starter: 'smoked_chicken_wings',
  starterOption: '',
  main: 'ultimate_xmas_burger',
  mainOption: '',
  dessert: 'trillionaires_tart',
  dessertOption: '',
  notes: '',
  createdAt: '2026-11-20T10:00:00Z',
  updatedAt: '2026-11-20T10:00:00Z',
  ...overrides,
});

type Route = (url: string, init: RequestInit) => { status: number; body: unknown } | undefined;

/** Replaces fetch with a tiny router; records every call. */
export function mockFetch(route: Route) {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';
    calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const res = route(url, init) ?? { status: 404, body: { error: 'Not found' } };
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'content-type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}
