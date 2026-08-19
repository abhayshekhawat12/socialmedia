/**
 * Debounce and throttle utilities for rapid UI interactions (search, likes, saves)
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRan = 0;
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastRan >= limitMs) {
      func(...args);
      lastRan = now;
    } else {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        func(...args);
        lastRan = Date.now();
      }, limitMs - (now - lastRan));
    }
  };
}
