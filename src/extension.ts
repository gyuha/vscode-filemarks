import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  for (let i = 0; i <= 9; i++) {
    const toggleDisposable = vscode.commands.registerCommand(
      `filemarks.toggleBookmark${i}`,
      () => {
        vscode.window.showInformationMessage(`Filemarks: Toggle Bookmark ${i} - Not yet implemented`);
      }
    );
    context.subscriptions.push(toggleDisposable);
  }

  for (let i = 0; i <= 9; i++) {
    const jumpDisposable = vscode.commands.registerCommand(
      `filemarks.jumpToBookmark${i}`,
      () => {
        vscode.window.showInformationMessage(`Filemarks: Jump to Bookmark ${i} - Not yet implemented`);
      }
    );
    context.subscriptions.push(jumpDisposable);
  }

  vscode.window.showInformationMessage('Filemarks extension activated!');
}

export function deactivate() {}
