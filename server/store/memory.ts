import fs from 'node:fs';
import path from 'node:path';
import type { BookingDetails, Order } from '../../shared/types.js';
import { normaliseOrder, type Store } from './types.js';

interface Snapshot {
  orders: Record<string, Order>;
  details: BookingDetails | null;
}

/**
 * In-memory store used by the unit tests and local development. When given a
 * file path it persists to JSON so `npm run dev` keeps orders between restarts.
 * Never used in production (data would vanish between serverless invocations).
 */
export class MemoryStore implements Store {
  readonly kind: string;
  private data: Snapshot = { orders: {}, details: null };
  private counters = new Map<string, { count: number; expires: number }>();

  constructor(private readonly filePath?: string) {
    this.kind = filePath ? 'file' : 'memory';
    if (filePath && fs.existsSync(filePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Snapshot;
      } catch {
        // Corrupt dev file - start fresh.
      }
    }
  }

  private persist() {
    if (!this.filePath) return;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async listOrders() {
    return Object.values(this.data.orders).map((o) => normaliseOrder({ ...o }));
  }

  async getOrder(id: string) {
    const order = this.data.orders[id];
    return order ? normaliseOrder({ ...order }) : null;
  }

  async saveOrder(order: Order) {
    this.data.orders[order.id] = { ...order };
    this.persist();
  }

  async deleteOrder(id: string) {
    if (!(id in this.data.orders)) return false;
    delete this.data.orders[id];
    this.persist();
    return true;
  }

  async getDetails() {
    return this.data.details ? { ...this.data.details } : null;
  }

  async saveDetails(details: BookingDetails) {
    this.data.details = { ...details };
    this.persist();
  }

  async hit(key: string, windowSeconds: number) {
    const now = Date.now();
    const current = this.counters.get(key);
    if (!current || current.expires <= now) {
      this.counters.set(key, { count: 1, expires: now + windowSeconds * 1000 });
      return 1;
    }
    current.count += 1;
    return current.count;
  }

  async peek(key: string) {
    const current = this.counters.get(key);
    return current && current.expires > Date.now() ? current.count : 0;
  }
}
