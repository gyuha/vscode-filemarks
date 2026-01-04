import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { FilemarkState } from './types';

export class StorageService {
  private readonly STORAGE_FILE = 'filemarks.json';
  private workspacePath: string;
  private context: vscode.ExtensionContext;
  private saveTimeout: NodeJS.Timeout | undefined;
  private readonly DEBOUNCE_DELAY = 500;

  constructor(context: vscode.ExtensionContext, workspaceFolder?: vscode.WorkspaceFolder) {
    const folder = workspaceFolder || vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      throw new Error('No workspace folder found');
    }
    this.context = context;
    this.workspacePath = folder.uri.fsPath;
  }

  private getStoragePath(): string {
    const config = vscode.workspace.getConfiguration('filemarks');
    const saveInProject = config.get<boolean>('saveBookmarksInProject', true);

    if (saveInProject) {
      return path.join(this.workspacePath, '.vscode', this.STORAGE_FILE);
    }
    return path.join(this.context.globalStorageUri.fsPath, this.STORAGE_FILE);
  }

  async load(): Promise<FilemarkState> {
    try {
      const storagePath = this.getStoragePath();
      const content = await fs.readFile(storagePath, 'utf-8');
      const parsed = JSON.parse(content) as FilemarkState;

      if (!parsed.version || !Array.isArray(parsed.items)) {
        vscode.window.showWarningMessage(vscode.l10n.t('error.corruptedFile'));
        return this.recoverOrDefault(parsed);
      }

      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.getDefaultState();
      }

      if (error instanceof SyntaxError) {
        vscode.window.showErrorMessage(vscode.l10n.t('error.corruptedJson'));
        await this.createBackup();
        return this.getDefaultState();
      }

      vscode.window.showErrorMessage(vscode.l10n.t('error.failedToLoad', String(error)));
      return this.getDefaultState();
    }
  }

  private recoverOrDefault(data: unknown): FilemarkState {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return {
        version: typeof obj.version === 'string' ? obj.version : '1.0',
        items: Array.isArray(obj.items) ? obj.items : [],
      };
    }
    return this.getDefaultState();
  }

  private async createBackup(): Promise<void> {
    try {
      const storagePath = this.getStoragePath();
      const backupPath = storagePath.replace('.json', `.backup.${Date.now()}.json`);
      await fs.copyFile(storagePath, backupPath);
    } catch {
      // Ignore backup errors
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
          vscode.window.showErrorMessage(vscode.l10n.t('error.failedToSave', String(error)));
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
