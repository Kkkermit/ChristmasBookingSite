export const MENU_FILENAME = 'Smokehouse-and-Cellar-Christmas-Menu-2026.pdf';

const CACHE_MS = 60 * 60 * 1000;
let cached: { url: string; bytes: Uint8Array; at: number } | null = null;

export function clearMenuCache() {
  cached = null;
}

function looksLikePdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
}

/**
 * Fetches the restaurant's menu PDF so it can be downloaded with a friendly
 * filename. Returns null if the restaurant's site can't be reached, in which
 * case the caller falls back to redirecting to the original link.
 */
export async function fetchMenuPdf(url: string, fetchImpl: typeof fetch, now = Date.now()): Promise<Uint8Array | null> {
  if (cached && cached.url === url && now - cached.at < CACHE_MS) return cached.bytes;
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000), redirect: 'follow' });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (!looksLikePdf(bytes)) return null;
    cached = { url, bytes, at: now };
    return bytes;
  } catch {
    return null;
  }
}
