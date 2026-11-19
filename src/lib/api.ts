import type { ApiErrorBody, AppState, BookingDetails, Order, OrderInput } from '../../shared/types';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: Partial<ApiErrorBody> = {};
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // not JSON
  }
  return new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.code, body.fieldErrors);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
    });
  } catch {
    throw new ApiError(0, "Couldn't reach the North Pole - check your connection and try again.", 'NETWORK');
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  session: () => request<{ authenticated: boolean }>('/auth/session'),
  login: (password: string) => request<{ authenticated: boolean }>('/auth/login', send('POST', { password })),
  logout: () => request<{ authenticated: boolean }>('/auth/logout', send('POST', {})),
  state: () => request<AppState>('/state'),
  createOrder: (input: OrderInput) => request<{ order: Order }>('/orders', send('POST', input)),
  updateOrder: (id: string, input: OrderInput) =>
    request<{ order: Order }>(`/orders/${encodeURIComponent(id)}`, send('PUT', input)),
  deleteOrder: (id: string) => request<{ deleted: string }>(`/orders/${encodeURIComponent(id)}`, send('DELETE')),
  saveDetails: (details: BookingDetails) => request<{ details: BookingDetails }>('/details', send('PUT', details)),
};

export const MENU_URL = '/api/menu';
export const BOOKING_FORM_URL = '/api/booking-form';
export const BOOKING_FORM_PREVIEW_URL = '/api/booking-form?disposition=inline';

/** Fetches a protected file and hands it to the browser as a download. */
export async function downloadFile(url: string, filename: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, "Couldn't reach the North Pole - check your connection and try again.", 'NETWORK');
  }
  if (!res.ok) throw await toApiError(res);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}
