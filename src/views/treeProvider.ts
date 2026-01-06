import * as vscode from 'vscode';
import * as path from 'node:path';
import type { BookmarkStore } from '../bookmarkStore';
import type { TreeNode, BookmarkNode, FolderNode } from '../types';
import { isFolderNode } from '../types';

class TreeDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
  private static readonly TREE_MIME_TYPE = 'application/vnd.code.tree.filemarks';
  private static readonly URI_LIST_MIME_TYPE = 'text/uri-list';

  dropMimeTypes = [TreeDragAndDropController.TREE_MIME_TYPE];
  dragMimeTypes = [
    TreeDragAndDropController.TREE_MIME_TYPE,
    TreeDragAndDropController.URI_LIST_MIME_TYPE,
  ];

  constructor(private store: BookmarkStore) {}

  async handleDrag(source: TreeNode[], dataTransfer: vscode.DataTransfer): Promise<void> {
    dataTransfer.set(TreeDragAndDropController.TREE_MIME_TYPE, new vscode.DataTransferItem(source));
    this.setUriListForEditorDrop(source, dataTransfer);
  }

  private setUriListForEditorDrop(source: TreeNode[], dataTransfer: vscode.DataTransfer): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    const uriList = source
      .filter((node): node is BookmarkNode => node.type === 'bookmark')
      .map(bookmark => vscode.Uri.joinPath(workspaceFolder.uri, bookmark.filePath).toString())
      .join('\r\n');

    if (uriList) {
      dataTransfer.set(
        TreeDragAndDropController.URI_LIST_MIME_TYPE,
        new vscode.DataTransferItem(uriList)
      );
    }
  }

  async handleDrop(target: TreeNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const transferItem = dataTransfer.get(TreeDragAndDropController.TREE_MIME_TYPE);
    if (!transferItem) return;

    const source = transferItem.value as TreeNode[];
    if (!source || source.length === 0) return;

    const sourceNode = source[0];
    const targetFolderId = target && isFolderNode(target) ? target.id : null;

    if (sourceNode.id === targetFolderId) return;

    await this.store.moveNode(sourceNode.id, targetFolderId);
  }
}

export class FilemarkTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  readonly dragAndDropController: vscode.TreeDragAndDropController<TreeNode>;
  private treeView: vscode.TreeView<TreeNode> | undefined;

  constructor(private store: BookmarkStore) {
    this.dragAndDropController = new TreeDragAndDropController(store);
    this.store.onDidChangeBookmarks(() => {
      this.refresh();
    });
  }

  setTreeView(treeView: vscode.TreeView<TreeNode>): void {
    this.treeView = treeView;

    treeView.onDidExpandElement(e => {
      if (isFolderNode(e.element)) {
        this.store.setFolderExpanded(e.element.id, true);
      }
    });

    treeView.onDidCollapseElement(e => {
      if (isFolderNode(e.element)) {
        this.store.setFolderExpanded(e.element.id, false);
      }
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

  getParent(element: TreeNode): TreeNode | undefined {
    const findParent = (nodes: TreeNode[], parent?: TreeNode): TreeNode | undefined => {
      for (const node of nodes) {
        if (node.id === element.id) {
          return parent;
        }
        if (isFolderNode(node)) {
          const found = findParent(node.children, node);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };

    return findParent(this.store.getState().items);
  }

  async expandAllFolders(): Promise<void> {
    this.store.setAllFoldersExpanded(true);
  }

  async collapseAllFolders(): Promise<void> {
    this.store.setAllFoldersExpanded(false);
  }

  private createFolderTreeItem(folder: FolderNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      folder.name,
      folder.expanded
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed
    );
    item.id = `${folder.id}_${folder.expanded ? 'expanded' : 'collapsed'}`;
    item.contextValue = 'folder';
    item.iconPath = new vscode.ThemeIcon(folder.expanded ? 'folder-opened' : 'folder');
    item.tooltip = '';
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
    item.id = bookmark.id;
    item.description = description;
    item.contextValue = 'bookmark';
    item.tooltip = this.createTooltip(bookmark);

    if (workspaceFolder) {
      item.resourceUri = vscode.Uri.joinPath(workspaceFolder.uri, bookmark.filePath);
    }

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
