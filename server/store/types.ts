import type { BookingDetails, Order } from '../../shared/types.js';

/** Thrown when another order already uses the same (normalised) name. */
export class DuplicateNameError extends Error {
  constructor() {
    super('Someone with this name has already ordered');
    this.name = 'DuplicateNameError';
  }
}

/** Fills in fields added after an order was first stored. */
export function normaliseOrder(order: Order): Order {
  const stored = order as Partial<Order> & Order;
  return {
    ...order,
    starterOption: stored.starterOption ?? '',
    mainOption: stored.mainOption ?? '',
    dessertOption: stored.dessertOption ?? '',
    notes: stored.notes ?? '',
  };
}

export interface Store {
  readonly kind: string;
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  saveOrder(order: Order): Promise<void>;
  /** Returns false if the order did not exist. */
  deleteOrder(id: string): Promise<boolean>;
  getDetails(): Promise<BookingDetails | null>;
  saveDetails(details: BookingDetails): Promise<void>;
  /** Increments a counter that expires after `windowSeconds`; returns the new count. */
  hit(key: string, windowSeconds: number): Promise<number>;
  /** Reads a counter without changing it (0 if missing/expired). */
  peek(key: string): Promise<number>;
}

export const KEY_PREFIX = 'xmas2026';
export const ORDERS_KEY = `${KEY_PREFIX}:orders`;
export const DETAILS_KEY = `${KEY_PREFIX}:details`;
export const rateKey = (key: string) => `${KEY_PREFIX}:rate:${key}`;
