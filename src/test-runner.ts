import * as assert from 'node:assert';
import type * as vscode from 'vscode';
import { BookmarkStore } from './bookmarkStore';
import type { StorageService } from './storage';
import type { FilemarkState } from './types';

class MockContext {
  subscriptions: vscode.Disposable[] = [];
}

class MockStorageService implements Pick<StorageService, 'load' | 'save'> {
  private state: FilemarkState = { version: '1.0', items: [] };

  async load(): Promise<FilemarkState> {
    return this.state;
  }

  async save(state: FilemarkState): Promise<void> {
    this.state = state;
  }

  getState(): FilemarkState {
    return this.state;
  }
}

async function testBookmarkStore() {
  console.log('🧪 Testing BookmarkStore...\n');

  const mockContext = new MockContext() as unknown as vscode.ExtensionContext;
  const mockStorage = new MockStorageService() as StorageService;
  const store = new BookmarkStore(mockContext, mockStorage);

  await store.initialize();

  console.log('✅ Test 1: Initialize empty state');
  assert.strictEqual(store.getState().items.length, 0);

  console.log('✅ Test 2: Add bookmark');
  await store.addBookmark('src/app.js', 1, 10);
  assert.strictEqual(store.getState().items.length, 1);
  const bookmark1 = store.findBookmarkByFilePath('src/app.js');
  assert.strictEqual(bookmark1?.numbers[1], 10);

  console.log('✅ Test 3: Add another number to same file');
  await store.addBookmark('src/app.js', 3, 20);
  assert.strictEqual(store.getState().items.length, 1);
  const bookmark2 = store.findBookmarkByFilePath('src/app.js');
  assert.strictEqual(bookmark2?.numbers[1], 10);
  assert.strictEqual(bookmark2?.numbers[3], 20);

  console.log('✅ Test 4: Update existing bookmark (move line)');
  await store.addBookmark('src/app.js', 1, 15);
  const bookmark3 = store.findBookmarkByFilePath('src/app.js');
  assert.strictEqual(bookmark3?.numbers[1], 15);
  assert.strictEqual(bookmark3?.numbers[3], 20);

  console.log('✅ Test 5: Find bookmark by number');
  const found = store.findBookmarkByNumber(1);
  assert.strictEqual(found?.line, 15);
  assert.strictEqual(found?.bookmark.filePath, 'src/app.js');

  console.log('✅ Test 6: Toggle bookmark (add)');
  await store.toggleBookmark('src/utils.js', 5, 30);
  assert.strictEqual(store.getState().items.length, 2);

  console.log('✅ Test 7: Toggle bookmark (delete - same line)');
  await store.toggleBookmark('src/utils.js', 5, 30);
  assert.strictEqual(store.getState().items.length, 1);
  const notFound = store.findBookmarkByNumber(5);
  assert.strictEqual(notFound, undefined);

  console.log('✅ Test 8: Toggle bookmark (move - different line)');
  await store.toggleBookmark('src/app.js', 1, 25);
  const moved = store.findBookmarkByFilePath('src/app.js');
  assert.strictEqual(moved?.numbers[1], 25);

  console.log('✅ Test 9: Remove bookmark number');
  await store.removeBookmarkNumber('src/app.js', 3);
  const afterRemove = store.findBookmarkByFilePath('src/app.js');
  assert.strictEqual(afterRemove?.numbers[3], undefined);
  assert.strictEqual(afterRemove?.numbers[1], 25);

  console.log('✅ Test 10: Remove last number deletes node');
  await store.removeBookmarkNumber('src/app.js', 1);
  assert.strictEqual(store.getState().items.length, 0);

  console.log('\n🎉 All tests passed!\n');

  console.log('📊 Final state:', JSON.stringify(mockStorage.getState(), null, 2));
}

testBookmarkStore().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
