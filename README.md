# Filemarks

Advanced bookmark management extension for Visual Studio Code with numbered shortcuts and folder organization.

## Features

### 🔢 Numbered Bookmarks (0-9)

- Quick access to 10 bookmarks per file using keyboard shortcuts
- Toggle bookmarks: `Ctrl+Shift+0-9` (Windows/Linux) or `Cmd+Shift+0-9` (Mac)
- Jump to bookmarks: `Ctrl+0-9` (Windows/Linux) or `Cmd+0-9` (Mac)
- Visual gutter icons with numbers for easy identification

### 📁 Folder Organization

- Organize bookmarks into folders for better structure
- Create nested folders for complex projects
- Drag and drop bookmarks between folders
- Move bookmarks to folders via context menu

### 🔖 Bookmark Management

- Custom labels for bookmarks
- Rename bookmarks with descriptive names
- Delete individual bookmarks or entire folders
- Clear all bookmarks in current file or workspace

### 📋 Navigation

- List all bookmarks in current file
- List all bookmarks across workspace
- Quick pick interface for fast navigation
- Jump to any bookmark with a single click

### 🔄 Smart Features

- **Sticky Bookmarks**: Automatically adjust line numbers when editing
- **File Tracking**: Auto-remove bookmarks when files are deleted
- **File Rename Support**: Update bookmark paths when files are renamed
- **Corrupted Data Recovery**: Automatic backup and recovery of bookmark data

### 🌍 Internationalization

- Full support for English and Korean
- Automatic language detection from VS Code settings

## Installation

1. Open VS Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (Mac)
3. Type `ext install gyuha.filemarks`
4. Press Enter

## Usage

### Basic Bookmark Operations

**Toggle Bookmark:**

1. Place cursor on desired line
2. Press `Ctrl+Shift+[0-9]` to toggle bookmark number

**Jump to Bookmark:**

1. Press `Ctrl+[0-9]` to jump to corresponding bookmark
2. Works across all files in workspace

**Rename Bookmark:**

1. Right-click bookmark in TreeView
2. Select "Rename Bookmark"
3. Enter new label

### Folder Operations

**Create Folder:**

1. Click the folder icon in TreeView toolbar
2. Enter folder name

**Move Bookmark to Folder:**

1. Right-click bookmark
2. Select "Move to Folder"
3. Choose target folder from quick pick

**Drag and Drop:**

- Drag bookmarks or folders to reorder
- Drop bookmarks into folders to organize

### List and Navigation

**List Current File Bookmarks:**

- Command Palette: `Filemarks: List Bookmarks in Current File`
- Shows all bookmarks in active file

**List All Bookmarks:**

- Command Palette: `Filemarks: List All Bookmarks`
- Shows bookmarks from entire workspace

### Bulk Operations

**Clear Current File:**

- Command Palette: `Filemarks: Clear Bookmarks in Current File`
- Removes all bookmarks from active file

**Clear All:**

- Command Palette: `Filemarks: Clear All Bookmarks`
- Removes all bookmarks from workspace (with confirmation)

## Configuration

Open VS Code settings and search for "filemarks":

### Storage Location

```json
"filemarks.saveBookmarksInProject": true
```

- `true`: Save in project's `.vscode/filemarks.json` (default)
- `false`: Save in global storage

### Navigation Behavior

```json
"filemarks.navigateThroughAllFiles": true
```

- `true`: Jump across all files (default)
- `false`: Only navigate within current file

### Warning Messages

```json
"filemarks.showBookmarkNotDefinedWarning": true
```

- `true`: Show warning when jumping to undefined bookmark (default)
- `false`: Silent when bookmark doesn't exist

### Cursor Position

```json
"filemarks.revealLocation": "center"
```

- `"center"`: Position cursor at center when jumping (default)
- `"top"`: Position cursor at top

### Gutter Icon Colors

```json
"filemarks.gutterIconFillColor": "#157EFB",
"filemarks.gutterIconNumberColor": "#FFFFFF"
```

Customize bookmark icon appearance in editor gutter.

## Keyboard Shortcuts

### Windows/Linux

| Action               | Shortcut           |
| -------------------- | ------------------ |
| Toggle Bookmark 0-9  | `Ctrl+Shift+[0-9]` |
| Jump to Bookmark 0-9 | `Ctrl+[0-9]`       |

### macOS

| Action               | Shortcut          |
| -------------------- | ----------------- |
| Toggle Bookmark 0-9  | `Cmd+Shift+[0-9]` |
| Jump to Bookmark 0-9 | `Cmd+[0-9]`       |

## Commands

Access via Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- `Filemarks: Toggle Bookmark [0-9]`
- `Filemarks: Jump to Bookmark [0-9]`
- `Filemarks: List Bookmarks in Current File`
- `Filemarks: List All Bookmarks`
- `Filemarks: Create Folder`
- `Filemarks: Clear Bookmarks in Current File`
- `Filemarks: Clear All Bookmarks`

Context menu commands (right-click in TreeView):

- `Go to Bookmark`
- `Rename Bookmark`
- `Move to Folder`
- `Delete Bookmark`
- `Rename Folder`
- `Delete Folder`

## TreeView

The Filemarks TreeView appears in the Activity Bar:

- Hierarchical view of folders and bookmarks
- Click bookmark to jump to location
- Drag and drop support for organization
- Context menu for all operations
- Expandable/collapsible folders

## Output Channel

View detailed logs in Output panel:

1. Open Output panel: `View > Output`
2. Select "Filemarks" from dropdown
3. See file operations, errors, and debug info

## Data Storage

### Project Storage (default)

Bookmarks saved in `.vscode/filemarks.json` within your project.

**Advantages:**

- Share bookmarks with team via version control
- Project-specific bookmarks
- Backup with project files

### Global Storage

Bookmarks saved in VS Code's global storage directory.

**Advantages:**

- Bookmarks persist across projects
- Single workspace for all bookmarks
- Not committed to version control

## Known Issues

- File rename detection has limitations in certain scenarios
- Drag and drop doesn't support multi-selection yet

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/gyuha/vscode-filemarks).

## License

MIT License - see LICENSE file for details.

## Author

**Gyuha** - [GitHub](https://github.com/gyuha)

---

**Enjoy organizing your code navigation with Filemarks!**
