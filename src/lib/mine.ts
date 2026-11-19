// Remembers (on this device only) which orders were placed here, so we can
// show a friendly "You" badge. Purely cosmetic - everyone with the password
// can still edit any order.
const KEY = 'xmas-feast-2026:my-orders';

export function myOrderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function rememberMyOrder(id: string) {
  try {
    const ids = myOrderIds();
    ids.add(id);
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    // storage unavailable - ignore
  }
}

export function forgetMyOrder(id: string) {
  try {
    const ids = myOrderIds();
    ids.delete(id);
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    // storage unavailable - ignore
  }
}
