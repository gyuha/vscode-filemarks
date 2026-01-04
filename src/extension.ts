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
    vscode.window.showWarningMessage(vscode.l10n.t('extension.requiresWorkspace'));
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
      dragAndDropController: treeProvider.dragAndDropController,
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

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.clear', async () => {
        await handleClear();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.clearAll', async () => {
        await handleClearAll();
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

    vscode.window.showInformationMessage(vscode.l10n.t('extension.activated'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('extension.activationFailed', String(error)));
  }
}

async function handleToggleBookmark(num: number): Promise<void> {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('input.noActiveEditor'));
    return;
  }

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  const line = editor.selection.active.line;

  try {
    await bookmarkStore.toggleBookmark(filePath, num, line);
    vscode.window.showInformationMessage(vscode.l10n.t('bookmark.toggled', num, line + 1));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToToggle', String(error)));
  }
}

async function handleJumpToBookmark(num: number): Promise<void> {
  if (!bookmarkStore) return;

  const config = vscode.workspace.getConfiguration('filemarks');
  const showWarning = config.get<boolean>('showBookmarkNotDefinedWarning', true);

  const result = bookmarkStore.findBookmarkByNumber(num);
  if (!result) {
    if (showWarning) {
      vscode.window.showWarningMessage(vscode.l10n.t('bookmark.notDefined', num));
    }
    return;
  }

  const { bookmark, line } = result;

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, bookmark.filePath);
    const document = await vscode.workspace.openTextDocument(absolutePath);
    const editor = await vscode.window.showTextDocument(document);

    const revealLocation = config.get<string>('revealLocation', 'center');
    const revealType =
      revealLocation === 'top'
        ? vscode.TextEditorRevealType.AtTop
        : vscode.TextEditorRevealType.InCenter;

    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), revealType);

    vscode.window.showInformationMessage(
      vscode.l10n.t('bookmark.jumpedTo', num, bookmark.filePath, line + 1)
    );
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToJump', String(error)));
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

    const config = vscode.workspace.getConfiguration('filemarks');
    const revealLocation = config.get<string>('revealLocation', 'center');
    const revealType =
      revealLocation === 'top'
        ? vscode.TextEditorRevealType.AtTop
        : vscode.TextEditorRevealType.InCenter;

    const position = new vscode.Position(line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), revealType);
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToGoTo', String(error)));
  }
}

async function handleDeleteBookmark(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  try {
    await bookmarkStore.deleteBookmark(node.id);
    vscode.window.showInformationMessage(vscode.l10n.t('bookmark.deleted'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToDelete', String(error)));
  }
}

async function handleRenameBookmark(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  const newLabel = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('input.enterBookmarkName'),
    value: node.label || '',
    placeHolder: vscode.l10n.t('input.bookmarkName'),
  });

  if (newLabel === undefined) return;

  try {
    await bookmarkStore.renameBookmark(node.id, newLabel);
    vscode.window.showInformationMessage(vscode.l10n.t('bookmark.renamed'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToRename', String(error)));
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
      showAll ? vscode.l10n.t('list.noBookmarks') : vscode.l10n.t('list.noBookmarksInFile')
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
    placeHolder: showAll
      ? vscode.l10n.t('list.selectBookmark')
      : vscode.l10n.t('list.selectBookmarkInFile'),
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
    prompt: vscode.l10n.t('input.enterFolderName'),
    placeHolder: vscode.l10n.t('input.folderName'),
  });

  if (!name) return;

  try {
    await bookmarkStore.createFolder(name);
    vscode.window.showInformationMessage(vscode.l10n.t('folder.created', name));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToCreateFolder', String(error)));
  }
}

async function handleDeleteFolder(node: TreeNode): Promise<void> {
  if (!bookmarkStore) return;

  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('folder.deleteConfirm', isFolderNode(node) ? node.name : ''),
    { modal: true },
    vscode.l10n.t('folder.deleteButton')
  );

  if (confirm !== vscode.l10n.t('folder.deleteButton')) return;

  try {
    await bookmarkStore.deleteFolder(node.id);
    vscode.window.showInformationMessage(vscode.l10n.t('folder.deleted'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToDeleteFolder', String(error)));
  }
}

async function handleRenameFolder(node: TreeNode): Promise<void> {
  if (!bookmarkStore || !isFolderNode(node)) return;

  const newName = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('input.enterNewFolderName'),
    value: node.name,
    placeHolder: vscode.l10n.t('input.folderName'),
  });

  if (!newName) return;

  try {
    await bookmarkStore.renameFolder(node.id, newName);
    vscode.window.showInformationMessage(vscode.l10n.t('folder.renamed'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToRenameFolder', String(error)));
  }
}

async function handleMoveToFolder(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  const folders = collectAllFolders(bookmarkStore.getState().items);
  const items = [
    {
      label: `$(root-folder) ${vscode.l10n.t('input.moveToRoot')}`,
      description: vscode.l10n.t('input.moveToRootDescription'),
      id: null,
    },
    ...folders.map(folder => ({
      label: `$(folder) ${folder.name}`,
      description: folder.name,
      id: folder.id,
    })),
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: vscode.l10n.t('input.selectTargetFolder'),
  });

  if (!selected) return;

  try {
    await bookmarkStore.moveNode(node.id, selected.id);
    vscode.window.showInformationMessage(vscode.l10n.t('bookmark.moved'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToMove', String(error)));
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

async function handleClear(): Promise<void> {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('input.noActiveEditor'));
    return;
  }

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('clear.confirm', path.basename(filePath)),
    { modal: true },
    vscode.l10n.t('clear.deleteButton')
  );

  if (confirm !== vscode.l10n.t('clear.deleteButton')) return;

  try {
    await bookmarkStore.clearBookmarksInFile(filePath);
    vscode.window.showInformationMessage(vscode.l10n.t('bookmark.clearedInFile'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToClear', String(error)));
  }
}

async function handleClearAll(): Promise<void> {
  if (!bookmarkStore) return;

  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('clear.confirmAll'),
    { modal: true },
    vscode.l10n.t('clear.deleteAllButton')
  );

  if (confirm !== vscode.l10n.t('clear.deleteAllButton')) return;

  try {
    await bookmarkStore.clearAllBookmarks();
    vscode.window.showInformationMessage(vscode.l10n.t('bookmark.clearedAll'));
  } catch (error) {
    vscode.window.showErrorMessage(vscode.l10n.t('error.failedToClearAll', String(error)));
  }
}
