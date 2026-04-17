/**
 * Safe localStorage wrapper.
 *
 * Protects against:
 *   - localStorage disabled (private browsing, some corp policies)
 *   - QuotaExceededError (storage full)
 *   - SecurityError (cross-origin)
 *   - Server-side rendering (no window)
 *
 * All methods return undefined on failure and log a single warning
 * per session per failure mode (no spam).
 */

const warned = new Set<string>();

function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[safe-storage] ${message}`);
}

function available(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const safeStorage = {
  get(key: string): string | null {
    if (!available()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      warnOnce(
        'get',
        `localStorage.getItem failed: ${(e as Error).message}. Falling back to null.`
      );
      return null;
    }
  },

  set(key: string, value: string): boolean {
    if (!available()) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (e) {
      const name = (e as Error).name;
      if (name === 'QuotaExceededError') {
        warnOnce('quota', 'localStorage quota exceeded. Some data will not persist.');
      } else {
        warnOnce('set', `localStorage.setItem failed: ${(e as Error).message}`);
      }
      return false;
    }
  },

  remove(key: string): boolean {
    if (!available()) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  getJSON<T>(key: string): T | null {
    const raw = this.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      warnOnce(`parse:${key}`, `Corrupt JSON in key "${key}", removing.`);
      this.remove(key);
      return null;
    }
  },

  setJSON(key: string, value: unknown): boolean {
    try {
      return this.set(key, JSON.stringify(value));
    } catch (e) {
      warnOnce('stringify', `Failed to stringify for key "${key}": ${(e as Error).message}`);
      return false;
    }
  },
};
