import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BookmarkStore } from '../../bookmarkStore';
import { StorageService } from '../../storage';

suite('BookmarkStore Caching Test Suite', () => {
  let store: BookmarkStore;
  let context: vscode.ExtensionContext;
  let testDir: string;

  setup(async () => {
    testDir = path.join('/tmp', `bookmark-cache-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    context = {
      subscriptions: [],
      globalStorageUri: vscode.Uri.file(testDir),
    } as unknown as vscode.ExtensionContext;

    const mockWorkspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(testDir),
      name: 'test-workspace',
      index: 0,
    };

    const storage = new StorageService(context, mockWorkspaceFolder);
    store = new BookmarkStore(context, storage);
    await store.initialize();
  });

  teardown(async () => {
    for (const d of context.subscriptions) {
      d.dispose();
    }
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('Should cache bookmark lookup by file path', async () => {
    await store.addBookmark('test.ts', 0, 10);

    const first = store.findBookmarkByFilePath('test.ts');
    const second = store.findBookmarkByFilePath('test.ts');

    assert.ok(first);
    assert.ok(second);
    assert.strictEqual(first.id, second.id);
    assert.strictEqual(first, second);
  });

  test('Should invalidate bookmark cache after adding bookmark', async () => {
    const beforeAdd = store.findBookmarkByFilePath('new.ts');
    assert.strictEqual(beforeAdd, undefined);

    await store.addBookmark('new.ts', 0, 10);

    const afterAdd = store.findBookmarkByFilePath('new.ts');
    assert.ok(afterAdd);
    assert.strictEqual(afterAdd.filePath, 'new.ts');
  });

  test('Should invalidate bookmark cache after delete', async () => {
    await store.addBookmark('delete.ts', 0, 10);

    const bookmark = store.findBookmarkByFilePath('delete.ts');
    assert.ok(bookmark);

    await store.deleteBookmark(bookmark.id);

    const afterDelete = store.findBookmarkByFilePath('delete.ts');
    assert.strictEqual(afterDelete, undefined);
  });

  test('Should invalidate cache when bookmark numbers change', async () => {
    await store.addBookmark('modify.ts', 0, 10);

    const before = store.findBookmarkByFilePath('modify.ts');
    assert.ok(before);
    assert.strictEqual(before.numbers[0], 10);

    await store.addBookmark('modify.ts', 1, 20);

    const after = store.findBookmarkByFilePath('modify.ts');
    assert.ok(after);
    assert.strictEqual(after.numbers[0], 10);
    assert.strictEqual(after.numbers[1], 20);
  });

  test('Should cache folder lookup by ID', async () => {
    await store.createFolder('Cache Folder');
    const state = store.getState();
    const folder = state.items[0];
    assert.ok(folder);
    assert.strictEqual(folder.type, 'folder');

    const parentFirst = store.findParentFolder(folder.id);
    const parentSecond = store.findParentFolder(folder.id);

    assert.strictEqual(parentFirst, undefined);
    assert.strictEqual(parentSecond, undefined);
  });

  test('Should invalidate folder cache after creating folder', async () => {
    await store.createFolder('Parent');
    const state = store.getState();
    const parent = state.items[0];
    assert.ok(parent);

    await store.createFolder('Child', parent.id);

    const updated = store.getState();
    if (updated.items[0].type === 'folder') {
      assert.strictEqual(updated.items[0].children.length, 1);
    }
  });

  test('Should invalidate folder cache after delete', async () => {
    await store.createFolder('ToDelete');
    const state = store.getState();
    const folder = state.items[0];
    assert.ok(folder);

    await store.deleteFolder(folder.id);

    const updated = store.getState();
    assert.strictEqual(updated.items.length, 0);
  });

  test('findBookmarkByNumber should work correctly', async () => {
    await store.addBookmark('a.ts', 0, 10);
    await store.addBookmark('b.ts', 1, 20);
    await store.addBookmark('c.ts', 2, 30);

    const result0 = store.findBookmarkByNumber(0);
    const result1 = store.findBookmarkByNumber(1);
    const result2 = store.findBookmarkByNumber(2);
    const resultNone = store.findBookmarkByNumber(9);

    assert.ok(result0);
    assert.strictEqual(result0.bookmark.filePath, 'a.ts');
    assert.strictEqual(result0.line, 10);

    assert.ok(result1);
    assert.strictEqual(result1.bookmark.filePath, 'b.ts');

    assert.ok(result2);
    assert.strictEqual(result2.bookmark.filePath, 'c.ts');

    assert.strictEqual(resultNone, undefined);
  });

  test('getBookmarkNumbersInFile should return sorted numbers', async () => {
    await store.addBookmark('multi.ts', 5, 50);
    await store.addBookmark('multi.ts', 0, 10);
    await store.addBookmark('multi.ts', 3, 30);

    const numbers = store.getBookmarkNumbersInFile('multi.ts');

    assert.deepStrictEqual(numbers, [0, 3, 5]);
  });

  test('getAllBookmarkEntries should return all entries sorted', async () => {
    await store.addBookmark('a.ts', 2, 20);
    await store.addBookmark('b.ts', 0, 10);
    await store.addBookmark('c.ts', 5, 50);

    const entries = store.getAllBookmarkEntries();

    assert.strictEqual(entries.length, 3);
    assert.strictEqual(entries[0].num, 0);
    assert.strictEqual(entries[1].num, 2);
    assert.strictEqual(entries[2].num, 5);
  });

  test('getAdjacentBookmarkInFile should navigate correctly', async () => {
    await store.addBookmark('nav.ts', 0, 10);
    await store.addBookmark('nav.ts', 2, 20);
    await store.addBookmark('nav.ts', 5, 50);

    const next = store.getAdjacentBookmarkInFile('nav.ts', 0, 'next');
    assert.ok(next);
    assert.strictEqual(next.num, 2);

    const prev = store.getAdjacentBookmarkInFile('nav.ts', 5, 'previous');
    assert.ok(prev);
    assert.strictEqual(prev.num, 2);

    const wrapNext = store.getAdjacentBookmarkInFile('nav.ts', 5, 'next');
    assert.ok(wrapNext);
    assert.strictEqual(wrapNext.num, 0);

    const wrapPrev = store.getAdjacentBookmarkInFile('nav.ts', 0, 'previous');
    assert.ok(wrapPrev);
    assert.strictEqual(wrapPrev.num, 5);
  });

  test('getAdjacentBookmarkGlobal should navigate across files', async () => {
    await store.addBookmark('a.ts', 0, 10);
    await store.addBookmark('b.ts', 1, 20);
    await store.addBookmark('c.ts', 2, 30);

    const next = store.getAdjacentBookmarkGlobal(0, 'next');
    assert.ok(next);
    assert.strictEqual(next.num, 1);

    const prev = store.getAdjacentBookmarkGlobal(2, 'previous');
    assert.ok(prev);
    assert.strictEqual(prev.num, 1);

    const wrapNext = store.getAdjacentBookmarkGlobal(2, 'next');
    assert.ok(wrapNext);
    assert.strictEqual(wrapNext.num, 0);
  });

  test('toggleBookmark should add and remove correctly', async () => {
    await store.toggleBookmark('toggle.ts', 0, 10);
    let bookmark = store.findBookmarkByFilePath('toggle.ts');
    assert.ok(bookmark);
    assert.strictEqual(bookmark.numbers[0], 10);

    await store.toggleBookmark('toggle.ts', 0, 10);
    bookmark = store.findBookmarkByFilePath('toggle.ts');
    assert.strictEqual(bookmark, undefined);
  });

  test('toggleBookmark should replace number at different line', async () => {
    await store.toggleBookmark('replace.ts', 0, 10);
    await store.toggleBookmark('replace.ts', 0, 20);

    const bookmark = store.findBookmarkByFilePath('replace.ts');
    assert.ok(bookmark);
    assert.strictEqual(bookmark.numbers[0], 20);
  });

  test('removeBookmarkNumber should remove single number', async () => {
    await store.addBookmark('remove.ts', 0, 10);
    await store.addBookmark('remove.ts', 1, 20);

    await store.removeBookmarkNumber('remove.ts', 0);

    const bookmark = store.findBookmarkByFilePath('remove.ts');
    assert.ok(bookmark);
    assert.strictEqual(bookmark.numbers[0], undefined);
    assert.strictEqual(bookmark.numbers[1], 20);
  });

  test('removeBookmarkNumber should delete bookmark if last number', async () => {
    await store.addBookmark('single.ts', 0, 10);
    await store.removeBookmarkNumber('single.ts', 0);

    const bookmark = store.findBookmarkByFilePath('single.ts');
    assert.strictEqual(bookmark, undefined);
  });

  test('setAllFoldersExpanded should update all folders', async () => {
    await store.createFolder('Folder1');
    await store.createFolder('Folder2');

    await store.setAllFoldersExpanded(false);

    const state = store.getState();
    for (const item of state.items) {
      if (item.type === 'folder') {
        assert.strictEqual(item.expanded, false);
      }
    }

    await store.setAllFoldersExpanded(true);

    const updated = store.getState();
    for (const item of updated.items) {
      if (item.type === 'folder') {
        assert.strictEqual(item.expanded, true);
      }
    }
  });

  test('findParentFolder should return correct parent', async () => {
    await store.createFolder('Parent');
    const state = store.getState();
    const parent = state.items[0];
    assert.ok(parent);

    await store.addBookmark('child.ts', 0, 10);
    const bookmark = store.findBookmarkByFilePath('child.ts');
    assert.ok(bookmark);

    await store.moveNode(bookmark.id, parent.id);

    const foundParent = store.findParentFolder(bookmark.id);
    assert.ok(foundParent);
    assert.strictEqual(foundParent.id, parent.id);
  });

  test('lastUsedFolderId should track folder selection', async () => {
    assert.strictEqual(store.getLastUsedFolderId(), null);

    await store.createFolder('Tracked');
    const state = store.getState();
    const folder = state.items[0];
    assert.ok(folder);

    assert.strictEqual(store.getLastUsedFolderId(), folder.id);

    store.setLastUsedFolderId(null);
    assert.strictEqual(store.getLastUsedFolderId(), null);
  });

  test('removeInvalidBookmarks should remove out of range lines', async () => {
    await store.addBookmark('invalid.ts', 0, 10);
    await store.addBookmark('invalid.ts', 1, 100);
    await store.addBookmark('invalid.ts', 2, 50);

    await store.removeInvalidBookmarks('invalid.ts', 60);

    const bookmark = store.findBookmarkByFilePath('invalid.ts');
    assert.ok(bookmark);
    assert.strictEqual(bookmark.numbers[0], 10);
    assert.strictEqual(bookmark.numbers[1], undefined);
    assert.strictEqual(bookmark.numbers[2], 50);
  });

  test('Cache performance - repeated lookups should be fast', async function () {
    this.timeout(5000);

    for (let i = 0; i < 100; i++) {
      await store.addBookmark(`file${i}.ts`, i % 10, i * 10);
    }

    const start1 = performance.now();
    for (let i = 0; i < 1000; i++) {
      store.findBookmarkByFilePath(`file${i % 100}.ts`);
    }
    const firstBatch = performance.now() - start1;

    const start2 = performance.now();
    for (let i = 0; i < 1000; i++) {
      store.findBookmarkByFilePath(`file${i % 100}.ts`);
    }
    const secondBatch = performance.now() - start2;

    assert.ok(
      secondBatch <= firstBatch * 2,
      `Second batch (${secondBatch}ms) should not be significantly slower than first (${firstBatch}ms)`
    );
  });
});
