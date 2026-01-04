import * as vscode from 'vscode';
import { StorageService } from './storage';
import { BookmarkStore } from './bookmarkStore';
import { GutterDecorationProvider } from './decorations';
import { FilemarkTreeProvider } from './views/treeProvider';

import type { BookmarkNode } from './types';

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
