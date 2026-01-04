import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import type { TreeNode, BookmarkNode, FilemarkState } from './types';
import type { StorageService } from './storage';

export class BookmarkStore {
  private state: FilemarkState;
  private storage: StorageService;
  private readonly _onDidChangeBookmarks = new vscode.EventEmitter<void>();
  readonly onDidChangeBookmarks = this._onDidChangeBookmarks.event;

  constructor(context: vscode.ExtensionContext, storage: StorageService) {
    this.storage = storage;
    this.state = { version: '1.0', items: [] };
  }

  async initialize(): Promise<void> {
    this.state = await this.storage.load();
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

  async toggleBookmark(filePath: string, num: number, line: number): Promise<void> {
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
        bookmark.numbers[num] = line;
        bookmark.updatedAt = new Date().toISOString();
      }
    }

    await this.save();
  }

  async addBookmark(filePath: string, num: number, line: number): Promise<void> {
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

    await this.save();
  }

  async removeBookmarkNumber(filePath: string, num: number): Promise<void> {
    const bookmark = this.findBookmarkByFilePath(filePath);
    if (!bookmark) return;

    delete bookmark.numbers[num];

    if (Object.keys(bookmark.numbers).length === 0) {
      this.removeBookmarkNode(bookmark.id);
    } else {
      bookmark.updatedAt = new Date().toISOString();
    }

    await this.save();
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

  private async save(): Promise<void> {
    await this.storage.save(this.state);
    this._onDidChangeBookmarks.fire();
  }
}
