import * as vscode from 'vscode';
import * as path from 'node:path';
import type { BookmarkStore } from '../bookmarkStore';
import type { TreeNode, BookmarkNode, FolderNode } from '../types';
import { isBookmarkNode, isFolderNode } from '../types';

export class FilemarkTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private store: BookmarkStore) {
    this.store.onDidChangeBookmarks(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (isFolderNode(element)) {
      return this.createFolderTreeItem(element);
    }
    return this.createBookmarkTreeItem(element);
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return this.store.getState().items;
    }

    if (isFolderNode(element)) {
      return element.children;
    }

    return [];
  }

  private createFolderTreeItem(folder: FolderNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      folder.name,
      folder.expanded
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed
    );
    item.contextValue = 'folder';
    item.iconPath = new vscode.ThemeIcon('folder');
    return item;
  }

  private createBookmarkTreeItem(bookmark: BookmarkNode): vscode.TreeItem {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const fileName = path.basename(bookmark.filePath);
    const numbers = Object.keys(bookmark.numbers).sort((a, b) => Number(a) - Number(b));
    const numbersStr = numbers.join(',');

    const label = bookmark.label || `${fileName}`;
    const description = `[${numbersStr}]`;

    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.description = description;
    item.contextValue = 'bookmark';
    item.tooltip = this.createTooltip(bookmark);
    item.iconPath = new vscode.ThemeIcon('bookmark');

    if (workspaceFolder && numbers.length > 0) {
      const firstNumber = Number(numbers[0]);
      const firstLine = bookmark.numbers[firstNumber];
      item.command = {
        command: 'filemarks.goToBookmark',
        title: 'Go to Bookmark',
        arguments: [bookmark, firstLine],
      };
    }

    return item;
  }

  private createTooltip(bookmark: BookmarkNode): string {
    const lines: string[] = [];
    lines.push(`File: ${bookmark.filePath}`);

    const sortedNumbers = Object.entries(bookmark.numbers).sort(
      ([a], [b]) => Number(a) - Number(b)
    );

    for (const [num, line] of sortedNumbers) {
      lines.push(`  [${num}] Line ${line + 1}`);
    }

    return lines.join('\n');
  }
}
