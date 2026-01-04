import * as assert from 'node:assert';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { StorageService } from '../../storage';
import type { FilemarkState } from '../../types';

suite('Storage Test Suite', () => {
  let storage: StorageService;
  let context: vscode.ExtensionContext;
  let testDir: string;

  setup(async () => {
    testDir = path.join('/tmp', `filemarks-test-${Date.now()}`);
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

    storage = new StorageService(context, mockWorkspaceFolder);
  });

  teardown(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('Should load default state when file does not exist', async () => {
    const state = await storage.load();

    assert.strictEqual(state.version, '1.0');
    assert.ok(Array.isArray(state.items));
    assert.strictEqual(state.items.length, 0);
  });

  test('Should save and load state', async () => {
    const testState: FilemarkState = {
      version: '1.0',
      items: [
        {
          type: 'bookmark',
          id: 'test-id',
          filePath: 'test.ts',
          numbers: { 0: 10 },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    await storage.save(testState);
    await new Promise(resolve => setTimeout(resolve, 600));

    const loaded = await storage.load();

    assert.strictEqual(loaded.version, '1.0');
    assert.strictEqual(loaded.items.length, 1);
    assert.strictEqual(loaded.items[0].type, 'bookmark');

    if (loaded.items[0].type === 'bookmark') {
      assert.strictEqual(loaded.items[0].filePath, 'test.ts');
      assert.strictEqual(loaded.items[0].numbers[0], 10);
    }
  });

  test('Should recover from corrupted data', async () => {
    const corruptedState = {
      version: '1.0',
      items: 'not an array',
    };

    await storage.save(corruptedState as unknown as FilemarkState);
    await new Promise(resolve => setTimeout(resolve, 600));

    const loaded = await storage.load();

    assert.strictEqual(loaded.version, '1.0');
    assert.ok(Array.isArray(loaded.items));
    assert.strictEqual(loaded.items.length, 0);
  });

  test('Should handle missing version in data', async () => {
    const invalidState = {
      items: [],
    };

    await storage.save(invalidState as unknown as FilemarkState);
    await new Promise(resolve => setTimeout(resolve, 600));

    const loaded = await storage.load();

    assert.strictEqual(loaded.version, '1.0');
    assert.ok(Array.isArray(loaded.items));
  });
});
