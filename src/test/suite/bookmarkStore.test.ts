import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BookmarkStore } from '../../bookmarkStore';
import { StorageService } from '../../storage';

suite('BookmarkStore Test Suite', () => {
  let store: BookmarkStore;
  let context: vscode.ExtensionContext;
  let testDir: string;

  setup(async () => {
    testDir = path.join('/tmp', `bookmark-test-${Date.now()}`);
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

  test('Should initialize with empty state', () => {
    const state = store.getState();
    assert.strictEqual(state.version, '1.0');
    assert.strictEqual(state.items.length, 0);
  });

  test('Should toggle bookmark on/off', async () => {
    await store.toggleBookmark('test.ts', 0, 10);

    let result = store.findBookmarkByNumber(0);
    assert.ok(result);
    assert.strictEqual(result.line, 10);
    assert.strictEqual(result.bookmark.filePath, 'test.ts');

    await store.toggleBookmark('test.ts', 0, 10);
    result = store.findBookmarkByNumber(0);
    assert.strictEqual(result, undefined);
  });

  test('Should add multiple bookmarks to same file', async () => {
    await store.addBookmark('test.ts', 0, 10);
    await store.addBookmark('test.ts', 1, 20);
    await store.addBookmark('test.ts', 2, 30);

    const result0 = store.findBookmarkByNumber(0);
    const result1 = store.findBookmarkByNumber(1);
    const result2 = store.findBookmarkByNumber(2);

    assert.ok(result0);
    assert.ok(result1);
    assert.ok(result2);
    assert.strictEqual(result0.line, 10);
    assert.strictEqual(result1.line, 20);
    assert.strictEqual(result2.line, 30);
  });

  test('Should find bookmark by file path', async () => {
    await store.addBookmark('test.ts', 0, 10);

    const bookmark = store.findBookmarkByFilePath('test.ts');
    assert.ok(bookmark);
    assert.strictEqual(bookmark.filePath, 'test.ts');
    assert.strictEqual(bookmark.numbers[0], 10);
  });

  test('Should delete bookmark', async () => {
    await store.addBookmark('test.ts', 0, 10);
    const bookmark = store.findBookmarkByFilePath('test.ts');
    assert.ok(bookmark);

    await store.deleteBookmark(bookmark.id);
    const result = store.findBookmarkByNumber(0);
    assert.strictEqual(result, undefined);
  });

  test('Should rename bookmark', async () => {
    await store.addBookmark('test.ts', 0, 10);
    const bookmark = store.findBookmarkByFilePath('test.ts');
    assert.ok(bookmark);

    await store.renameBookmark(bookmark.id, 'My Bookmark');
    const updated = store.findBookmarkByFilePath('test.ts');
    assert.strictEqual(updated?.label, 'My Bookmark');
  });

  test('Should create folder', async () => {
    await store.createFolder('Test Folder');
    const state = store.getState();

    assert.strictEqual(state.items.length, 1);
    assert.strictEqual(state.items[0].type, 'folder');
    if (state.items[0].type === 'folder') {
      assert.strictEqual(state.items[0].name, 'Test Folder');
    }
  });

  test('Should delete folder', async () => {
    await store.createFolder('Test Folder');
    const state = store.getState();
    const folder = state.items[0];
    assert.ok(folder);

    await store.deleteFolder(folder.id);
    const updated = store.getState();
    assert.strictEqual(updated.items.length, 0);
  });

  test('Should rename folder', async () => {
    await store.createFolder('Old Name');
    const state = store.getState();
    const folder = state.items[0];
    assert.ok(folder);

    await store.renameFolder(folder.id, 'New Name');
    const updated = store.getState();
    if (updated.items[0].type === 'folder') {
      assert.strictEqual(updated.items[0].name, 'New Name');
    }
  });

  test('Should move bookmark to folder', async () => {
    await store.createFolder('Test Folder');
    await store.addBookmark('test.ts', 0, 10);

    const state = store.getState();
    const folder = state.items[0];
    const bookmark = store.findBookmarkByFilePath('test.ts');

    assert.ok(folder);
    assert.ok(bookmark);

    await store.moveNode(bookmark.id, folder.id);
    const updated = store.getState();

    if (updated.items[0].type === 'folder') {
      assert.strictEqual(updated.items[0].children.length, 1);
      assert.strictEqual(updated.items[0].children[0].type, 'bookmark');
    }
  });

  test('Should clear bookmarks in file', async function () {
    this.timeout(5000);

    await store.addBookmark('test.ts', 0, 10);
    await store.addBookmark('test.ts', 1, 20);
    await store.addBookmark('other.ts', 0, 30);

    await store.clearBookmarksInFile('test.ts');

    const testBookmark = store.findBookmarkByFilePath('test.ts');
    const otherBookmark = store.findBookmarkByFilePath('other.ts');

    assert.strictEqual(testBookmark, undefined);
    assert.ok(otherBookmark);
  });

  test('Should clear all bookmarks', async () => {
    await store.addBookmark('test.ts', 0, 10);
    await store.addBookmark('other.ts', 1, 20);

    await store.clearAllBookmarks();

    const state = store.getState();
    assert.strictEqual(state.items.length, 0);
  });
});
