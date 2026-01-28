# Agent Development Guide for vscode-filemarks

VS Code extension for bookmark management with numbered shortcuts (0-9) and folder organization.

- **Stack**: TypeScript (ES2020), VS Code Extension API (^1.85.0), esbuild, Mocha
- **Node**: 20.x required

## Commands

```bash
# Development
npm run compile          # TypeScript compile
npm run watch            # Watch mode
npm run package          # Production build (esbuild, minified)

# Quality
npm run lint             # ESLint
npm run format           # Prettier
npx tsc --noEmit         # Type check only

# Testing
npm test                 # Full test (compile + lint + test)
node ./dist/test/runTest.js                    # Run tests (pre-compiled)
node ./dist/test/runTest.js --grep "pattern"   # Single test by name

# Package
npm run vsce:package     # Create .vsix
npm run vsce:publish     # Publish to marketplace
```

**Note**: Tests require VS Code instance via @vscode/test-electron. On CI, use `xvfb-run -a npm test`.

## Project Structure

```
src/
├── extension.ts           # Entry point (activate/deactivate)
├── bookmarkStore.ts       # Core state management
├── storage.ts             # Persistence layer
├── decorations.ts         # Gutter icons
├── types.ts               # Type definitions
├── views/
│   └── treeProvider.ts    # Tree view + drag-drop
├── utils/
│   ├── errorHandler.ts    # Error handling utilities
│   └── performance.ts     # Performance utilities
└── test/
    ├── runTest.ts         # Test runner config
    └── suite/             # Test files (*.test.ts)
```

## Code Style

### Imports (order matters)

```typescript
import * as vscode from 'vscode'; // 1. VS Code
import * as path from 'node:path'; // 2. Node built-ins (node: prefix)
import { v4 as uuidv4 } from 'uuid'; // 3. External packages
import { BookmarkStore } from './store'; // 4. Internal modules
import type { TreeNode } from './types'; // 5. Type-only imports
```

### Formatting (Prettier)

- Semicolons: always
- Quotes: single
- Print width: 100
- Trailing commas: ES5
- Arrow parens: avoid (`x => x`)
- Tab width: 2 spaces

### Naming

| Element           | Convention        | Example              |
| ----------------- | ----------------- | -------------------- |
| Files             | camelCase         | `bookmarkStore.ts`   |
| Classes           | PascalCase        | `BookmarkStore`      |
| Interfaces/Types  | PascalCase        | `TreeNode`           |
| Functions/Methods | camelCase         | `handleGoToBookmark` |
| Constants         | UPPER_SNAKE       | `DEBOUNCE_DELAY`     |
| Private members   | underscore prefix | `_onDidChange`       |
| Unused params     | underscore prefix | `_uri`               |

### TypeScript

- Strict mode enabled
- Use explicit types for public APIs, parameters, complex returns
- Use type guards: `function isFolderNode(node: TreeNode): node is FolderNode`
- **Avoid**: `any`, type assertions without reason, implicit any

### Error Handling

```typescript
try {
  const data = await fs.readFile(path, 'utf-8');
  return JSON.parse(data) as FilemarkState;
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    return this.getDefaultState(); // Expected: file doesn't exist
  }
  vscode.window.showErrorMessage(vscode.l10n.t('error.failedToLoad'));
  return this.getDefaultState();
}
```

### VS Code Patterns

```typescript
// Commands - register with context.subscriptions
context.subscriptions.push(
  vscode.commands.registerCommand('filemarks.cmd', async () => { /* ... */ })
);

// Events - use EventEmitter pattern
private readonly _onDidChange = new vscode.EventEmitter<void>();
readonly onDidChange = this._onDidChange.event;

// Config access
const config = vscode.workspace.getConfiguration('filemarks');
const value = config.get<boolean>('setting', defaultValue);

// i18n - all user strings
vscode.window.showWarningMessage(vscode.l10n.t('message.key'));
```

### Logging

- **No** `console.log` in production (ESLint warns)
- Use OutputChannel: `vscode.window.createOutputChannel('Filemarks')`

## Testing

```typescript
import * as assert from 'node:assert';

suite('Feature', () => {
  test('should work', async function () {
    this.timeout(10000); // Required for async operations
    const ext = vscode.extensions.getExtension('gyuha.filemarks');
    await ext?.activate();
    assert.strictEqual(ext?.isActive, true);
  });
});
```

- Use Mocha's `suite()` and `test()` (TDD style)
- Always set timeouts for async tests
- Use `node:assert` module

## ESLint Rules

```json
{
  "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
  "@typescript-eslint/no-explicit-any": "warn",
  "no-console": "warn"
}
```

## Gotchas

1. **Activation**: Handle missing workspace folders gracefully
2. **Paths**: Use `vscode.Uri` and `vscode.workspace.asRelativePath()`
3. **Disposables**: Register ALL with `context.subscriptions`
4. **Save debouncing**: Batch rapid saves (see `StorageService`)
5. **Test env**: Tests run in separate VS Code instance

## Checklist

Before committing:

- [ ] `npm run lint` passes
- [ ] `npm run format` applied
- [ ] Types defined for new interfaces
- [ ] Errors handled with user feedback
- [ ] Strings use `vscode.l10n.t()`
- [ ] Disposables registered
- [ ] No `any`, `console.log`, or hardcoded strings
