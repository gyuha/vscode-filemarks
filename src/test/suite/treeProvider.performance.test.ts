import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BookmarkStore } from '../../bookmarkStore';
import { StorageService } from '../../storage';
import { FilemarkTreeProvider } from '../../views/treeProvider';

suite('TreeProvider Performance Test Suite', () => {
  let store: BookmarkStore;
  let treeProvider: FilemarkTreeProvider;
  let context: vscode.ExtensionContext;
  let testDir: string;

  setup(async () => {
    testDir = path.join('/tmp', `tree-perf-test-${Date.now()}`);
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

    treeProvider = new FilemarkTreeProvider(store);
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

  test('Should return root items', () => {
    const children = treeProvider.getChildren();
    assert.ok(Array.isArray(children));
    assert.strictEqual(children.length, 0);
  });

  test('Should return items after adding bookmark', async () => {
    await store.addBookmark('test.ts', 0, 10);

    const children = treeProvider.getChildren();
    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].type, 'bookmark');
  });

  test('Should sort folders before bookmarks', async () => {
    await store.addBookmark('test.ts', 0, 10);
    await store.createFolder('Test Folder');

    const children = treeProvider.getChildren();
    assert.strictEqual(children.length, 2);
    assert.strictEqual(children[0].type, 'folder');
    assert.strictEqual(children[1].type, 'bookmark');
  });

  test('Should filter bookmarks by name', async () => {
    await store.addBookmark('test.ts', 0, 10);
    await store.addBookmark('other.ts', 1, 20);
    await store.addBookmark('example.ts', 2, 30);

    treeProvider.setFilter('test');
    const filtered = treeProvider.getChildren();

    assert.strictEqual(filtered.length, 1);
    if (filtered[0].type === 'bookmark') {
      assert.strictEqual(filtered[0].filePath, 'test.ts');
    }
  });

  test('Should filter bookmarks by partial path', async () => {
    await store.addBookmark('src/components/Button.ts', 0, 10);
    await store.addBookmark('src/utils/helpers.ts', 1, 20);
    await store.addBookmark('test/test.ts', 2, 30);

    treeProvider.setFilter('components');
    const filtered = treeProvider.getChildren();

    assert.strictEqual(filtered.length, 1);
    if (filtered[0].type === 'bookmark') {
      assert.ok(filtered[0].filePath.includes('components'));
    }
  });

  test('Should clear filter', async () => {
    await store.addBookmark('test.ts', 0, 10);
    await store.addBookmark('other.ts', 1, 20);

    treeProvider.setFilter('test');
    assert.strictEqual(treeProvider.getChildren().length, 1);

    treeProvider.clearFilter();
    assert.strictEqual(treeProvider.getChildren().length, 2);
  });

  test('Should return correct filter text', () => {
    assert.strictEqual(treeProvider.getFilter(), '');

    treeProvider.setFilter('test');
    assert.strictEqual(treeProvider.getFilter(), 'test');

    treeProvider.clearFilter();
    assert.strictEqual(treeProvider.getFilter(), '');
  });

  test('Should create correct tree item for bookmark', async () => {
    await store.addBookmark('test.ts', 0, 10);

    const children = treeProvider.getChildren();
    const treeItem = treeProvider.getTreeItem(children[0]);

    assert.ok(treeItem);
    assert.strictEqual(treeItem.contextValue, 'bookmark');
    assert.strictEqual(treeItem.description, '[0]');
  });

  test('Should create correct tree item for folder', async () => {
    await store.createFolder('My Folder');

    const children = treeProvider.getChildren();
    const treeItem = treeProvider.getTreeItem(children[0]);

    assert.ok(treeItem);
    assert.strictEqual(treeItem.label, 'My Folder');
    assert.strictEqual(treeItem.contextValue, 'folder');
  });

  test('Should handle folders with children during filtering', async () => {
    await store.createFolder('MyFolder');
    const state = store.getState();
    const folder = state.items[0];

    await store.addBookmark('match.ts', 0, 10);
    const bookmark = store.findBookmarkByFilePath('match.ts');
    assert.ok(bookmark);
    await store.moveNode(bookmark.id, folder.id);

    await store.addBookmark('nomatch.ts', 1, 20);

    treeProvider.setFilter('match');
    const filtered = treeProvider.getChildren();

    const folderInFiltered = filtered.find(n => n.type === 'folder');
    assert.ok(folderInFiltered, 'Should have a folder in filtered results');

    if (folderInFiltered && folderInFiltered.type === 'folder') {
      const folderChildren = treeProvider.getChildren(folderInFiltered);
      const matchingChildren = folderChildren.filter(
        c => c.type === 'bookmark' && c.filePath === 'match.ts'
      );
      assert.ok(matchingChildren.length >= 1, 'Folder should contain matching bookmark');
    }
  });

  test('Should handle fuzzy match for filtering', async () => {
    await store.addBookmark('Button.tsx', 0, 10);
    await store.addBookmark('Modal.tsx', 1, 20);
    await store.addBookmark('Input.tsx', 2, 30);

    treeProvider.setFilter('btn');
    const filtered = treeProvider.getChildren();

    assert.strictEqual(filtered.length, 1);
    if (filtered[0].type === 'bookmark') {
      assert.strictEqual(filtered[0].filePath, 'Button.tsx');
    }
  });

  test('Should get parent of nested bookmark', async () => {
    await store.createFolder('Parent');
    const state = store.getState();
    const folder = state.items[0];

    await store.addBookmark('child.ts', 0, 10);
    const bookmark = store.findBookmarkByFilePath('child.ts');
    assert.ok(bookmark);
    await store.moveNode(bookmark.id, folder.id);

    const parent = treeProvider.getParent(bookmark);
    assert.ok(parent);
    assert.strictEqual(parent.id, folder.id);
  });

  test('Should return undefined for root item parent', async () => {
    await store.addBookmark('root.ts', 0, 10);
    const bookmark = store.findBookmarkByFilePath('root.ts');
    assert.ok(bookmark);

    const parent = treeProvider.getParent(bookmark);
    assert.strictEqual(parent, undefined);
  });

  test('Filter cache should improve performance', async function () {
    this.timeout(5000);

    for (let i = 0; i < 50; i++) {
      await store.addBookmark(`file${i}.ts`, i % 10, i);
    }

    treeProvider.setFilter('file');

    const start1 = performance.now();
    treeProvider.getChildren();
    const firstCall = performance.now() - start1;

    const start2 = performance.now();
    treeProvider.getChildren();
    const secondCall = performance.now() - start2;

    assert.ok(
      secondCall <= firstCall + 1,
      `Second call (${secondCall}ms) should not be significantly slower than first (${firstCall}ms) due to caching`
    );
  });
});
