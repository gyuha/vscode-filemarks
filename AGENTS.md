# Agent Development Guide for vscode-filemarks

This guide provides essential information for AI coding agents working on the vscode-filemarks VS Code extension.

## Project Overview

**vscode-filemarks** is a VS Code extension for advanced bookmark management with numbered shortcuts (0-9) and folder organization. Built with TypeScript targeting the VS Code Extension API.

- **Language**: TypeScript (ES2020 target)
- **Framework**: VS Code Extension API (^1.85.0)
- **Build Tool**: esbuild
- **Test Framework**: Mocha with @vscode/test-electron

## Build, Lint, and Test Commands

### Development

```bash
# Compile TypeScript
npm run compile

# Watch mode (compile on save)
npm run watch

# Build for production (minified with esbuild)
npm run package

# esbuild development build
npm run compile:esbuild

# esbuild watch mode
npm run watch:esbuild
```

### Linting and Formatting

```bash
# Run ESLint
npm run lint

# Auto-format with Prettier
npm run format
```

### Testing

```bash
# Run all tests (compiles, lints, then runs tests)
npm test

# Run tests without pre-steps (if already compiled)
node ./dist/test/runTest.js
```

**Running a single test file:**

```bash
# Compile first
npm run compile

# Run specific test suite
node ./dist/test/runTest.js --grep "Extension Integration"
```

**Note**: VS Code extension tests require launching a VS Code instance, so they run through the @vscode/test-electron runner.

### Packaging

```bash
# Create .vsix package
npm run vsce:package

# Publish to marketplace
npm run vsce:publish
```

## Project Structure

```
src/
├── extension.ts          # Extension entry point (activate/deactivate)
├── bookmarkStore.ts      # Core bookmark state management
├── storage.ts            # File system persistence layer
├── decorations.ts        # Gutter icon decorations
├── types.ts              # TypeScript type definitions
├── views/
│   └── treeProvider.ts   # Tree view and drag-drop controller
└── test/
    ├── runTest.ts        # Test runner configuration
    └── suite/            # Test suites
        ├── extension.test.ts
        ├── bookmarkStore.test.ts
        └── storage.test.ts
```

## Code Style Guidelines

### Import Organization

1. **Node.js built-ins** (prefixed with `node:`)
2. **External dependencies** (vscode, uuid, etc.)
3. **Internal modules** (relative imports)
4. **Type-only imports** (use `type` keyword)

```typescript
import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from './storage';
import { BookmarkStore } from './bookmarkStore';
import type { BookmarkNode, TreeNode } from './types';
```

### Formatting (Prettier)

```json
{
  "semi": true, // Always use semicolons
  "trailingComma": "es5", // Trailing commas where valid in ES5
  "singleQuote": true, // Use single quotes
  "printWidth": 100, // Max line width 100 characters
  "tabWidth": 2, // 2 spaces for indentation
  "useTabs": false, // Spaces, not tabs
  "bracketSpacing": true, // { foo: bar } not {foo: bar}
  "arrowParens": "avoid" // x => x not (x) => x
}
```

### TypeScript Configuration

- **Strict mode enabled** (`strict: true`)
- **Target**: ES2020
- **Module**: CommonJS
- **Source maps**: Enabled for debugging
- **Declaration files**: Generated (`.d.ts`)

### Naming Conventions

- **Files**: camelCase (e.g., `bookmarkStore.ts`, `treeProvider.ts`)
- **Classes**: PascalCase (e.g., `BookmarkStore`, `StorageService`)
- **Interfaces/Types**: PascalCase (e.g., `TreeNode`, `BookmarkNode`)
- **Functions/Methods**: camelCase (e.g., `handleGoToBookmark`, `initialize`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STORAGE_FILE`, `DEBOUNCE_DELAY`)
- **Private members**: Prefix with underscore (e.g., `_onDidChangeTreeData`)
- **Unused parameters**: Prefix with underscore (e.g., `_uri`)

### Type Definitions

**Always use explicit types for:**

- Public API interfaces
- Function parameters
- Complex return types

**Avoid:**

- `any` type (ESLint warns on this)
- Type assertions without good reason
- Implicit `any` returns

```typescript
// ✅ Good: Explicit types
export interface BookmarkNode {
  type: 'bookmark';
  id: string;
  label?: string;
  filePath: string;
  numbers: Record<number, number>;
  createdAt: string;
  updatedAt: string;
}

// ✅ Good: Type guards
export function isBookmarkNode(node: TreeNode): node is BookmarkNode {
  return node.type === 'bookmark';
}

// ❌ Bad: Using 'any'
const data: any = JSON.parse(content);

// ✅ Good: Proper typing
const data = JSON.parse(content) as FilemarkState;
```

### Error Handling

**Always handle errors appropriately:**

```typescript
// ✅ Good: Graceful error handling with user feedback
try {
  const content = await fs.readFile(storagePath, 'utf-8');
  return JSON.parse(content) as FilemarkState;
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

// ✅ Good: Silent error handling for non-critical operations
try {
  await fs.copyFile(storagePath, backupPath);
} catch {
  // Ignore backup errors
}
```

### Event Emitters Pattern

Use VS Code's EventEmitter pattern for reactive updates:

```typescript
private readonly _onDidChangeBookmarks = new vscode.EventEmitter<void>();
readonly onDidChangeBookmarks = this._onDidChangeBookmarks.event;

// Trigger events
this._onDidChangeBookmarks.fire();

// Subscribe to events
this.store.onDidChangeBookmarks(() => {
  this.refresh();
});
```

### Console Logging

- **Avoid** `console.log()` in production code (ESLint warns)
- **Use** VS Code OutputChannel for debugging:

```typescript
this.outputChannel = vscode.window.createOutputChannel('Filemarks');
this.outputChannel.appendLine('Debug message');
```

### Internationalization

Use `vscode.l10n.t()` for all user-facing strings:

```typescript
// ✅ Good
vscode.window.showWarningMessage(vscode.l10n.t('Filemarks requires an open workspace'));

// ❌ Bad
vscode.window.showWarningMessage('Filemarks requires an open workspace');
```

### Async/Await

- Use `async/await` consistently (no callback-style code)
- Always handle promise rejections
- Use `Promise<void>` for functions with no return value

```typescript
async function initialize(): Promise<void> {
  this.state = await this.storage.load();
  await this.removeNonExistentFileBookmarks();
  this.setupStickyBookmarks();
}
```

### Resource Cleanup

Register disposables with extension context:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('filemarks.goToBookmark', async bookmark => {
    await handleGoToBookmark(bookmark);
  })
);

context.subscriptions.push(decorationProvider);
context.subscriptions.push(treeView);
context.subscriptions.push(this.outputChannel);
```

## ESLint Rules

```json
{
  "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/explicit-module-boundary-types": "off",
  "no-console": "warn"
}
```

## VS Code API Patterns

### Command Registration

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand('filemarks.commandName', async (arg1, arg2) => {
    await handleCommand(arg1, arg2);
  })
);
```

### Configuration Access

```typescript
const config = vscode.workspace.getConfiguration('filemarks');
const value = config.get<boolean>('settingName', defaultValue);
```

### File System Operations

```typescript
// Check file exists
try {
  await vscode.workspace.fs.stat(uri);
} catch {
  // File doesn't exist
}

// Use vscode.Uri for paths
const absolutePath = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
const relativePath = vscode.workspace.asRelativePath(uri.fsPath);
```

## Common Gotchas

1. **Extension activation**: Extensions must handle missing workspace folders
2. **File paths**: Always use `vscode.Uri` and `vscode.workspace.asRelativePath()`
3. **Dispose resources**: Register all subscriptions with `context.subscriptions`
4. **Save debouncing**: Batch rapid saves (see `StorageService.save()`)
5. **Test environment**: Tests run in a separate VS Code instance

## Testing Guidelines

- Use Mocha's `suite()` and `test()` functions
- Set timeouts for async operations: `this.timeout(10000)`
- Test extension presence, activation, and command registration
- Use `assert` from `node:assert` module

```typescript
import * as assert from 'node:assert';

test('Extension should activate', async function () {
  this.timeout(10000);
  const ext = vscode.extensions.getExtension('gyuha.filemarks');
  await ext.activate();
  assert.strictEqual(ext.isActive, true);
});
```

## When Making Changes

1. ✅ **DO**: Run `npm run lint` before committing
2. ✅ **DO**: Format with `npm run format` or enable format-on-save
3. ✅ **DO**: Add type definitions for new interfaces
4. ✅ **DO**: Handle errors gracefully with user feedback
5. ✅ **DO**: Use internationalization for strings
6. ✅ **DO**: Register disposables with context
7. ❌ **DON'T**: Use `any` type without good reason
8. ❌ **DON'T**: Use `console.log()` in production code
9. ❌ **DON'T**: Hardcode strings shown to users
10. ❌ **DON'T**: Forget to clean up resources
