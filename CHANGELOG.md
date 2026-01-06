# Change Log

All notable changes to the "filemarks" extension will be documented in this file.

## [0.8.0] - 2025-01-07

### Added

- **Smart Folder Memory**: New bookmarks are automatically added to the last used folder
  - Clicking a folder or bookmark in sidebar records the current folder context
  - Drag & drop operations update the last used folder
  - New bookmarks created via keyboard shortcuts are placed in the remembered folder
- **Context-Aware Folder Creation**: Right-click "Create Folder" on a folder now creates a subfolder inside it

### Changed

- **Title Bar Create Folder**: Creates folder in the last selected folder location (instead of always at root)

---

## [0.7.0] - 2025-01-07

### Changed

- **Activity Bar Icon**: New custom bookmark icon with `#` symbol for better recognition
- **Context Menu**: Removed "Filemarks:" prefix from context menu items for cleaner display (Command Palette still shows "Filemarks: ..." via category)

---

## [0.6.0] - 2025-01-06

### Added

- **Drag to Editor**: Drag bookmarks from sidebar to editor area to open files
- **Drop on Bookmark**: Drop a bookmark onto another bookmark to move it to the same folder

### Changed

- **File Icons**: Sidebar now displays file-type icons from your VS Code icon theme instead of generic bookmark icons
- **Tree Indent**: Reduced tree view indentation from 16px to 8px for a more compact layout
- **Navigation Default**: Changed `navigateThroughAllFiles` default to `false` - Previous/Next bookmark now navigates within current file by default

### Fixed

- **Consistent Indentation**: Fixed inconsistent left margin for files in the same folder

---

## [0.5.0] - 2025-01-06

### Added

- **Welcome Message**: TreeView now displays helpful quick start instructions when no bookmarks exist
- **Navigate Between Bookmarks**: New commands to jump to previous/next bookmark across all files
  - `Ctrl+Alt+[` (Windows/Linux) or `Cmd+Alt+[` (macOS) - Jump to previous bookmark
  - `Ctrl+Alt+]` (Windows/Linux) or `Cmd+Alt+]` (macOS) - Jump to next bookmark
- **Cross-File Navigation**: New setting `navigateThroughAllFiles` to enable jumping to bookmarks across all files (default: true)
- **Auto-Initialize**: Creates `.vscode/filemarks.json` automatically when extension activates

---

## [0.4.0] - 2025-01-05

### Changed

- **Marker Color**: Updated default gutter icon colors for better visibility
  - Fill color changed from `#E74C3C` (red) to `#FBC74F` (yellow/gold)
  - Number color changed from `#FFFFFF` (white) to `#A05A14` (brown)

---

## [0.3.0] - 2025-01-05

### Initial Release

#### Core Features

- **Numbered Bookmarks (0-9)**: Quick access to 10 bookmarks per file using keyboard shortcuts
  - Toggle bookmarks: `Ctrl+Shift+0-9` (Windows/Linux) or `Cmd+Shift+0-9` (Mac)
  - Jump to bookmarks: `Ctrl+0-9` (Windows/Linux) or `Cmd+0-9` (Mac)
  - Jump only within current file

#### Visual Features

- **Gutter Icons**: Bookmark-shaped icons with numbers displayed in editor gutter
  - Red bookmark background (`#E74C3C`) with white number (`#FFFFFF`)
  - Customizable colors via settings
  - Small size (8x8px) with 5.5px font

#### Organization

- **TreeView**: Hierarchical view of bookmarks in Activity Bar
  - Create folders to organize bookmarks
  - Drag and drop bookmarks between folders
  - Context menu for all operations
  - Folder hierarchy for complex projects

#### Bookmark Management

- **Custom Labels**: Rename bookmarks with descriptive names
- **Toggle Logic**: Replace existing number at line when setting new bookmark
- **Folder Operations**: Move bookmarks to folders via context menu or drag-drop

#### Smart Features

- **Sticky Bookmarks**: Automatically adjust line numbers when editing
- **Auto-cleanup**:
  - Remove bookmarks when files are deleted
  - Remove invalid bookmarks on load
  - Remove bookmarks for lines that no longer exist on save
- **File Rename Support**: Update bookmark paths when files are renamed
- **Corrupted Data Recovery**: Automatic backup and recovery of bookmark data

#### Storage

- **Per-workspace Storage**: Saved in `.vscode/filemarks.json` by default
- **Configuration Option**: Toggle between project storage and global storage
  - `filemarks.saveBookmarksInProject`: true (default) or false

#### Internationalization

- English support
- Korean (한국어) support

#### Configuration

| Setting                         | Type    | Default                                                         | Description |
| ------------------------------- | ------- | --------------------------------------------------------------- | ----------- |
| `saveBookmarksInProject`        | boolean | `true` - Save in `.vscode/filemarks.json`                       |
| `showBookmarkNotDefinedWarning` | boolean | `true` - Show warning for undefined bookmarks                   |
| `revealLocation`                | string  | `"center"` - Cursor position after jump (`"top"` or `"center"`) |
| `gutterIconFillColor`           | string  | `"#E74C3C"` - Bookmark icon background                          |
| `gutterIconNumberColor`         | string  | `"#FFFFFF"` - Bookmark icon number                              |

#### Commands

| Command                         | Description                          |
| ------------------------------- | ------------------------------------ |
| Toggle Bookmark [0-9]           | Set/unset numbered bookmark          |
| Jump to Bookmark [0-9]          | Navigate to bookmark in current file |
| List Bookmarks in Current File  | Show all bookmarks in active file    |
| List All Bookmarks              | Show all bookmarks from workspace    |
| Create Folder                   | Create organization folder           |
| Delete Folder                   | Delete folder and its contents       |
| Rename Folder                   | Rename folder                        |
| Move to Folder                  | Move bookmark to folder              |
| Rename Bookmark                 | Change bookmark label                |
| Delete Bookmark                 | Remove bookmark                      |
| Clear Bookmarks in Current File | Remove all bookmarks from file       |
| Clear All Bookmarks             | Remove all bookmarks from workspace  |

#### UI/UX

- TreeView indent: 16px (wider spacing)
- Hover delay: 250ms (faster tooltips)
- Folder tooltips disabled
- Badges showing bookmark count

#### Technical

- TypeScript with strict typing
- Event-driven architecture with EventEmitter
- Debounced file operations (500ms)
- ESBuild for production bundling
- VSCode Extension API v1.85.0+
- LSP integration for diagnostics

---

## Version History

- **0.8.0** - 2025-01-07 - Smart folder memory, context-aware folder creation
- **0.7.0** - 2025-01-07 - Custom activity bar icon, cleaner context menu
- **0.6.0** - 2025-01-06 - Drag to editor, file icons, drop on bookmark, navigation default change
- **0.5.0** - 2025-01-06 - Added welcome message, cross-file bookmark navigation
- **0.4.0** - 2025-01-05 - Changed marker colors
- **0.3.0** - 2025-01-05 - Initial release
