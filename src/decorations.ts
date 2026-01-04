import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { BookmarkStore } from './bookmarkStore';

export class GutterDecorationProvider {
  private decorationTypes: Map<number, vscode.TextEditorDecorationType> = new Map();
  private store: BookmarkStore;
  private context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, store: BookmarkStore) {
    this.context = context;
    this.store = store;
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i <= 9; i++) {
      const iconPath = this.createSvgIcon(i);
      const decorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: iconPath,
        gutterIconSize: 'contain',
      });
      this.decorationTypes.set(i, decorationType);
    }

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

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.updateDecorations(editor);
    }
  }

  private createSvgIcon(number: number): vscode.Uri {
    const config = vscode.workspace.getConfiguration('filemarks');
    const fillColor = config.get<string>('gutterIconFillColor', '#157EFB');
    const numberColor = config.get<string>('gutterIconNumberColor', '#FFFFFF');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <circle cx="8" cy="8" r="7" fill="${fillColor}" stroke="${fillColor}" stroke-width="1"/>
  <text x="8" y="12" font-family="Arial, sans-serif" font-size="11" font-weight="bold" 
        fill="${numberColor}" text-anchor="middle">${number}</text>
</svg>`;

    const iconsDir = path.join(this.context.extensionPath, '.icons');
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    const iconPath = path.join(iconsDir, `bookmark-${number}.svg`);
    fs.writeFileSync(iconPath, svgContent, 'utf-8');

    return vscode.Uri.file(iconPath);
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
