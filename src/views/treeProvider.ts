import * as vscode from 'vscode';
import * as path from 'node:path';
import type { BookmarkStore } from '../bookmarkStore';
import type { TreeNode, BookmarkNode, FolderNode } from '../types';
import { isFolderNode, isBookmarkNode } from '../types';
import { debounce, memoize, LRUCache } from '../utils/performance';

/**
 * Memoized fuzzy match function for better performance with repeated queries
 * Cache key: pattern + text combination
 */
const fuzzyMatch = memoize(
  (pattern: string, text: string): boolean => {
    const patternLower = pattern.toLowerCase();
    const textLower = text.toLowerCase();

    let patternIdx = 0;
    for (let i = 0; i < textLower.length && patternIdx < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIdx]) {
        patternIdx++;
      }
    }
    return patternIdx === patternLower.length;
  },
  (pattern: string, text: string) => `${pattern}:${text}`,
  500 // Cache up to 500 recent fuzzy match results
);

class TreeDragAndDropController implements vscode.TreeDragAndDropController<TreeNode> {
  private static readonly TREE_MIME_TYPE = 'application/vnd.code.tree.filemarks';
  private static readonly URI_LIST_MIME_TYPE = 'text/uri-list';

  dropMimeTypes = [
    TreeDragAndDropController.TREE_MIME_TYPE,
    TreeDragAndDropController.URI_LIST_MIME_TYPE,
  ];
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
    // Handle internal tree drag-and-drop
    const treeTransferItem = dataTransfer.get(TreeDragAndDropController.TREE_MIME_TYPE);
    if (treeTransferItem) {
      const source = treeTransferItem.value as TreeNode[];
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
      return;
    }

    // Handle external file drops
    const uriListTransferItem = dataTransfer.get(TreeDragAndDropController.URI_LIST_MIME_TYPE);
    if (!uriListTransferItem) return;

    const uriListString = await uriListTransferItem.asString();
    if (!uriListString) return;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return;

    // Parse URI list (format: URIs separated by \r\n)
    const uris = uriListString
      .split('\r\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (uris.length === 0) return;

    // Determine target folder
    let targetFolderId: string | null = null;
    if (target) {
      if (isFolderNode(target)) {
        targetFolderId = target.id;
      } else if (isBookmarkNode(target)) {
        const parentFolder = this.store.findParentFolder(target.id);
        targetFolderId = parentFolder?.id ?? null;
      }
    }

    // If targeting a folder, set it as the last used folder
    if (targetFolderId) {
      this.store.setLastUsedFolderId(targetFolderId);
    }

    const addedFiles: string[] = [];
    for (const uriString of uris) {
      try {
        const uri = vscode.Uri.parse(uriString);
        const filePath = vscode.workspace.asRelativePath(uri.fsPath);

        // Skip folders, only process files
        try {
          const stat = await vscode.workspace.fs.stat(uri);
          if (stat.type === vscode.FileType.Directory) {
            continue;
          }
        } catch {
          // If we can't stat, skip this URI
          continue;
        }

        // Create bookmark at number 0, line 0
        this.store.toggleBookmark(filePath, 0, 0);
        addedFiles.push(path.basename(filePath));
      } catch (error) {
        // Log parsing error but continue with other files
        vscode.window.showWarningMessage(vscode.l10n.t('error.failedToParseUri', uriString));
      }
    }

    if (addedFiles.length > 0) {
      const message =
        addedFiles.length === 1
          ? vscode.l10n.t('bookmark.addedSingle', addedFiles[0])
          : vscode.l10n.t('bookmark.addedMultiple', addedFiles.length.toString());
      vscode.window.showInformationMessage(message);
    }
  }
}

/**
 * Provides tree data for the Filemarks sidebar view.
 * Supports filtering, drag-and-drop, and folder expansion state management.
 */
export class FilemarkTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  readonly dragAndDropController: vscode.TreeDragAndDropController<TreeNode>;
  private treeView: vscode.TreeView<TreeNode> | undefined;
  private filterText = '';
  private focusedFolderId: string | null = null;
  private filterCache = new LRUCache<string, TreeNode[]>(50);
  private debouncedRefresh: () => void;

  constructor(private store: BookmarkStore) {
    this.dragAndDropController = new TreeDragAndDropController(store);

    // Debounce refresh to prevent excessive redraws
    this.debouncedRefresh = debounce(() => {
      this._onDidChangeTreeData.fire(undefined);
    }, 150);

    this.store.onDidChangeBookmarks(() => {
      // Clear cache when bookmarks change
      this.filterCache.clear();
      fuzzyMatch.clearCache();
      this.debouncedRefresh();
    });
  }

  /** Links this provider to its TreeView for expand/collapse and selection tracking. */
  setTreeView(treeView: vscode.TreeView<TreeNode>): void {
    this.treeView = treeView;

    treeView.onDidExpandElement(e => {
      if (isFolderNode(e.element)) {
        this.store.setFolderExpanded(e.element.id, true);
        this._onDidChangeTreeData.fire(e.element);
      }
    });

    treeView.onDidCollapseElement(e => {
      if (isFolderNode(e.element)) {
        this.store.setFolderExpanded(e.element.id, false);
        this._onDidChangeTreeData.fire(e.element);
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
    }

    if (this.focusedFolderId !== newFolderId) {
      const oldFocusedFolderId = this.focusedFolderId;
      this.focusedFolderId = newFolderId;

      if (oldFocusedFolderId) {
        const oldFolder = this.findFolderById(oldFocusedFolderId);
        if (oldFolder) {
          this._onDidChangeTreeData.fire(oldFolder);
        }
      }
      if (newFolderId) {
        const newFolder = this.findFolderById(newFolderId);
        if (newFolder) {
          this._onDidChangeTreeData.fire(newFolder);
        }
      }
    }
  }

  private findFolderById(id: string): FolderNode | undefined {
    const traverse = (nodes: TreeNode[]): FolderNode | undefined => {
      for (const node of nodes) {
        if (isFolderNode(node)) {
          if (node.id === id) {
            return node;
          }
          const found = traverse(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return traverse(this.store.getState().items);
  }

  /** Records the folder containing the given node (or selection) as "last used" for new bookmarks. */
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
    this.debouncedRefresh();
  }

  getSelection(): readonly TreeNode[] | undefined {
    return this.treeView?.selection;
  }

  /**
   * Sets the filter text for fuzzy search. Clears cache and updates tree title.
   * @param text - Filter pattern (empty string clears filter)
   */
  setFilter(text: string): void {
    this.filterText = text;
    this.filterCache.clear(); // Clear cache when filter changes
    fuzzyMatch.clearCache();
    this.updateFilterContext();
    this.updateTreeViewTitle();
    this.debouncedRefresh();
  }

  getFilter(): string {
    return this.filterText;
  }

  clearFilter(): void {
    this.filterText = '';
    this.filterCache.clear();
    fuzzyMatch.clearCache();
    this.updateFilterContext();
    this.updateTreeViewTitle();
    this.debouncedRefresh();
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

  /**
   * Filter nodes based on current filter text with caching for performance
   */
  private filterNodes(nodes: TreeNode[]): TreeNode[] {
    if (!this.filterText) return nodes;

    // Generate cache key based on filter text and node IDs
    const cacheKey = `${this.filterText}:${nodes.map(n => n.id).join(',')}`;

    // Check cache first
    const cached = this.filterCache.get(cacheKey);
    if (cached) {
      return cached;
    }

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

    // Cache the result
    this.filterCache.set(cacheKey, result);
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

  /** Expands all folders in the tree view, persisting state to storage. */
  async expandAllFolders(): Promise<void> {
    if (!this.treeView) return;

    const folders = this.collectAllFolders(this.store.getState().items);
    this.store.setAllFoldersExpanded(true);

    for (const folder of folders) {
      try {
        await this.treeView.reveal(folder, { expand: 3, select: false, focus: false });
      } catch (error) {
        // Silently ignore reveal errors (folder might not be visible due to filtering)
      }
    }
  }

  /** Collapses all folders in the tree view, persisting state to storage. */
  async collapseAllFolders(): Promise<void> {
    this.store.setAllFoldersExpanded(false);
    await vscode.commands.executeCommand(
      'workbench.actions.treeView.filemarks.treeView.collapseAll'
    );
    this.refresh();
  }

  private collectAllFolders(nodes: TreeNode[]): FolderNode[] {
    const folders: FolderNode[] = [];
    for (const node of nodes) {
      if (isFolderNode(node)) {
        folders.push(node);
        folders.push(...this.collectAllFolders(node.children));
      }
    }
    return folders;
  }

  private createFolderTreeItem(folder: FolderNode): vscode.TreeItem {
    const collapsibleState = folder.expanded
      ? vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.Collapsed;

    const isFocused = this.focusedFolderId === folder.id;
    const folderIcon = folder.expanded ? 'folder-opened' : 'folder';

    const item = new vscode.TreeItem(folder.name, collapsibleState);
    item.id = folder.id;
    item.contextValue = 'folder';
    item.iconPath = isFocused
      ? new vscode.ThemeIcon(folderIcon, new vscode.ThemeColor('list.highlightForeground'))
      : new vscode.ThemeIcon(folderIcon);
    item.tooltip = '';

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
