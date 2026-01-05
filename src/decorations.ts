import * as vscode from 'vscode';
import type { BookmarkStore } from './bookmarkStore';

export class GutterDecorationProvider {
  private decorationTypes: Map<number, vscode.TextEditorDecorationType> = new Map();
  private store: BookmarkStore;
  private disposables: vscode.Disposable[] = [];

  constructor(_context: vscode.ExtensionContext, store: BookmarkStore) {
    this.store = store;
    this.initialize();
  }

  private initialize(): void {
    this.createDecorationTypes();

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
          this.updateDecorations(editor);
        }
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
          this.updateDecorations(editor);
        }
      })
    );

    this.disposables.push(
      this.store.onDidChangeBookmarks(() => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          this.updateDecorations(editor);
        }
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(event => {
        if (
          event.affectsConfiguration('filemarks.gutterIconFillColor') ||
          event.affectsConfiguration('filemarks.gutterIconNumberColor')
        ) {
          this.recreateDecorationTypes();
        }
      })
    );

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  private createDecorationTypes(): void {
    for (let i = 0; i <= 9; i++) {
      const iconUri = this.createSvgIconUri(i);
      const decorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: iconUri,
        gutterIconSize: 'contain',
      });
      this.decorationTypes.set(i, decorationType);
    }
  }

  private recreateDecorationTypes(): void {
    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    this.decorationTypes.clear();
    this.createDecorationTypes();

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  private createSvgIconUri(num: number): vscode.Uri {
    const config = vscode.workspace.getConfiguration('filemarks');
    const fillColor = config.get<string>('gutterIconFillColor', '#E74C3C');
    const numberColor = config.get<string>('gutterIconNumberColor', '#FFFFFF');

    const svg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="8" height="8" rx="1.5" ry="1.5" fill="${fillColor}"/><text x="8" y="10.5" font-family="Arial,sans-serif" font-size="7" font-weight="bold" fill="${numberColor}" text-anchor="middle">${num}</text></svg>`;

    return vscode.Uri.parse(`data:image/svg+xml,${encodeURIComponent(svg)}`);
  }

  private updateDecorations(editor: vscode.TextEditor): void {
    if (!editor) return;

    const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);
    const bookmark = this.store.findBookmarkByFilePath(filePath);

    for (const decorationType of this.decorationTypes.values()) {
      editor.setDecorations(decorationType, []);
    }

    if (!bookmark) return;

    for (const [num, line] of Object.entries(bookmark.numbers)) {
      const number = Number(num);
      const decorationType = this.decorationTypes.get(number);

      if (decorationType && line < editor.document.lineCount) {
        const range = new vscode.Range(line, 0, line, 0);
        editor.setDecorations(decorationType, [range]);
      }
    }
  }

  dispose(): void {
    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    this.decorationTypes.clear();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
  }
}
