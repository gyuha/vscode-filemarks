import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { FilemarkState } from './types';
import { errorHandler, FilemarkError } from './utils/errorHandler';

/**
 * Handles persistence of bookmark state to the file system.
 * Supports both workspace-local (.vscode/filemarks.json) and global storage locations.
 */
export class StorageService {
  private readonly STORAGE_FILE = 'filemarks.json';
  private workspacePath: string;
  private context: vscode.ExtensionContext;
  private saveTimeout: NodeJS.Timeout | undefined;
  private readonly DEBOUNCE_DELAY = 500;

  /**
   * Creates a new StorageService instance.
   * @param context - VS Code extension context for global storage access
   * @param workspaceFolder - Optional workspace folder override
   * @throws Error if no workspace folder is available
   */
  constructor(context: vscode.ExtensionContext, workspaceFolder?: vscode.WorkspaceFolder) {
    const folder = workspaceFolder || vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      throw new Error('No workspace folder found');
    }
    this.context = context;
    this.workspacePath = folder.uri.fsPath;
    this.migrateLegacyGlobalStorage();
  }

  private getStoragePath(): string {
    const config = vscode.workspace.getConfiguration('filemarks');
    const saveInProject = config.get<boolean>('saveBookmarksInProject', true);

    if (saveInProject) {
      return path.join(this.workspacePath, '.vscode', this.STORAGE_FILE);
    }

    return path.join(this.context.globalStorageUri.fsPath, this.getGlobalStorageFileName());
  }

  private getGlobalStorageFileName(): string {
    const folderName = path.basename(this.workspacePath);
    const safeFolderName = folderName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'workspace';
    const hash = crypto.createHash('md5').update(this.workspacePath).digest('hex').substring(0, 6);
    return `filemarks-${safeFolderName}-${hash}.json`;
  }

  private migrateLegacyGlobalStorage(): void {
    const config = vscode.workspace.getConfiguration('filemarks');
    const saveInProject = config.get<boolean>('saveBookmarksInProject', true);
    if (saveInProject) return;

    const legacyPath = path.join(this.context.globalStorageUri.fsPath, this.STORAGE_FILE);
    const targetPath = path.join(
      this.context.globalStorageUri.fsPath,
      this.getGlobalStorageFileName()
    );

    void (async () => {
      try {
        await fs.stat(legacyPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          errorHandler.handleSilent(FilemarkError.storageRead(error, legacyPath));
        }
        return;
      }

      try {
        await fs.stat(targetPath);
        // Target already exists; leave legacy file untouched to avoid overwrite
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          errorHandler.handleSilent(FilemarkError.storageRead(error, targetPath));
          return;
        }
      }

      try {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.rename(legacyPath, targetPath);
      } catch (error) {
        errorHandler.handleSilent(FilemarkError.storageWrite(error, targetPath));
      }
    })();
  }

  /**
   * Loads bookmark state from storage.
   * Creates backup and returns default state if JSON is corrupted.
   * @returns The loaded or default FilemarkState
   */
  async load(): Promise<FilemarkState> {
    try {
      const storagePath = this.getStoragePath();
      const content = await fs.readFile(storagePath, 'utf-8');
      const parsed = JSON.parse(content) as FilemarkState;

      if (!parsed.version || !Array.isArray(parsed.items)) {
        errorHandler.handle(FilemarkError.corruptedData(storagePath), {
          recovery: {
            label: vscode.l10n.t('Delete'),
            action: () => this.resetStorage(),
          },
        });
        return this.recoverOrDefault(parsed);
      }

      return parsed;
    } catch (error) {
      const storagePath = this.getStoragePath();

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.getDefaultState();
      }

      if (error instanceof SyntaxError) {
        errorHandler.handle(FilemarkError.jsonParse(error, storagePath), {
          recovery: {
            label: vscode.l10n.t('Delete'),
            action: async () => {
              await this.createBackup();
              await this.resetStorage();
            },
          },
        });
        await this.createBackup();
        return this.getDefaultState();
      }

      errorHandler.handle(FilemarkError.storageRead(error, storagePath));
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
      errorHandler.handleSilent(new Error('Backup creation failed'), { operation: 'createBackup' });
    }
  }

  private async resetStorage(): Promise<void> {
    try {
      const storagePath = this.getStoragePath();
      await fs.unlink(storagePath);
    } catch {
      errorHandler.handleSilent(new Error('Storage reset failed'), { operation: 'resetStorage' });
    }
  }

  /**
   * Persists bookmark state to storage with debouncing (500ms delay).
   * Multiple rapid calls are coalesced into a single write operation.
   * @param state - The FilemarkState to persist
   */
  save(state: FilemarkState): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        const storagePath = this.getStoragePath();
        const dirPath = path.dirname(storagePath);

        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(storagePath, JSON.stringify(state, null, 2), 'utf-8');
      } catch (error) {
        errorHandler.handle(FilemarkError.storageWrite(error, this.getStoragePath()));
      }
    }, this.DEBOUNCE_DELAY);
  }

  private getDefaultState(): FilemarkState {
    return {
      version: '1.0',
      items: [],
    };
  }
}
