# Filemarks

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Numbered bookmarks with folder organization for VS Code**

Filemarks is a powerful bookmark extension that lets you quickly navigate your code using numbered shortcuts (0-9) with visual gutter icons and organize bookmarks into folders.

![Filemarks Demo](images/demo.gif)

## Features

### 🔢 Numbered Bookmarks (0-9)

Quickly set and jump to up to 10 bookmarks per file using keyboard shortcuts.

| Action           | Windows/Linux      | macOS             |
| ---------------- | ------------------ | ----------------- |
| Toggle Bookmark  | `Ctrl+Shift+[0-9]` | `Cmd+Shift+[0-9]` |
| Jump to Bookmark | `Ctrl+[0-9]`       | `Cmd+[0-9]`       |

![Gutter Icons](images/gutter-icons.png)

### 🔖 Visual Gutter Icons

- Bookmark-shaped icons with numbers displayed in the editor gutter
- Customizable colors (default: red background, white number)
- Instantly see which lines are bookmarked

### 📁 Folder Organization

- Create folders to organize your bookmarks
- Drag and drop bookmarks between folders
- Hierarchical structure for complex projects

![Folder Organization](images/folders.png)

### 🔄 Smart Features

| Feature                   | Description                                  |
| ------------------------- | -------------------------------------------- |
| **Sticky Bookmarks**      | Line numbers auto-adjust when you edit code  |
| **Auto-cleanup**          | Bookmarks removed when files are deleted     |
| **Invalid Line Removal**  | Bookmarks removed when lines no longer exist |
| **Per-workspace Storage** | Each project has its own bookmarks           |

### 🌍 Internationalization

- English
- Korean (한국어)

## Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install gyuha.filemarks`
4. Press Enter

## Quick Start

1. **Set a bookmark**: Place cursor on a line, press `Ctrl+Shift+1`
2. **Jump to bookmark**: Press `Ctrl+1` to jump back
3. **Organize**: Right-click bookmark in sidebar → "Move to Folder"

## Commands

| Command                                      | Description                     |
| -------------------------------------------- | ------------------------------- |
| `Filemarks: Toggle Bookmark [0-9]`           | Set/unset numbered bookmark     |
| `Filemarks: Jump to Bookmark [0-9]`          | Navigate to bookmark            |
| `Filemarks: List Bookmarks in Current File`  | Show all bookmarks in file      |
| `Filemarks: List All Bookmarks`              | Show all bookmarks in workspace |
| `Filemarks: Create Folder`                   | Create organization folder      |
| `Filemarks: Clear Bookmarks in Current File` | Remove all bookmarks from file  |
| `Filemarks: Clear All Bookmarks`             | Remove all bookmarks            |

## Configuration

| Setting                                   | Default     | Description                                        |
| ----------------------------------------- | ----------- | -------------------------------------------------- |
| `filemarks.saveBookmarksInProject`        | `true`      | Save in `.vscode/filemarks.json`                   |
| `filemarks.showBookmarkNotDefinedWarning` | `true`      | Show warning for undefined bookmarks               |
| `filemarks.revealLocation`                | `"center"`  | Cursor position after jump (`"center"` or `"top"`) |
| `filemarks.gutterIconFillColor`           | `"#E74C3C"` | Bookmark icon background color                     |
| `filemarks.gutterIconNumberColor`         | `"#FFFFFF"` | Bookmark icon number color                         |

### Custom Colors Example

```json
{
  "filemarks.gutterIconFillColor": "#3498DB",
  "filemarks.gutterIconNumberColor": "#FFFFFF"
}
```

## Storage

Bookmarks are stored in `.vscode/filemarks.json` by default:

- ✅ Share with team via version control
- ✅ Project-specific bookmarks
- ✅ Automatic backup with project

Set `filemarks.saveBookmarksInProject` to `false` for global storage.

## Sidebar View

Access the Filemarks view from the Activity Bar:

- 📁 Hierarchical folder structure
- 🖱️ Click to jump to bookmark
- 🔀 Drag & drop to organize
- 📋 Right-click for context menu

## Keyboard Shortcuts Summary

### Windows / Linux

| Shortcut                        | Action               |
| ------------------------------- | -------------------- |
| `Ctrl+Shift+0` ~ `Ctrl+Shift+9` | Toggle bookmark 0-9  |
| `Ctrl+0` ~ `Ctrl+9`             | Jump to bookmark 0-9 |

### macOS

| Shortcut                      | Action               |
| ----------------------------- | -------------------- |
| `Cmd+Shift+0` ~ `Cmd+Shift+9` | Toggle bookmark 0-9  |
| `Cmd+0` ~ `Cmd+9`             | Jump to bookmark 0-9 |

## Requirements

- VS Code 1.85.0 or higher

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Issues & Feedback

Found a bug or have a suggestion? [Open an issue](https://github.com/gyuha/vscode-filemarks/issues)

## License

[MIT](LICENSE)

---

**Made with ❤️ by [Gyuha](https://github.com/gyuha)**
