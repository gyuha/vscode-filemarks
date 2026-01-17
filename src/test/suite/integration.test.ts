import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BookmarkStore } from '../../bookmarkStore';
import { StorageService } from '../../storage';
import { FilemarkTreeProvider } from '../../views/treeProvider';

suite('Integration Test Suite', () => {
  let store: BookmarkStore;
  let storage: StorageService;
  let treeProvider: FilemarkTreeProvider;
  let context: vscode.ExtensionContext;
  let testDir: string;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;

  setup(async () => {
    testDir = path.join('/tmp', `integration-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    context = {
      subscriptions: [],
      globalStorageUri: vscode.Uri.file(testDir),
    } as unknown as vscode.ExtensionContext;

    mockWorkspaceFolder = {
      uri: vscode.Uri.file(testDir),
      name: 'test-workspace',
      index: 0,
    };

    storage = new StorageService(context, mockWorkspaceFolder);
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

  suite('Store and TreeProvider Integration', () => {
    test('Adding bookmark should reflect in tree provider', async () => {
      assert.strictEqual(treeProvider.getChildren().length, 0);

      await store.addBookmark('test.ts', 0, 10);

      await new Promise(resolve => setTimeout(resolve, 200));

      const children = treeProvider.getChildren();
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0].type, 'bookmark');
    });

    test('Creating folder should reflect in tree provider', async () => {
      await store.createFolder('Test Folder');

      await new Promise(resolve => setTimeout(resolve, 200));

      const children = treeProvider.getChildren();
      assert.strictEqual(children.length, 1);
      assert.strictEqual(children[0].type, 'folder');
    });

    test('Moving bookmark to folder should update tree hierarchy', async () => {
      await store.createFolder('Folder');
      await store.addBookmark('test.ts', 0, 10);

      await new Promise(resolve => setTimeout(resolve, 200));

      const state = store.getState();
      const folder = state.items.find(i => i.type === 'folder');
      const bookmark = store.findBookmarkByFilePath('test.ts');
      assert.ok(folder);
      assert.ok(bookmark);

      await store.moveNode(bookmark.id, folder.id);

      await new Promise(resolve => setTimeout(resolve, 200));

      const rootChildren = treeProvider.getChildren();
      assert.strictEqual(rootChildren.length, 1);
      assert.strictEqual(rootChildren[0].type, 'folder');

      const folderChildren = treeProvider.getChildren(rootChildren[0]);
      assert.strictEqual(folderChildren.length, 1);
      assert.strictEqual(folderChildren[0].type, 'bookmark');
    });

    test('Filter should work with folder structure', async () => {
      await store.createFolder('Components');
      const state = store.getState();
      const folder = state.items[0];
      assert.ok(folder);

      await store.addBookmark('Button.tsx', 0, 10);
      await store.addBookmark('Modal.tsx', 1, 20);
      await store.addBookmark('Input.tsx', 2, 30);

      const button = store.findBookmarkByFilePath('Button.tsx');
      assert.ok(button);
      await store.moveNode(button.id, folder.id);

      treeProvider.setFilter('Button');

      const filtered = treeProvider.getChildren();
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].type, 'folder');

      const folderFiltered = treeProvider.getChildren(filtered[0]);
      assert.strictEqual(folderFiltered.length, 1);
    });

    test('Deleting bookmark should update tree', async () => {
      await store.addBookmark('delete.ts', 0, 10);

      await new Promise(resolve => setTimeout(resolve, 200));

      const before = treeProvider.getChildren();
      assert.strictEqual(before.length, 1);

      const bookmark = store.findBookmarkByFilePath('delete.ts');
      assert.ok(bookmark);
      await store.deleteBookmark(bookmark.id);

      await new Promise(resolve => setTimeout(resolve, 200));

      const after = treeProvider.getChildren();
      assert.strictEqual(after.length, 0);
    });

    test('Clear all should reset everything', async () => {
      await store.createFolder('Folder1');
      await store.createFolder('Folder2');
      await store.addBookmark('a.ts', 0, 10);
      await store.addBookmark('b.ts', 1, 20);

      await new Promise(resolve => setTimeout(resolve, 200));

      const before = treeProvider.getChildren();
      assert.ok(before.length > 0);

      await store.clearAllBookmarks();

      await new Promise(resolve => setTimeout(resolve, 200));

      const after = treeProvider.getChildren();
      assert.strictEqual(after.length, 0);
    });
  });

  suite('Storage and Store Integration', () => {
    test('State changes should be reflected immediately in memory', async () => {
      await store.addBookmark('memory.ts', 0, 10);
      await store.createFolder('MemoryTest');

      const state = store.getState();
      assert.ok(state.items.length >= 2, 'Should have at least 2 items in memory');

      const bookmark = store.findBookmarkByFilePath('memory.ts');
      assert.ok(bookmark);
      assert.strictEqual(bookmark.numbers[0], 10);
    });

    test('Folder expanded state should update in memory', async () => {
      await store.createFolder('Expandable');

      const state1 = store.getState();
      const folder1 = state1.items.find(i => i.type === 'folder');
      assert.ok(folder1);
      assert.ok(folder1.type === 'folder');
      assert.strictEqual(folder1.expanded, true);

      store.setFolderExpanded(folder1.id, false);

      const state2 = store.getState();
      const folder2 = state2.items.find(i => i.type === 'folder');
      assert.ok(folder2);
      assert.ok(folder2.type === 'folder');
      assert.strictEqual(folder2.expanded, false);
    });
  });

  suite('Full Workflow Tests', () => {
    test('Complete bookmark workflow', async () => {
      await store.createFolder('Project');
      await new Promise(resolve => setTimeout(resolve, 100));

      await store.addBookmark('src/index.ts', 0, 10);
      await store.addBookmark('src/utils.ts', 1, 20);
      await store.addBookmark('src/types.ts', 2, 30);
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = store.getState();
      const folder = state.items.find(i => i.type === 'folder');
      assert.ok(folder);

      const utils = store.findBookmarkByFilePath('src/utils.ts');
      assert.ok(utils);
      await store.moveNode(utils.id, folder.id);

      const types = store.findBookmarkByFilePath('src/types.ts');
      assert.ok(types);
      await store.moveNode(types.id, folder.id);
      await new Promise(resolve => setTimeout(resolve, 100));

      treeProvider.setFilter('utils');
      const filtered = treeProvider.getChildren();
      assert.ok(filtered.length > 0);

      treeProvider.clearFilter();

      const index = store.findBookmarkByFilePath('src/index.ts');
      assert.ok(index);
      await store.renameBookmark(index.id, 'Entry Point');

      const renamed = store.findBookmarkByFilePath('src/index.ts');
      assert.ok(renamed);
      assert.strictEqual(renamed.label, 'Entry Point');

      const result0 = store.findBookmarkByNumber(0);
      assert.ok(result0);
      assert.strictEqual(result0.line, 10);

      const next = store.getAdjacentBookmarkGlobal(0, 'next');
      assert.ok(next);
      assert.strictEqual(next.num, 1);

      await store.toggleBookmark('src/index.ts', 0, 10);
      const removed = store.findBookmarkByFilePath('src/index.ts');
      assert.strictEqual(removed, undefined);

      await store.clearAllBookmarks();
      assert.strictEqual(store.getState().items.length, 0);
    });

    test('Nested folder structure', async () => {
      await store.createFolder('Root');
      const state1 = store.getState();
      const root = state1.items[0];
      assert.ok(root);

      await store.createFolder('Child', root.id);
      await new Promise(resolve => setTimeout(resolve, 100));

      const state2 = store.getState();
      const updatedRoot = state2.items[0];
      assert.ok(updatedRoot);
      assert.ok(updatedRoot.type === 'folder');
      assert.strictEqual(updatedRoot.children.length, 1);
      assert.strictEqual(updatedRoot.children[0].type, 'folder');

      const child = updatedRoot.children[0];
      assert.ok(child.type === 'folder');

      await store.addBookmark('nested.ts', 0, 10);
      const bookmark = store.findBookmarkByFilePath('nested.ts');
      assert.ok(bookmark);
      await store.moveNode(bookmark.id, child.id);
      await new Promise(resolve => setTimeout(resolve, 100));

      const rootChildren = treeProvider.getChildren();
      assert.strictEqual(rootChildren.length, 1);

      const rootFolder = rootChildren[0];
      assert.strictEqual(rootFolder.type, 'folder');

      const childFolders = treeProvider.getChildren(rootFolder);
      assert.strictEqual(childFolders.length, 1);

      const nestedBookmarks = treeProvider.getChildren(childFolders[0]);
      assert.strictEqual(nestedBookmarks.length, 1);
      assert.strictEqual(nestedBookmarks[0].type, 'bookmark');
    });

    test('Multiple bookmarks in same file', async () => {
      await store.addBookmark('multi.ts', 0, 10);
      await store.addBookmark('multi.ts', 1, 20);
      await store.addBookmark('multi.ts', 2, 30);
      await store.addBookmark('multi.ts', 5, 50);
      await store.addBookmark('multi.ts', 9, 90);

      const bookmark = store.findBookmarkByFilePath('multi.ts');
      assert.ok(bookmark);
      assert.strictEqual(Object.keys(bookmark.numbers).length, 5);

      const numbers = store.getBookmarkNumbersInFile('multi.ts');
      assert.deepStrictEqual(numbers, [0, 1, 2, 5, 9]);

      const entries = store.getAllBookmarkEntries();
      assert.strictEqual(entries.length, 5);

      const next = store.getAdjacentBookmarkInFile('multi.ts', 2, 'next');
      assert.ok(next);
      assert.strictEqual(next.num, 5);

      const prev = store.getAdjacentBookmarkInFile('multi.ts', 2, 'previous');
      assert.ok(prev);
      assert.strictEqual(prev.num, 1);
    });
  });
});
