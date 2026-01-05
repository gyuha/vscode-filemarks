import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import type { TreeNode, BookmarkNode, FilemarkState } from './types';
import type { StorageService } from './storage';

export class BookmarkStore {
  private state: FilemarkState;
  private storage: StorageService;
  private readonly _onDidChangeBookmarks = new vscode.EventEmitter<void>();
  readonly onDidChangeBookmarks = this._onDidChangeBookmarks.event;
  private outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext, storage: StorageService) {
    this.storage = storage;
    this.state = { version: '1.0', items: [] };
    this.outputChannel = vscode.window.createOutputChannel('Filemarks');
    context.subscriptions.push(this.outputChannel);
  }

  async initialize(): Promise<void> {
    this.state = await this.storage.load();
    this.setupStickyBookmarks();
    this.setupFileWatchers();
  }

  private setupFileWatchers(): void {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidDelete(uri => {
      this.handleFileDelete(uri);
    });

    watcher.onDidCreate(async _uri => {
      const renames = await this.detectFileRename();
      if (renames) {
        this.handleFileRename(renames.oldUri, renames.newUri);
      }
    });
  }

  private async detectFileRename(): Promise<{ oldUri: vscode.Uri; newUri: vscode.Uri } | null> {
    return null;
  }

  private handleFileDelete(uri: vscode.Uri): void {
    const relativePath = vscode.workspace.asRelativePath(uri.fsPath);
    const bookmark = this.findBookmarkByFilePath(relativePath);

    if (bookmark) {
      this.removeBookmarkNode(bookmark.id);
      this.save();
      this.outputChannel.appendLine(
        `File deleted: ${relativePath}, removed bookmark ${bookmark.id}`
      );
      vscode.window.showInformationMessage(vscode.l10n.t('file.deleted', relativePath));
    }
  }

  private handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri): void {
    const oldPath = vscode.workspace.asRelativePath(oldUri.fsPath);
    const newPath = vscode.workspace.asRelativePath(newUri.fsPath);
    const bookmark = this.findBookmarkByFilePath(oldPath);

    if (bookmark) {
      bookmark.filePath = newPath;
      bookmark.updatedAt = new Date().toISOString();
      this.save();
      this.outputChannel.appendLine(`File renamed: ${oldPath} -> ${newPath}`);
      vscode.window.showInformationMessage(vscode.l10n.t('file.renamed'));
    }
  }

  private setupStickyBookmarks(): void {
    vscode.workspace.onDidChangeTextDocument(event => {
      this.handleTextDocumentChange(event);
    });
  }

  private handleTextDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    if (event.contentChanges.length === 0) return;

    const filePath = vscode.workspace.asRelativePath(event.document.uri.fsPath);
    const bookmark = this.findBookmarkByFilePath(filePath);
    if (!bookmark) return;

    let hasChanges = false;

    for (const change of event.contentChanges) {
      const startLine = change.range.start.line;
      const endLine = change.range.end.line;
      const lineDelta = change.text.split('\n').length - 1 - (endLine - startLine);

      if (lineDelta === 0) continue;

      for (const [num, line] of Object.entries(bookmark.numbers)) {
        const bookmarkLine = Number(line);

        if (bookmarkLine > startLine) {
          const newLine = bookmarkLine + lineDelta;
          if (newLine < 0) {
            delete bookmark.numbers[Number(num)];
          } else {
            bookmark.numbers[Number(num)] = newLine;
          }
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      bookmark.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  getState(): FilemarkState {
    return this.state;
  }

  findBookmarkByFilePath(filePath: string): BookmarkNode | undefined {
    const traverse = (nodes: TreeNode[]): BookmarkNode | undefined => {
      for (const node of nodes) {
        if (node.type === 'bookmark' && node.filePath === filePath) {
          return node;
        }
        if (node.type === 'folder') {
          const found = traverse(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return traverse(this.state.items);
  }

  findBookmarkByNumber(num: number): { bookmark: BookmarkNode; line: number } | undefined {
    const traverse = (nodes: TreeNode[]): { bookmark: BookmarkNode; line: number } | undefined => {
      for (const node of nodes) {
        if (node.type === 'bookmark') {
          const line = node.numbers[num];
          if (line !== undefined) {
            return { bookmark: node, line };
          }
        }
        if (node.type === 'folder') {
          const found = traverse(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return traverse(this.state.items);
  }

  toggleBookmark(filePath: string, num: number, line: number): void {
    let bookmark = this.findBookmarkByFilePath(filePath);

    if (!bookmark) {
      const now = new Date().toISOString();
      bookmark = {
        type: 'bookmark',
        id: uuidv4(),
        filePath,
        numbers: { [num]: line },
        createdAt: now,
        updatedAt: now,
      };
      this.state.items.push(bookmark);
    } else {
      const existingLine = bookmark.numbers[num];

      if (existingLine === line) {
        delete bookmark.numbers[num];

        if (Object.keys(bookmark.numbers).length === 0) {
          this.removeBookmarkNode(bookmark.id);
        }
      } else {
        const existingNumAtLine = Object.entries(bookmark.numbers).find(([, l]) => l === line);
        if (existingNumAtLine) {
          delete bookmark.numbers[Number(existingNumAtLine[0])];
        }

        bookmark.numbers[num] = line;
        bookmark.updatedAt = new Date().toISOString();
      }
    }

    this.save();
  }

  addBookmark(filePath: string, num: number, line: number): void {
    let bookmark = this.findBookmarkByFilePath(filePath);

    if (!bookmark) {
      const now = new Date().toISOString();
      bookmark = {
        type: 'bookmark',
        id: uuidv4(),
        filePath,
        numbers: { [num]: line },
        createdAt: now,
        updatedAt: now,
      };
      this.state.items.push(bookmark);
    } else {
      bookmark.numbers[num] = line;
      bookmark.updatedAt = new Date().toISOString();
    }

    this.save();
  }

  removeBookmarkNumber(filePath: string, num: number): void {
    const bookmark = this.findBookmarkByFilePath(filePath);
    if (!bookmark) return;

    delete bookmark.numbers[num];

    if (Object.keys(bookmark.numbers).length === 0) {
      this.removeBookmarkNode(bookmark.id);
    } else {
      bookmark.updatedAt = new Date().toISOString();
    }

    this.save();
  }

  private removeBookmarkNode(id: string): void {
    const removeFromTree = (nodes: TreeNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === id) {
          nodes.splice(i, 1);
          return true;
        }
        if (node.type === 'folder') {
          if (removeFromTree(node.children)) {
            return true;
          }
        }
      }
      return false;
    };

    removeFromTree(this.state.items);
  }

  deleteBookmark(id: string): void {
    this.removeBookmarkNode(id);
    this.save();
  }

  renameBookmark(id: string, label: string): void {
    const findNode = (nodes: TreeNode[]): BookmarkNode | undefined => {
      for (const node of nodes) {
        if (node.type === 'bookmark' && node.id === id) {
          return node;
        }
        if (node.type === 'folder') {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    const bookmark = findNode(this.state.items);
    if (bookmark) {
      bookmark.label = label || undefined;
      bookmark.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  createFolder(name: string, parentId?: string): void {
    const now = new Date().toISOString();
    const folder: TreeNode = {
      type: 'folder',
      id: uuidv4(),
      name,
      children: [],
      expanded: true,
      createdAt: now,
      updatedAt: now,
    };

    if (parentId) {
      const parent = this.findFolderById(parentId);
      if (parent) {
        parent.children.push(folder);
      }
    } else {
      this.state.items.push(folder);
    }

    this.save();
  }

  deleteFolder(id: string): void {
    this.removeNode(id);
    this.save();
  }

  renameFolder(id: string, name: string): void {
    const folder = this.findFolderById(id);
    if (folder) {
      folder.name = name;
      folder.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  moveNode(nodeId: string, targetFolderId: string | null): void {
    const node = this.removeAndGetNode(nodeId);
    if (!node) return;

    if (targetFolderId === null) {
      this.state.items.push(node);
    } else {
      const targetFolder = this.findFolderById(targetFolderId);
      if (targetFolder) {
        targetFolder.children.push(node);
      } else {
        this.state.items.push(node);
      }
    }

    this.save();
  }

  private findFolderById(id: string): (TreeNode & { type: 'folder' }) | undefined {
    const traverse = (nodes: TreeNode[]): (TreeNode & { type: 'folder' }) | undefined => {
      for (const node of nodes) {
        if (node.type === 'folder' && node.id === id) {
          return node;
        }
        if (node.type === 'folder') {
          const found = traverse(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return traverse(this.state.items);
  }

  private removeNode(id: string): void {
    const removeFromTree = (nodes: TreeNode[]): boolean => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === id) {
          nodes.splice(i, 1);
          return true;
        }
        if (node.type === 'folder') {
          if (removeFromTree(node.children)) {
            return true;
          }
        }
      }
      return false;
    };

    removeFromTree(this.state.items);
  }

  private removeAndGetNode(id: string): TreeNode | undefined {
    const removeFromTree = (nodes: TreeNode[]): TreeNode | undefined => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.id === id) {
          return nodes.splice(i, 1)[0];
        }
        if (node.type === 'folder') {
          const found = removeFromTree(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return removeFromTree(this.state.items);
  }

  private save(): void {
    this.storage.save(this.state);
    this._onDidChangeBookmarks.fire();
  }

  clearBookmarksInFile(filePath: string): void {
    const bookmark = this.findBookmarkByFilePath(filePath);
    if (bookmark) {
      this.removeBookmarkNode(bookmark.id);
      this.save();
    }
  }

  clearAllBookmarks(): void {
    this.state.items = [];
    this.save();
  }
}
