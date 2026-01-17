import * as assert from 'node:assert';
import {
  debounce,
  throttle,
  memoize,
  debounceAsync,
  batchCalls,
  LRUCache,
} from '../../utils/performance';

suite('Performance Utilities Test Suite', () => {
  suite('debounce', () => {
    test('should delay function execution', function (done) {
      this.timeout(1000);
      let callCount = 0;
      const debounced = debounce(() => {
        callCount++;
      }, 50);

      debounced();
      debounced();
      debounced();

      assert.strictEqual(callCount, 0);

      setTimeout(() => {
        assert.strictEqual(callCount, 1);
        done();
      }, 100);
    });

    test('should reset delay on subsequent calls', function (done) {
      this.timeout(1000);
      let callCount = 0;
      const debounced = debounce(() => {
        callCount++;
      }, 50);

      debounced();
      setTimeout(() => debounced(), 30);
      setTimeout(() => debounced(), 60);

      setTimeout(() => {
        assert.strictEqual(callCount, 1);
        done();
      }, 150);
    });

    test('should pass arguments to debounced function', function (done) {
      this.timeout(1000);
      let receivedArgs: unknown[] = [];
      const debounced = debounce((...args: unknown[]) => {
        receivedArgs = args;
      }, 50);

      debounced('arg1', 'arg2', 123);

      setTimeout(() => {
        assert.deepStrictEqual(receivedArgs, ['arg1', 'arg2', 123]);
        done();
      }, 100);
    });
  });

  suite('throttle', () => {
    test('should execute immediately on first call', () => {
      let callCount = 0;
      const throttled = throttle(() => {
        callCount++;
        return callCount;
      }, 100);

      throttled();
      assert.strictEqual(callCount, 1);
    });

    test('should not execute during throttle period', function (done) {
      this.timeout(1000);
      let callCount = 0;
      const throttled = throttle(() => {
        callCount++;
        return callCount;
      }, 100);

      throttled();
      throttled();
      throttled();

      assert.strictEqual(callCount, 1);

      setTimeout(() => {
        throttled();
        assert.strictEqual(callCount, 2);
        done();
      }, 150);
    });

    test('should return last result during throttle period', () => {
      const throttled = throttle((x: number) => x * 2, 100);

      const result1 = throttled(5);
      const result2 = throttled(10);
      const result3 = throttled(15);

      assert.strictEqual(result1, 10);
      assert.strictEqual(result2, 10);
      assert.strictEqual(result3, 10);
    });
  });

  suite('LRUCache', () => {
    test('should store and retrieve values', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      assert.strictEqual(cache.get('a'), 1);
      assert.strictEqual(cache.get('b'), 2);
      assert.strictEqual(cache.get('c'), 3);
    });

    test('should evict least recently used item when over capacity', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);

      assert.strictEqual(cache.get('a'), undefined);
      assert.strictEqual(cache.get('b'), 2);
      assert.strictEqual(cache.get('c'), 3);
      assert.strictEqual(cache.get('d'), 4);
    });

    test('should update LRU order on get', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a');

      cache.set('d', 4);

      assert.strictEqual(cache.get('a'), 1);
      assert.strictEqual(cache.get('b'), undefined);
      assert.strictEqual(cache.get('c'), 3);
      assert.strictEqual(cache.get('d'), 4);
    });

    test('should update LRU order on set existing key', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.set('a', 100);

      cache.set('d', 4);

      assert.strictEqual(cache.get('a'), 100);
      assert.strictEqual(cache.get('b'), undefined);
    });

    test('should report correct size', () => {
      const cache = new LRUCache<string, number>(3);

      assert.strictEqual(cache.size, 0);

      cache.set('a', 1);
      assert.strictEqual(cache.size, 1);

      cache.set('b', 2);
      cache.set('c', 3);
      assert.strictEqual(cache.size, 3);

      cache.set('d', 4);
      assert.strictEqual(cache.size, 3);
    });

    test('should clear all items', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      assert.strictEqual(cache.size, 0);
      assert.strictEqual(cache.get('a'), undefined);
    });

    test('should check if key exists', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);

      assert.strictEqual(cache.has('a'), true);
      assert.strictEqual(cache.has('b'), false);
    });
  });

  suite('memoize', () => {
    test('should cache function results', () => {
      let callCount = 0;
      const expensive = memoize((x: number) => {
        callCount++;
        return x * 2;
      });

      assert.strictEqual(expensive(5), 10);
      assert.strictEqual(expensive(5), 10);
      assert.strictEqual(expensive(5), 10);
      assert.strictEqual(callCount, 1);
    });

    test('should cache different arguments separately', () => {
      let callCount = 0;
      const expensive = memoize((x: number) => {
        callCount++;
        return x * 2;
      });

      assert.strictEqual(expensive(5), 10);
      assert.strictEqual(expensive(10), 20);
      assert.strictEqual(expensive(5), 10);
      assert.strictEqual(callCount, 2);
    });

    test('should use custom cache key function', () => {
      let callCount = 0;
      const expensive = memoize(
        (obj: { id: number; name: string }) => {
          callCount++;
          return obj.name.toUpperCase();
        },
        obj => obj.id.toString()
      );

      assert.strictEqual(expensive({ id: 1, name: 'hello' }), 'HELLO');
      assert.strictEqual(expensive({ id: 1, name: 'world' }), 'HELLO');
      assert.strictEqual(callCount, 1);
    });

    test('should respect maxCacheSize', () => {
      let callCount = 0;
      const expensive = memoize(
        (x: number) => {
          callCount++;
          return x * 2;
        },
        undefined,
        2
      );

      expensive(1);
      expensive(2);
      expensive(3);

      callCount = 0;
      expensive(1);
      assert.strictEqual(callCount, 1);

      expensive(3);
      assert.strictEqual(callCount, 1);
    });

    test('should provide clearCache method', () => {
      let callCount = 0;
      const expensive = memoize((x: number) => {
        callCount++;
        return x * 2;
      });

      expensive(5);
      expensive(5);
      assert.strictEqual(callCount, 1);

      expensive.clearCache();

      expensive(5);
      assert.strictEqual(callCount, 2);
    });
  });

  suite('debounceAsync', () => {
    test('should debounce async function', async function () {
      this.timeout(2000);
      let callCount = 0;

      const asyncFn = debounceAsync(async (x: number) => {
        callCount++;
        return x * 2;
      }, 50);

      asyncFn(5);
      asyncFn(10);
      const result = await asyncFn(15);

      await new Promise(resolve => setTimeout(resolve, 100));

      assert.strictEqual(result, 30);
      assert.strictEqual(callCount, 1);
    });

    test('should handle async errors', async function () {
      this.timeout(2000);
      const asyncFn = debounceAsync(async () => {
        throw new Error('Test error');
      }, 50);

      try {
        await asyncFn();
        assert.fail('Should have thrown');
      } catch (e) {
        assert.ok(e instanceof Error);
        assert.strictEqual((e as Error).message, 'Test error');
      }
    });
  });

  suite('batchCalls', () => {
    test('should batch multiple calls', function (done) {
      this.timeout(1000);
      let receivedItems: number[] = [];

      const batcher = batchCalls<number>(items => {
        receivedItems = items;
      }, 50);

      batcher(1);
      batcher(2);
      batcher(3);

      setTimeout(() => {
        assert.deepStrictEqual(receivedItems, [1, 2, 3]);
        done();
      }, 100);
    });

    test('should reset batch on each call within delay', function (done) {
      this.timeout(1000);
      let callCount = 0;
      let lastItems: number[] = [];

      const batcher = batchCalls<number>(items => {
        callCount++;
        lastItems = items;
      }, 50);

      batcher(1);
      setTimeout(() => batcher(2), 30);
      setTimeout(() => batcher(3), 60);

      setTimeout(() => {
        assert.strictEqual(callCount, 1);
        assert.deepStrictEqual(lastItems, [1, 2, 3]);
        done();
      }, 150);
    });
  });
});
