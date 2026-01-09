import * as vscode from 'vscode';
import * as path from 'node:path';
import type { BookmarkStore } from '../bookmarkStore';
import type { TreeNode, BookmarkNode, FolderNode } from '../types';
import { isFolderNode, isBookmarkNode } from '../types';

function fuzzyMatch(pattern: string, text: string): boolean {
  const patternLower = pattern.toLowerCase();
  const textLower = text.toLowerCase();

  let patternIdx = 0;
  for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIdx]) {
      patternIdx++;
    }
  }
  return patternIdx === patternLower.length;
}

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

    let targetFolderId: string | null = null;
    if (target) {
      if (isFolderNode(target)) {
        targetFolderId = target.id;
      } else {
        const parentFolder = this.store.findParentFolder(target.id);
        targetFolderId = parentFolder?.id ?? null;
      }
    }

    if (sourceNode.id === targetFolderId) return;

    await this.store.moveNode(sourceNode.id, targetFolderId);
  }
}

export class FilemarkTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  readonly dragAndDropController: vscode.TreeDragAndDropController<TreeNode>;
  private treeView: vscode.TreeView<TreeNode> | undefined;
  private filterText = '';

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

    treeView.onDidChangeSelection(e => {
      if (e.selection.length > 0) {
        this.updateLastUsedFolderFromNode(e.selection[0]);
      }
    });
  }

  private updateLastUsedFolderFromNode(node: TreeNode): void {
    const previousFolderId = this.store.getLastUsedFolderId();
    let newFolderId: string | null;

    if (isFolderNode(node)) {
      newFolderId = node.id;
    } else {
      const parentFolder = this.store.findParentFolder(node.id);
      newFolderId = parentFolder?.id ?? null;
    }

    if (previousFolderId !== newFolderId) {
      this.store.setLastUsedFolderId(newFolderId);
      this.refresh();
    }
  }

  recordCurrentFolder(node?: TreeNode): void {
    if (node) {
      this.updateLastUsedFolderFromNode(node);
    } else {
      const selection = this.treeView?.selection;
      if (selection && selection.length > 0) {
        this.updateLastUsedFolderFromNode(selection[0]);
      }
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  setFilter(text: string): void {
    this.filterText = text;
    this.updateFilterContext();
    this.updateTreeViewTitle();
    this.refresh();
  }

  getFilter(): string {
    return this.filterText;
  }

  clearFilter(): void {
    this.filterText = '';
    this.updateFilterContext();
    this.updateTreeViewTitle();
    this.refresh();
  }

  private updateFilterContext(): void {
    vscode.commands.executeCommand('setContext', 'filemarks.hasFilter', !!this.filterText);
  }

  private updateTreeViewTitle(): void {
    if (!this.treeView) return;
    if (this.filterText) {
      this.treeView.title = `${vscode.l10n.t('filtered')}: "${this.filterText}"`;
    } else {
      this.treeView.title = undefined;
    }
  }

  private filterNodes(nodes: TreeNode[]): TreeNode[] {
    if (!this.filterText) return nodes;

    const result: TreeNode[] = [];
    for (const node of nodes) {
      if (isFolderNode(node)) {
        const filteredChildren = this.filterNodes(node.children);
        const folderMatches = fuzzyMatch(this.filterText, node.name);
        if (filteredChildren.length > 0 || folderMatches) {
          result.push({
            ...node,
            children: filteredChildren.length > 0 ? filteredChildren : node.children,
            expanded: true,
          });
        }
      } else if (isBookmarkNode(node)) {
        const fileName = path.basename(node.filePath);
        const searchText = node.label || fileName;
        if (fuzzyMatch(this.filterText, searchText) || fuzzyMatch(this.filterText, node.filePath)) {
          result.push(node);
        }
      }
    }
    return result;
  }

  private sortFoldersFirst(nodes: TreeNode[]): TreeNode[] {
    return [...nodes].sort((a, b) => {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return 0;
    });
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    if (isFolderNode(element)) {
      return this.createFolderTreeItem(element);
    }
    return this.createBookmarkTreeItem(element);
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      const items = this.store.getState().items;
      return this.sortFoldersFirst(this.filterNodes(items));
    }

    if (isFolderNode(element)) {
      const children = this.filterText ? this.filterNodes(element.children) : element.children;
      return this.sortFoldersFirst(children);
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
    const lastUsedFolderId = this.store.getLastUsedFolderId();
    const isSelected = folder.id === lastUsedFolderId;

    const item = new vscode.TreeItem(folder.name, vscode.TreeItemCollapsibleState.Collapsed);
    item.id = folder.id;
    item.contextValue = 'folder';
    item.iconPath = new vscode.ThemeIcon('folder');
    item.tooltip = '';

    if (isSelected) {
      item.description = '✓';
    }

    return item;
  }

  private createBookmarkTreeItem(bookmark: BookmarkNode): vscode.TreeItem {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const fileName = path.basename(bookmark.filePath);
    const numbers = Object.keys(bookmark.numbers).sort((a, b) => Number(a) - Number(b));
    const numbersStr = numbers.join(',');

    const label = bookmark.label || fileName;
    const description = `[${numbersStr}]`;

    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
    item.id = bookmark.id;
    item.description = description;
    item.contextValue = 'bookmark';
    item.tooltip = this.createTooltip(bookmark);
    item.iconPath = vscode.ThemeIcon.File;

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
