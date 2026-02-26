import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'nicegyuha.filemarks';

suite('Extension Integration Test Suite', () => {
  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension(EXTENSION_ID));
  });

  test('Extension should activate', async function () {
    this.timeout(10000);

    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);

    await ext.activate();
    assert.strictEqual(ext.isActive, true);
  });

  test('Commands should be registered', async function () {
    this.timeout(10000);

    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);
    await ext.activate();

    const commands = await vscode.commands.getCommands();

    const expectedCommands = [
      'filemarks.toggleBookmark0',
      'filemarks.jumpToBookmark0',
      'filemarks.goToBookmark',
      'filemarks.deleteBookmark',
      'filemarks.renameBookmark',
      'filemarks.list',
      'filemarks.listAll',
      'filemarks.createFolder',
      'filemarks.deleteFolder',
      'filemarks.renameFolder',
      'filemarks.moveToFolder',
      'filemarks.clear',
      'filemarks.clearAll',
    ];

    for (const cmd of expectedCommands) {
      assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
    }
  });

  test('Configuration should have expected properties', () => {
    const config = vscode.workspace.getConfiguration('filemarks');

    assert.ok(config.has('saveBookmarksInProject'));
    assert.ok(config.has('navigateThroughAllFiles'));
    assert.ok(config.has('showBookmarkNotDefinedWarning'));
    assert.ok(config.has('revealLocation'));
    assert.ok(config.has('gutterIconFillColor'));
    assert.ok(config.has('gutterIconNumberColor'));
  });
});
