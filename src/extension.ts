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
let searchInputBox: vscode.InputBox | undefined;

export async function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.showWarningMessage(vscode.l10n.t('Filemarks requires an open workspace'));
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
    treeProvider.setTreeView(treeView);
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
      vscode.commands.registerCommand('filemarks.createFolderIn', async (node?: TreeNode) => {
        await handleCreateFolderIn(node);
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
      vscode.commands.registerCommand('filemarks.clear', () => {
        handleClear();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.clearAll', async () => {
        await handleClearAll();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.expandAllFolders', async () => {
        await handleExpandAllFolders();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.collapseAllFolders', async () => {
        await handleCollapseAllFolders();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.focusSidebar', async () => {
        await vscode.commands.executeCommand('filemarks.treeView.focus');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.jumpToPreviousBookmark', async () => {
        await handleJumpToAdjacentBookmark('previous');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.jumpToNextBookmark', async () => {
        await handleJumpToAdjacentBookmark('next');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.search', async () => {
        await handleSearch();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.clearSearch', () => {
        handleClearSearch();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.autoBookmark', () => {
        handleAutoBookmark();
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'filemarks.toggleBookmarkFromGutter',
        (lineInfo: { lineNumber: number }) => {
          handleToggleBookmarkFromGutter(lineInfo?.lineNumber);
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'filemarks.addBookmarkFromExplorer',
        async (uri: vscode.Uri) => {
          await handleAddBookmarkFromExplorer(uri);
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('filemarks.deleteSelected', async () => {
        await handleDeleteSelected();
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

    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        if (!bookmarkStore) return;
        const filePath = vscode.workspace.asRelativePath(document.uri.fsPath);
        bookmarkStore.removeInvalidBookmarks(filePath, document.lineCount);
      })
    );

    vscode.window.showInformationMessage(vscode.l10n.t('Filemarks extension activated!'));
  } catch (error) {
    vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to activate Filemarks: {0}', String(error))
    );
  }
}

function handleToggleBookmark(num: number): void {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('No active editor'));
    return;
  }

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  const line = editor.selection.active.line;

  bookmarkStore.toggleBookmark(filePath, num, line);
  vscode.window.showInformationMessage(
    vscode.l10n.t('Bookmark {0} toggled at line {1}', num, line + 1)
  );
}

function handleAutoBookmark(): void {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('No active editor'));
    return;
  }

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  const line = editor.selection.active.line;
  const bookmark = bookmarkStore.findBookmarkByFilePath(filePath);

  // Check if there's already a bookmark at the current line
  if (bookmark) {
    const existingNum = Object.entries(bookmark.numbers).find(([, l]) => l === line);
    if (existingNum) {
      const num = Number(existingNum[0]);
      bookmarkStore.removeBookmarkNumber(filePath, num);
      vscode.window.showInformationMessage(
        vscode.l10n.t('Bookmark {0} removed from line {1}', num, line + 1)
      );
      return;
    }
  }

  // No bookmark at current line, create new one with next available number
  const usedNumbers = new Set(bookmark ? Object.keys(bookmark.numbers).map(Number) : []);
  let targetNum = 0;
  for (let i = 0; i <= 9; i++) {
    if (!usedNumbers.has(i)) {
      targetNum = i;
      break;
    }
  }

  bookmarkStore.toggleBookmark(filePath, targetNum, line);
  vscode.window.showInformationMessage(
    vscode.l10n.t('Bookmark {0} created at line {1}', targetNum, line + 1)
  );
}

function handleJumpToBookmark(num: number): void {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('No active editor'));
    return;
  }

  const config = vscode.workspace.getConfiguration('filemarks');
  const showWarning = config.get<boolean>('showBookmarkNotDefinedWarning', true);

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  const bookmark = bookmarkStore.findBookmarkByFilePath(filePath);

  if (!bookmark || bookmark.numbers[num] === undefined) {
    if (showWarning) {
      vscode.window.showWarningMessage(vscode.l10n.t('Bookmark {0} is not defined', num));
    }
    return;
  }

  const line = bookmark.numbers[num];
  const revealLocation = config.get<string>('revealLocation', 'center');
  const revealType =
    revealLocation === 'top'
      ? vscode.TextEditorRevealType.AtTop
      : vscode.TextEditorRevealType.InCenter;

  const position = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), revealType);
}

async function handleJumpToAdjacentBookmark(direction: 'previous' | 'next'): Promise<void> {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('No active editor'));
    return;
  }

  const config = vscode.workspace.getConfiguration('filemarks');
  const navigateThroughAllFiles = config.get<boolean>('navigateThroughAllFiles', true);
  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);

  const currentBookmark = bookmarkStore.findBookmarkByFilePath(filePath);
  const currentLine = editor.selection.active.line;

  let currentNum = -1;
  if (currentBookmark) {
    const entry = Object.entries(currentBookmark.numbers).find(([, line]) => line === currentLine);
    if (entry) {
      currentNum = Number(entry[0]);
    } else {
      if (direction === 'next') {
        currentNum = -1;
      } else {
        currentNum = 10;
      }
    }
  }

  if (navigateThroughAllFiles) {
    const result = bookmarkStore.getAdjacentBookmarkGlobal(currentNum, direction);
    if (!result) {
      vscode.window.showWarningMessage(vscode.l10n.t('No bookmarks found'));
      return;
    }
    await handleGoToBookmark(result.bookmark, result.line);
  } else {
    const result = bookmarkStore.getAdjacentBookmarkInFile(filePath, currentNum, direction);
    if (!result) {
      vscode.window.showWarningMessage(vscode.l10n.t('No bookmarks in current file'));
      return;
    }

    const revealLocation = config.get<string>('revealLocation', 'center');
    const revealType =
      revealLocation === 'top'
        ? vscode.TextEditorRevealType.AtTop
        : vscode.TextEditorRevealType.InCenter;

    const position = new vscode.Position(result.line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), revealType);
  }
}

export function deactivate() {
  searchInputBox?.dispose();
  searchInputBox = undefined;
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
    vscode.window.showErrorMessage(vscode.l10n.t('Failed to go to bookmark: {0}', String(error)));
  }
}

function handleDeleteBookmark(node: BookmarkNode): void {
  if (!bookmarkStore) return;

  bookmarkStore.deleteBookmark(node.id);
  vscode.window.showInformationMessage(vscode.l10n.t('Bookmark deleted'));
}

async function handleRenameBookmark(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  const newLabel = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter new bookmark name'),
    value: node.label || '',
    placeHolder: vscode.l10n.t('Bookmark name (optional)'),
  });

  if (newLabel === undefined) return;

  bookmarkStore.renameBookmark(node.id, newLabel);
  vscode.window.showInformationMessage(vscode.l10n.t('Bookmark renamed'));
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
      showAll ? vscode.l10n.t('No bookmarks found') : vscode.l10n.t('No bookmarks in current file')
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
      ? vscode.l10n.t('Select a bookmark')
      : vscode.l10n.t('Select a bookmark in current file'),
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
    prompt: vscode.l10n.t('Enter folder name'),
    placeHolder: vscode.l10n.t('Folder name'),
  });

  if (!name) return;

  const lastUsedFolderId = bookmarkStore.getLastUsedFolderId();
  bookmarkStore.createFolder(name, lastUsedFolderId ?? undefined);

  if (lastUsedFolderId) {
    vscode.window.showInformationMessage(vscode.l10n.t('Folder created in selected folder'));
  } else {
    vscode.window.showInformationMessage(vscode.l10n.t('Folder "{0}" created', name));
  }
}

async function handleCreateFolderIn(node?: TreeNode): Promise<void> {
  if (!bookmarkStore) return;

  const name = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter folder name'),
    placeHolder: vscode.l10n.t('Folder name'),
  });

  if (!name) return;

  if (node && isFolderNode(node)) {
    bookmarkStore.createFolder(name, node.id);
    vscode.window.showInformationMessage(vscode.l10n.t('Folder created in "{0}"', node.name));
  } else {
    bookmarkStore.createFolder(name);
    vscode.window.showInformationMessage(vscode.l10n.t('Folder "{0}" created', name));
  }
}

async function handleDeleteFolder(node: TreeNode): Promise<void> {
  if (!bookmarkStore) return;

  const deleteButton = vscode.l10n.t('Delete');
  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('Delete folder "{0}" and all its contents?', isFolderNode(node) ? node.name : ''),
    { modal: true },
    deleteButton
  );

  if (confirm !== deleteButton) return;

  bookmarkStore.deleteFolder(node.id);
  vscode.window.showInformationMessage(vscode.l10n.t('Folder deleted'));
}

async function handleRenameFolder(node: TreeNode): Promise<void> {
  if (!bookmarkStore || !isFolderNode(node)) return;

  const newName = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter new folder name'),
    value: node.name,
    placeHolder: vscode.l10n.t('Folder name'),
  });

  if (!newName) return;

  bookmarkStore.renameFolder(node.id, newName);
  vscode.window.showInformationMessage(vscode.l10n.t('Folder renamed'));
}

async function handleMoveToFolder(node: BookmarkNode): Promise<void> {
  if (!bookmarkStore) return;

  const folders = collectAllFolders(bookmarkStore.getState().items);
  const items = [
    {
      label: `$(root-folder) ${vscode.l10n.t('Root')}`,
      description: vscode.l10n.t('Move to root level'),
      id: null,
    },
    ...folders.map(folder => ({
      label: `$(folder) ${folder.name}`,
      description: folder.name,
      id: folder.id,
    })),
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: vscode.l10n.t('Select target folder'),
  });

  if (!selected) return;

  bookmarkStore.moveNode(node.id, selected.id);
  vscode.window.showInformationMessage(vscode.l10n.t('Bookmark moved'));
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

function handleClear(): void {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('No active editor'));
    return;
  }

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  bookmarkStore.clearBookmarksInFile(filePath);
  vscode.window.showInformationMessage(vscode.l10n.t('Bookmarks cleared in current file'));
}

async function handleClearAll(): Promise<void> {
  if (!bookmarkStore) return;

  const deleteAllButton = vscode.l10n.t('Delete All');
  const confirm = await vscode.window.showWarningMessage(
    vscode.l10n.t('Delete ALL bookmarks in ALL files? This cannot be undone.'),
    { modal: true },
    deleteAllButton
  );

  if (confirm !== deleteAllButton) return;

  bookmarkStore.clearAllBookmarks();
  vscode.window.showInformationMessage(vscode.l10n.t('All bookmarks cleared'));
}

async function handleExpandAllFolders(): Promise<void> {
  if (!treeProvider) return;
  await treeProvider.expandAllFolders();
}

async function handleCollapseAllFolders(): Promise<void> {
  if (!treeProvider) return;
  await treeProvider.collapseAllFolders();
}

async function handleSearch(): Promise<void> {
  if (!treeProvider) return;

  if (searchInputBox) {
    searchInputBox.show();
    return;
  }

  searchInputBox = vscode.window.createInputBox();
  searchInputBox.placeholder = vscode.l10n.t('Search bookmarks (fuzzy match)');
  searchInputBox.value = treeProvider.getFilter();

  searchInputBox.onDidChangeValue(value => {
    if (treeProvider) {
      treeProvider.setFilter(value);
    }
  });

  searchInputBox.onDidAccept(() => {
    searchInputBox?.hide();
  });

  searchInputBox.onDidHide(() => {
    // Intentionally keep filter active when hidden
  });

  searchInputBox.show();
}

function handleClearSearch(): void {
  if (!treeProvider) return;
  treeProvider.clearFilter();
  if (searchInputBox) {
    searchInputBox.value = '';
  }
}

function handleToggleBookmarkFromGutter(lineNumber?: number): void {
  if (!bookmarkStore) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(vscode.l10n.t('No active editor'));
    return;
  }

  const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
  const line = lineNumber !== undefined ? lineNumber - 1 : editor.selection.active.line;
  const bookmark = bookmarkStore.findBookmarkByFilePath(filePath);

  if (bookmark) {
    const existingNum = Object.entries(bookmark.numbers).find(([, l]) => l === line);
    if (existingNum) {
      const num = Number(existingNum[0]);
      bookmarkStore.removeBookmarkNumber(filePath, num);
      vscode.window.showInformationMessage(
        vscode.l10n.t('Bookmark {0} removed from line {1}', num, line + 1)
      );
      return;
    }
  }

  const usedNumbers = new Set(bookmark ? Object.keys(bookmark.numbers).map(Number) : []);
  let targetNum = 0;
  for (let i = 0; i <= 9; i++) {
    if (!usedNumbers.has(i)) {
      targetNum = i;
      break;
    }
  }

  bookmarkStore.toggleBookmark(filePath, targetNum, line);
  vscode.window.showInformationMessage(
    vscode.l10n.t('Bookmark {0} created at line {1}', targetNum, line + 1)
  );
}

async function handleAddBookmarkFromExplorer(uri: vscode.Uri): Promise<void> {
  if (!bookmarkStore) return;

  const filePath = vscode.workspace.asRelativePath(uri.fsPath);

  const existingBookmark = bookmarkStore.findBookmarkByFilePath(filePath);
  if (existingBookmark && existingBookmark.numbers[0] !== undefined) {
    vscode.window.showInformationMessage(
      vscode.l10n.t('Bookmark already exists for {0}', path.basename(filePath))
    );
    return;
  }

  bookmarkStore.toggleBookmark(filePath, 0, 0);
  vscode.window.showInformationMessage(
    vscode.l10n.t('Bookmark 0 added to {0}', path.basename(filePath))
  );
}

async function handleDeleteSelected(): Promise<void> {
  if (!bookmarkStore || !treeProvider) return;

  const selection = treeProvider.getSelection();
  if (!selection || selection.length === 0) {
    vscode.window.showWarningMessage(vscode.l10n.t('No item selected'));
    return;
  }

  const node = selection[0];

  if (isFolderNode(node)) {
    const deleteButton = vscode.l10n.t('Delete');
    const confirm = await vscode.window.showWarningMessage(
      vscode.l10n.t('Delete folder "{0}" and all its contents?', node.name),
      { modal: true },
      deleteButton
    );

    if (confirm !== deleteButton) return;

    bookmarkStore.deleteFolder(node.id);
    vscode.window.showInformationMessage(vscode.l10n.t('Folder deleted'));
  } else if (isBookmarkNode(node)) {
    bookmarkStore.deleteBookmark(node.id);
    vscode.window.showInformationMessage(vscode.l10n.t('Bookmark deleted'));
  }
}
