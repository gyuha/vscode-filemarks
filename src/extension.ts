import * as vscode from 'vscode';
import * as path from 'node:path';
import { StorageService } from './storage';
import { BookmarkStore } from './bookmarkStore';
import { GutterDecorationProvider } from './decorations';
import { FilemarkTreeProvider } from './views/treeProvider';
import type { BookmarkNode, TreeNode } from './types';
import { isBookmarkNode, isFolderNode } from './types';

let bookmarkStore: BookmarkStore | undefined;
let decorationProvider: GutterDecorationProvider | undefined;
let treeProvider: FilemarkTreeProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showWarningMessage('Filemarks requires an open workspace');
    return;
  }

  try {
    const storage = new StorageService(context);
    bookmarkStore = new BookmarkStore(context, storage);
    await bookmarkStore.initialize();

    decorationProvider = new GutterDecorationProvider(context, bookmarkStore);
    context.subscriptions.push(decorationProvider);

    treeProvider = new FilemarkTreeProvider(bookmarkStore);
    const treeView = vscode.window.createTreeView('filemarks.treeView', {
      treeDataProvider: treeProvider,
    });
    context.subscriptions.push(treeView);

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.goToBookmark', async (bookmark, line) => {
        await handleGoToBookmark(bookmark, line);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.deleteBookmark', async node => {
        await handleDeleteBookmark(node);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.renameBookmark', async node => {
        await handleRenameBookmark(node);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.list', async () => {
        await handleListBookmarks(false);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.listAll', async () => {
        await handleListBookmarks(true);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.createFolder', async () => {
        await handleCreateFolder();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.deleteFolder', async node => {
        await handleDeleteFolder(node);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.renameFolder', async node => {
        await handleRenameFolder(node);
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.moveToFolder', async node => {
        await handleMoveToFolder(node);
      })
    );

    for (let i = 0; i <= 9; i++) {
      const num = i;

      const toggleDisposable = vscode.commands.registerCommand(
        `filemarks.toggleBookmark${num}`,
        async () => {
          await handleToggleBookmark(num);
        }
      );
      context.subscriptions.push(toggleDisposable);

      const jumpDisposable = vscode.commands.registerCommand(
        `filemarks.jumpToBookmark${num}`,
        async () => {
          await handleJumpToBookmark(num);
        }
      );
      context.subscriptions.push(jumpDisposable);
    }

    vscode.window.showInformationMessage('Filemarks extension activated!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to activate Filemarks: ${error}`);
  }
}

async function handleToggleBookmark(num: number): Promise<void> {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  const line = editor.selection.active.line;

  try {
    await bookmarkStore.toggleBookmark(filePath, num, line);
    vscode.window.showInformationMessage(`Bookmark ${num} toggled at line ${line + 1}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to toggle bookmark: ${error}`);
  }
}

async function handleJumpToBookmark(num: number): Promise<void> {
  if (!bookmarkStore) return;

  const result = bookmarkStore.findBookmarkByNumber(num);
  if (!result) {
    vscode.window.showWarningMessage(`Bookmark ${num} is not defined`);
    return;
  }

  const { bookmark, line } = result;

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, bookmark.filePath);
    const document = await vscode.workspace.openTextDocument(absolutePath);
    const editor = await vscode.window.showTextDocument(document);

    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

    vscode.window.showInformationMessage(
      `Jumped to bookmark ${num}: ${bookmark.filePath}:${line + 1}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to jump to bookmark: ${error}`);
  }
}

export function deactivate() {
  bookmarkStore = undefined;
  decorationProvider = undefined;
  treeProvider = undefined;
}

async function handleGoToBookmark(bookmark: BookmarkNode, line: number): Promise<void> {
  if (!bookmarkStore) return;

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, bookmark.filePath);
    const document = await vscode.workspace.openTextDocument(absolutePath);
    const editor = await vscode.window.showTextDocument(document);

    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to go to bookmark: ${error}`);
  }
}

async function handleDeleteBookmark(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  try {
    await bookmarkStore.deleteBookmark(node.id);
    vscode.window.showInformationMessage('Bookmark deleted');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete bookmark: ${error}`);
  }
}

async function handleRenameBookmark(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  const newLabel = await vscode.window.showInputBox({
    prompt: 'Enter new bookmark name',
    value: node.label || '',
    placeHolder: 'Bookmark name (optional)',
  });

  if (newLabel === undefined) return;

  try {
    await bookmarkStore.renameBookmark(node.id, newLabel);
    vscode.window.showInformationMessage('Bookmark renamed');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to rename bookmark: ${error}`);
  }
}

async function handleListBookmarks(showAll: boolean): Promise<void> {
  if (!bookmarkStore) return;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const currentFilePath = vscode.window.activeTextEditor
    ? vscode.workspace.asRelativePath(vscode.window.activeTextEditor.document.uri.fsPath)
    : undefined;

  const allBookmarks = collectAllBookmarks(bookmarkStore.getState().items);
  const bookmarks = showAll
    ? allBookmarks
    : currentFilePath
      ? allBookmarks.filter(b => b.filePath === currentFilePath)
      : [];

  if (bookmarks.length === 0) {
    vscode.window.showInformationMessage(
      showAll ? 'No bookmarks found' : 'No bookmarks in current file'
    );
    return;
  }

  const items = bookmarks.flatMap(bookmark =>
    Object.entries(bookmark.numbers)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([num, line]) => ({
        label: `[${num}] ${bookmark.label || path.basename(bookmark.filePath)}`,
        description: `Line ${line + 1}`,
        detail: bookmark.filePath,
        bookmark,
        line,
      }))
  );

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: showAll ? 'Select a bookmark' : 'Select a bookmark in current file',
  });

  if (selected) {
    await handleGoToBookmark(selected.bookmark, selected.line);
  }
}

function collectAllBookmarks(nodes: TreeNode[]): BookmarkNode[] {
  const bookmarks: BookmarkNode[] = [];
  for (const node of nodes) {
    if (isBookmarkNode(node)) {
      bookmarks.push(node);
    } else if (isFolderNode(node)) {
      bookmarks.push(...collectAllBookmarks(node.children));
    }
  }
  return bookmarks;
}

async function handleCreateFolder(): Promise<void> {
  if (!bookmarkStore) return;

  const name = await vscode.window.showInputBox({
    prompt: 'Enter folder name',
    placeHolder: 'Folder name',
  });

  if (!name) return;

  try {
    await bookmarkStore.createFolder(name);
    vscode.window.showInformationMessage(`Folder "${name}" created`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create folder: ${error}`);
  }
}

async function handleDeleteFolder(node: TreeNode): Promise<void> {
  if (!bookmarkStore) return;

  const confirm = await vscode.window.showWarningMessage(
    `Delete folder "${isFolderNode(node) ? node.name : ''}" and all its contents?`,
    { modal: true },
    'Delete'
  );

  if (confirm !== 'Delete') return;

  try {
    await bookmarkStore.deleteFolder(node.id);
    vscode.window.showInformationMessage('Folder deleted');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete folder: ${error}`);
  }
}

async function handleRenameFolder(node: TreeNode): Promise<void> {
  if (!bookmarkStore || !isFolderNode(node)) return;

  const newName = await vscode.window.showInputBox({
    prompt: 'Enter new folder name',
    value: node.name,
    placeHolder: 'Folder name',
  });

  if (!newName) return;

  try {
    await bookmarkStore.renameFolder(node.id, newName);
    vscode.window.showInformationMessage('Folder renamed');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to rename folder: ${error}`);
  }
}

async function handleMoveToFolder(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  const folders = collectAllFolders(bookmarkStore.getState().items);
  const items = [
    { label: '$(root-folder) Root', description: 'Move to root level', id: null },
    ...folders.map(folder => ({
      label: `$(folder) ${folder.name}`,
      description: folder.name,
      id: folder.id,
    })),
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select target folder',
  });

  if (!selected) return;

  try {
    await bookmarkStore.moveNode(node.id, selected.id);
    vscode.window.showInformationMessage('Bookmark moved');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to move bookmark: ${error}`);
  }
}

function collectAllFolders(nodes: TreeNode[]): Array<TreeNode & { type: 'folder' }> {
  const folders: Array<TreeNode & { type: 'folder' }> = [];
  for (const node of nodes) {
    if (isFolderNode(node)) {
      folders.push(node);
      folders.push(...collectAllFolders(node.children));
    }
  }
  return folders;
}
