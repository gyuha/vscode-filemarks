/**
 * Performance utility functions for debouncing, throttling, and memoization
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param fn - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  delay: number
): (...args: TArgs) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: TArgs) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delay);
  };
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 *
 * @param fn - The function to throttle
 * @param limit - The number of milliseconds to wait between invocations
 * @returns A throttled version of the function
 */
export function throttle<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  limit: number
): (...args: TArgs) => TReturn | undefined {
  let inThrottle: boolean;
  let lastResult: TReturn | undefined;

  return (...args: TArgs) => {
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
      lastResult = fn(...args);
    }
    return lastResult;
  };
}

/**
 * Simple LRU (Least Recently Used) cache implementation
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists to re-add at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Remove oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value as K;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Creates a memoized version of a function with LRU cache
 *
 * @param fn - The function to memoize
 * @param getCacheKey - Optional function to generate cache key from arguments
 * @param maxCacheSize - Maximum number of cached results (default: 100)
 * @returns A memoized version of the function
 */
export function memoize<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  getCacheKey?: (...args: TArgs) => string,
  maxCacheSize = 100
): ((...args: TArgs) => TReturn) & { clearCache: () => void } {
  const cache = new LRUCache<string, TReturn>(maxCacheSize);

  const defaultGetCacheKey = (...args: TArgs): string => {
    return JSON.stringify(args);
  };

  const keyFn = getCacheKey || defaultGetCacheKey;

  const memoized = ((...args: TArgs) => {
    const key = keyFn(...args);

    if (cache.has(key)) {
      return cache.get(key) as TReturn;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as ((...args: TArgs) => TReturn) & { clearCache: () => void };

  memoized.clearCache = () => cache.clear();

  return memoized;
}

/**
 * Creates a debounced async function that ensures only the last call's result is returned
 *
 * @param fn - The async function to debounce
 * @param delay - The number of milliseconds to delay
 * @returns A debounced version of the async function
 */
export function debounceAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  delay: number
): (...args: TArgs) => Promise<TReturn> {
  let timeoutId: NodeJS.Timeout | undefined;
  let latestResolve: ((value: TReturn) => void) | undefined;
  let latestReject: ((reason?: unknown) => void) | undefined;

  return (...args: TArgs): Promise<TReturn> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      latestResolve = resolve;
      latestReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          if (latestResolve) {
            latestResolve(result);
          }
        } catch (error) {
          if (latestReject) {
            latestReject(error);
          }
        } finally {
          timeoutId = undefined;
          latestResolve = undefined;
          latestReject = undefined;
        }
      }, delay);
    });
  };
}

/**
 * Batch multiple function calls into a single execution
 *
 * @param fn - The function to batch
 * @param delay - The number of milliseconds to wait before executing
 * @returns A batched version of the function
 */
export function batchCalls<T>(fn: (items: T[]) => void, delay = 100): (item: T) => void {
  let items: T[] = [];
  let timeoutId: NodeJS.Timeout | undefined;

  return (item: T) => {
    items.push(item);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn([...items]);
      items = [];
      timeoutId = undefined;
    }, delay);
  };
}
