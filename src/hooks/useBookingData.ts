import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, BookingDetails, Order } from '../../shared/types';
import { ApiError, api } from '../lib/api';

const POLL_MS = 20_000;

function byCreated(a: Order, b: Order) {
  return a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name);
}

/**
 * Loads the shared state and keeps it fresh (polling + on tab focus) so you
 * see other people's orders appear without refreshing.
 */
export function useBookingData(onUnauthenticated: () => void) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const unauthRef = useRef(onUnauthenticated);
  unauthRef.current = onUnauthenticated;

  const reload = useCallback(async () => {
    try {
      const next = await api.state();
      setState(next);
      setError(null);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'Something went wrong');
      if (apiErr.status === 401) {
        unauthRef.current();
        return;
      }
      setError(apiErr);
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => {
      if (!document.hidden) void reload();
    }, POLL_MS);
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [reload]);

  const upsertOrder = useCallback((order: Order) => {
    setState((s) => (s ? { ...s, orders: [...s.orders.filter((o) => o.id !== order.id), order].sort(byCreated) } : s));
  }, []);

  const removeOrder = useCallback((id: string) => {
    setState((s) => (s ? { ...s, orders: s.orders.filter((o) => o.id !== id) } : s));
  }, []);

  const setDetails = useCallback((details: BookingDetails) => {
    setState((s) => (s ? { ...s, details } : s));
  }, []);

  return { state, error, reload, upsertOrder, removeOrder, setDetails };
}
