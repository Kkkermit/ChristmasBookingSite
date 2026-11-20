import { useSyncExternalStore } from 'react';

/**
 * The animated ASCII backdrop. Three designs to choose from; the choice is
 * remembered per browser (and shared with the login page). Add ?tree=1, 2
 * or 3 to any URL to jump straight to one.
 */
export const DESIGNS = [
  {
    id: 'classic',
    number: 1,
    name: 'Classic',
    blurb: 'A hand-typed tree. Its lights switch on, top to bottom, as you scroll.',
  },
  {
    id: 'spiral',
    number: 2,
    name: '3D Spiral',
    blurb: 'A spinning 3D tree wrapped in a candy-cane ribbon. Scrolling spins it.',
  },
  {
    id: 'rain',
    number: 3,
    name: 'Code Rain',
    blurb: 'Red and white character rain that lights up the tree. Scroll to speed it up.',
  },
] as const;

export type DesignId = (typeof DESIGNS)[number]['id'];

export const DEFAULT_DESIGN: DesignId = 'classic';
const STORAGE_KEY = 'xmas-backdrop';

export function parseDesign(value: string | null | undefined): DesignId | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  const match = DESIGNS.find((d) => d.id === v || String(d.number) === v);
  return match ? match.id : null;
}

function readStored(): DesignId | null {
  try {
    return parseDesign(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null; // private mode / storage blocked
  }
}

function store(id: DesignId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not remembered - it still applies for this visit.
  }
}

function initialDesign(): DesignId {
  if (typeof window === 'undefined') return DEFAULT_DESIGN;
  const fromUrl = parseDesign(new URLSearchParams(window.location.search).get('tree'));
  if (fromUrl) {
    store(fromUrl);
    return fromUrl;
  }
  return readStored() ?? DEFAULT_DESIGN;
}

let current: DesignId | null = null;
const listeners = new Set<() => void>();

export function getDesign(): DesignId {
  current ??= initialDesign();
  return current;
}

export function setDesign(id: DesignId) {
  if (id === getDesign()) return;
  current = id;
  store(id);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other open tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    const next = parseDesign(e.newValue);
    if (next && next !== current) {
      current = next;
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useDesign(): DesignId {
  return useSyncExternalStore(subscribe, getDesign, () => DEFAULT_DESIGN);
}

/** For tests. */
export function resetDesignForTests() {
  current = null;
}
