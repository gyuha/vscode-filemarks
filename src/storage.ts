import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { FilemarkState } from './types';

export class StorageService {
  private readonly STORAGE_FILE = 'filemarks.json';
  private workspacePath: string;
  private saveTimeout: NodeJS.Timeout | undefined;
  private readonly DEBOUNCE_DELAY = 500;

  constructor(_context: vscode.ExtensionContext) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }
    this.workspacePath = workspaceFolder.uri.fsPath;
  }

  private getStoragePath(): string {
    return path.join(this.workspacePath, '.vscode', this.STORAGE_FILE);
  }

  async load(): Promise<FilemarkState> {
    try {
      const storagePath = this.getStoragePath();
      const content = await fs.readFile(storagePath, 'utf-8');
      return JSON.parse(content) as FilemarkState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.getDefaultState();
      }
      vscode.window.showErrorMessage(`Failed to load bookmarks: ${error}`);
      return this.getDefaultState();
    }
  }

  async save(state: FilemarkState): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    return new Promise((resolve, reject) => {
      this.saveTimeout = setTimeout(async () => {
        try {
          const storagePath = this.getStoragePath();
          const dirPath = path.dirname(storagePath);

          await fs.mkdir(dirPath, { recursive: true });
          await fs.writeFile(storagePath, JSON.stringify(state, null, 2), 'utf-8');
          resolve();
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to save bookmarks: ${error}`);
          reject(error);
        }
      }, this.DEBOUNCE_DELAY);
    });
  }

  private getDefaultState(): FilemarkState {
    return {
      version: '1.0',
      items: [],
    };
  }
}
