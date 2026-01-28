import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BookmarkStore } from '../../bookmarkStore';
import { StorageService } from '../../storage';

suite('BookmarkStore Git Operations', () => {
  let store: BookmarkStore;
  let context: vscode.ExtensionContext;
  let testDir: string;
  let testFile: string;

  setup(async () => {
    testDir = path.join('/tmp', `git-ops-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    testFile = path.join(testDir, 'test.ts');
    await fs.writeFile(testFile, 'const x = 1;\nconst y = 2;\nconst z = 3;\n');

    context = {
      subscriptions: [],
      globalStorageUri: vscode.Uri.file(testDir),
    } as unknown as vscode.ExtensionContext;

    const mockWorkspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file(testDir),
      name: 'test-workspace',
      index: 0,
    };

    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [mockWorkspaceFolder],
      configurable: true,
    });

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

  test('Should preserve bookmark when file temporarily deleted and recreated', async function () {
    this.timeout(5000);

    // 1. Create file and bookmark
    const relPath = vscode.workspace.asRelativePath(testFile);
    await store.addBookmark(relPath, 0, 5);

    let bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should exist after creation');
    assert.strictEqual(bookmark.numbers[0], 5, 'Bookmark should be at line 5');

    // 2. Delete file (simulate git delete)
    await fs.rm(testFile);

    // 3. Wait 500ms (within grace period of 1000ms)
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Recreate file (simulate git recreate)
    await fs.writeFile(testFile, 'const x = 1;\nconst y = 2;\nconst z = 3;\n');

    // 5. Wait 600ms more (total > grace period)
    await new Promise(resolve => setTimeout(resolve, 600));

    // 6. Verify bookmark still exists
    bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should be preserved after file recreation');
    assert.strictEqual(bookmark.numbers[0], 5, 'Bookmark line should remain unchanged');
  });

  test('Should preserve bookmarks across file delete/recreate within grace period', async function () {
    this.timeout(3000);

    const relPath = vscode.workspace.asRelativePath(testFile);
    await store.addBookmark(relPath, 1, 10);

    let bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should exist after creation');
    const bookmarkId = bookmark.id;

    await fs.rm(testFile);

    await new Promise(resolve => setTimeout(resolve, 500));

    await fs.writeFile(testFile, 'const x = 1;\nconst y = 2;\nconst z = 3;\n');

    await new Promise(resolve => setTimeout(resolve, 100));

    bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should be preserved after file recreation');
    assert.strictEqual(bookmark.id, bookmarkId, 'Bookmark ID should remain the same');
    assert.strictEqual(bookmark.numbers[1], 10, 'Bookmark line should be preserved');
  });

  test('Should update bookmark path when file renamed', async function () {
    this.timeout(3000);

    const relPath = vscode.workspace.asRelativePath(testFile);
    await store.addBookmark(relPath, 2, 15);

    let bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should exist after creation');
    assert.strictEqual(bookmark.filePath, relPath, 'Bookmark path should match original');

    const newFile = path.join(testDir, 'renamed.ts');
    const newRelPath = vscode.workspace.asRelativePath(newFile);

    await fs.rename(testFile, newFile);

    if (bookmark) {
      bookmark.filePath = newRelPath;
      bookmark.updatedAt = new Date().toISOString();
    }

    bookmark = store.findBookmarkByFilePath(newRelPath);
    assert.ok(bookmark, 'Bookmark should exist at new path');
    assert.strictEqual(bookmark.filePath, newRelPath, 'Bookmark path should be updated');
    assert.strictEqual(bookmark.numbers[2], 15, 'Bookmark line should remain unchanged');
  });

  test('Should ignore .git directory changes', async function () {
    this.timeout(3000);

    // 1. Create .git directory structure
    const gitDir = path.join(testDir, '.git');
    await fs.mkdir(gitDir, { recursive: true });
    const gitIndexFile = path.join(gitDir, 'index');
    await fs.writeFile(gitIndexFile, 'git index content');

    // 2. Add a regular bookmark to verify store is working
    const relPath = vscode.workspace.asRelativePath(testFile);
    await store.addBookmark(relPath, 3, 20);

    let bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Regular bookmark should exist');

    // 3. Delete .git/index file (should be ignored)
    await fs.rm(gitIndexFile);

    // 4. Wait for any potential processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Verify no errors and regular bookmark still exists
    bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Regular bookmark should still exist after .git changes');
    assert.strictEqual(bookmark.numbers[3], 20, 'Bookmark should be unaffected by .git changes');
  });

  test('Should handle multiple bookmarks in same file during git operations', async function () {
    this.timeout(5000);

    // 1. Create file with multiple bookmarks
    const relPath = vscode.workspace.asRelativePath(testFile);
    await store.addBookmark(relPath, 0, 5);
    await store.addBookmark(relPath, 1, 10);
    await store.addBookmark(relPath, 2, 15);

    let bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should exist');
    assert.strictEqual(Object.keys(bookmark.numbers).length, 3, 'Should have 3 bookmarks');

    // 2. Delete and recreate file within grace period
    await fs.rm(testFile);
    await new Promise(resolve => setTimeout(resolve, 500));
    await fs.writeFile(testFile, 'const x = 1;\nconst y = 2;\nconst z = 3;\n');
    await new Promise(resolve => setTimeout(resolve, 600));

    // 3. Verify all bookmarks preserved
    bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should be preserved');
    assert.strictEqual(
      Object.keys(bookmark.numbers).length,
      3,
      'All 3 bookmarks should be preserved'
    );
    assert.strictEqual(bookmark.numbers[0], 5, 'Bookmark 0 should be at line 5');
    assert.strictEqual(bookmark.numbers[1], 10, 'Bookmark 1 should be at line 10');
    assert.strictEqual(bookmark.numbers[2], 15, 'Bookmark 2 should be at line 15');
  });

  test('Should preserve bookmarks in other files during git operations', async function () {
    this.timeout(5000);

    // 1. Create two files with bookmarks
    const file1 = path.join(testDir, 'file1.ts');
    const file2 = path.join(testDir, 'file2.ts');
    await fs.writeFile(file1, 'const a = 1;\n');
    await fs.writeFile(file2, 'const b = 2;\n');

    const relPath1 = vscode.workspace.asRelativePath(file1);
    const relPath2 = vscode.workspace.asRelativePath(file2);

    await store.addBookmark(relPath1, 0, 5);
    await store.addBookmark(relPath2, 1, 10);

    // 2. Delete file1 and recreate within grace period
    await fs.rm(file1);
    await new Promise(resolve => setTimeout(resolve, 500));
    await fs.writeFile(file1, 'const a = 1;\n');
    await new Promise(resolve => setTimeout(resolve, 600));

    // 3. Verify both bookmarks still exist
    const bookmark1 = store.findBookmarkByFilePath(relPath1);
    const bookmark2 = store.findBookmarkByFilePath(relPath2);

    assert.ok(bookmark1, 'Bookmark in file1 should be preserved');
    assert.ok(bookmark2, 'Bookmark in file2 should be unaffected');
    assert.strictEqual(bookmark1.numbers[0], 5, 'File1 bookmark should be at line 5');
    assert.strictEqual(bookmark2.numbers[1], 10, 'File2 bookmark should be at line 10');
  });

  test('Should handle rapid delete/recreate cycles', async function () {
    this.timeout(5000);

    // 1. Create file and bookmark
    const relPath = vscode.workspace.asRelativePath(testFile);
    await store.addBookmark(relPath, 0, 5);

    // 2. Perform rapid delete/recreate cycles
    for (let i = 0; i < 3; i++) {
      await fs.rm(testFile);
      await new Promise(resolve => setTimeout(resolve, 300));
      await fs.writeFile(testFile, 'const x = 1;\nconst y = 2;\nconst z = 3;\n');
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 3. Wait for grace period to complete
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 4. Verify bookmark still exists
    const bookmark = store.findBookmarkByFilePath(relPath);
    assert.ok(bookmark, 'Bookmark should survive rapid delete/recreate cycles');
    assert.strictEqual(bookmark.numbers[0], 5, 'Bookmark should be at line 5');
  });
});
