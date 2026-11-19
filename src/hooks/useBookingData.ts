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
 *
 * - `state` null + `error` null  -> first load in progress (show skeleton)
 * - `state` null + `error`       -> first load failed (show error with retry)
 * - `state` + `refreshFailed`    -> showing the last good data, background refresh failing
 */
export function useBookingData(onUnauthenticated: () => void) {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const unauthRef = useRef(onUnauthenticated);
  unauthRef.current = onUnauthenticated;
  const inFlight = useRef(false);
  const lastJson = useRef('');

  const reload = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const next = await api.state();
      // Skip the re-render when a background refresh brings back identical data.
      const json = JSON.stringify(next);
      if (json !== lastJson.current) {
        lastJson.current = json;
        setState(next);
      }
      setError(null);
      setRefreshFailed(false);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, 'Something went wrong');
      if (apiErr.status === 401) {
        unauthRef.current();
        return;
      }
      setError(apiErr);
      setRefreshFailed(true);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = setInterval(() => {
      if (!document.hidden) void reload();
    }, POLL_MS);
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
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

  return { state, error, refreshing, refreshFailed, reload, upsertOrder, removeOrder, setDetails };
}
