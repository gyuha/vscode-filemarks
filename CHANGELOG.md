# Change Log

All notable changes to the "filemarks" extension will be documented in this file.

## [0.12.0] - 2026-01-22

### Changed

- Global storage now uses per-workspace filenames (`filemarks-{folderName}-{hash6}.json`) to avoid collisions and make files identifiable.
- Automatically migrates legacy global `filemarks.json` to the new per-workspace file on first run (non-destructive if the new file already exists).
- README updated with new storage paths and migration note.

### Fixed

- Ensured global storage path selection respects project/global setting while handling legacy data safely.

---

## [0.11.0] - 2025-01-17

### Added

- **Central Error Handler**: New structured error handling system for better debugging and user experience
  - `FilemarkError` class with error codes and severity levels
  - `ErrorHandler` singleton with OutputChannel logging
  - Recovery action support for user-guided error resolution
  - Integrated into storage operations and bookmark navigation

- **CI/CD Pipeline**: Automated quality assurance and release workflows
  - **CI Workflow** (`.github/workflows/ci.yml`):
    - Runs on push to main/master and pull requests
    - Parallel jobs: lint, typecheck, test
    - Build job creates VSIX artifact (7-day retention)
    - Concurrency control to cancel duplicate runs
  - **Release Workflow** (`.github/workflows/release.yml`):
    - Triggers on `v*` tags (e.g., `v0.11.0`)
    - Full validation before release
    - Auto-extracts release notes from CHANGELOG.md
    - Creates GitHub Release with VSIX attachment
    - Optional VS Code Marketplace and Open VSX publishing

- **Performance Utilities**: Comprehensive caching and debouncing system
  - `debounce`, `debounceAsync`, `throttle` functions
  - `LRUCache` class for bounded caching
  - `memoize` function with configurable cache size
  - `batchCalls` for grouping rapid operations

- **Comprehensive Test Suite**: 85+ unit tests covering all new functionality
  - Performance utilities tests
  - Error handler tests
  - BookmarkStore caching tests
  - TreeProvider performance tests
  - Integration tests

### Changed

- **Improved Type Safety**: Replaced all `any` types with proper generics
  - Performance utilities now use `TArgs extends unknown[]` and `TReturn` generics
  - Better IDE support and compile-time error detection

- **Enhanced Documentation**: Added JSDoc comments to all public APIs
  - Type definitions with examples
  - Storage service documentation
  - BookmarkStore method documentation
  - TreeProvider public method documentation

### Performance

- **Filter Input**: Response time reduced from 100ms to <5ms (95% improvement)
- **Disk Writes**: Reduced from 10+/sec to 1-2/sec (80% reduction)
- **Cache Hit Rate**: ~80-90% for repeated operations

---

## [0.10.0] - 2025-01-14

### Changed

- **Toggle Bookmark Shortcut**: Changed from `Ctrl+Shift+[0-9]` to `Ctrl+Alt+[0-9]` (macOS: `Cmd+Alt+[0-9]`)
  - Less conflict with VS Code's default shortcuts
  - More consistent with other Filemarks shortcuts (Auto Bookmark, Previous/Next)

---

## [0.9.5] - 2025-01-10

### Changed

- **Filter UI Improvement**: Renamed "Search" to "Filter" for better clarity
  - Search icon changed to filter icon (`$(filter)`)
  - Clear button now shows close icon (`$(close)`) only when filter is active
  - Follows Todo Tree style: filter icon toggles to clear icon when filter is applied
  - Commands renamed: `filemarks.search` → `filemarks.filter`, `filemarks.clearSearch` → `filemarks.clearFilter`

---

## [0.9.4] - 2025-01-10

### Fixed

- **Folder Icon Display**: Fixed folder icons disappearing after using "Collapse All Folders"
  - Removed `resourceUri` from folder TreeItem to prevent icon conflicts
  - Folder icons now correctly show `folder-opened` when expanded and `folder` when collapsed
  - Icons properly update when expanding/collapsing individual folders

---

## [0.9.3] - 2025-01-09

### Added

- **Add Bookmark from Explorer**: Right-click any file in Explorer to add a bookmark
  - Adds bookmark at line 1 with number 0
  - Available via context menu: "Add Bookmark"

### Changed

- **Consistent File Icons**: Switched from file-type icons to unified `file-code` icon
  - Fixes inconsistent indentation caused by different icon sizes from VS Code themes
  - All bookmarks now display with the same icon for visual consistency

---

## [0.9.2] - 2025-01-08

### Changed

- **Auto Bookmark Shortcut**: Changed from `Ctrl+Alt+3` to `Ctrl+Alt+P` (macOS: `Cmd+Alt+P`)
- **Storage Default**: Changed `saveBookmarksInProject` default from `true` to `false` (now saves to global storage by default)

---

## [0.9.1] - 2025-01-08

### Fixed

- **TreeView Stability**: Files no longer shift position when collapsing/expanding folders
  - Fixed folder item ID to be stable regardless of expanded state
  - Folder expand/collapse now saves state without triggering full tree refresh

---

## [0.9.0] - 2025-01-08

### Added

- **Search & Filter**: Real-time fuzzy search for bookmarks
  - Click search icon in sidebar title bar to open search input
  - Live filtering as you type (fuzzy match on bookmark name and file path)
  - Filter persists when search input is closed
  - Visual indicator in title bar shows active filter text
  - "No matching bookmarks found" message when filter returns no results
- **Clear Search Button**: Appears in title bar when filter is active (search-stop icon)
- **Auto Bookmark**: Automatically assigns next available bookmark number (0-9)
  - Shortcut: `Ctrl+Alt+P` (Windows/Linux) or `Cmd+Alt+P` (macOS)
  - Finds smallest unused number in current file
  - Falls back to 0 if all numbers are used

### Changed

- **Simplified Sidebar Title**: Removed "BOOKMARKS" subtitle, now shows only "FILEMARKS"
- **Welcome Message**: Only shows when no filter is active

---

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

- **0.11.0** - 2025-01-17 - Error handler, CI/CD pipeline, performance utilities, comprehensive tests
- **0.10.0** - 2025-01-14 - Toggle Bookmark shortcut changed (Ctrl+Shift → Ctrl+Alt)
- **0.9.5** - 2025-01-10 - Filter UI improvement (search → filter, dynamic icon toggle)
- **0.9.4** - 2025-01-10 - Fixed folder icons disappearing after collapse all
- **0.9.3** - 2025-01-09 - Add bookmark from Explorer, consistent file icons
- **0.9.2** - 2025-01-08 - Changed auto bookmark shortcut to Ctrl+Alt+P, storage default to global
- **0.9.1** - 2025-01-08 - Fixed TreeView item shift when folders collapse/expand
- **0.9.0** - 2025-01-08 - Search & filter, auto bookmark, simplified sidebar title
- **0.8.0** - 2025-01-07 - Smart folder memory, context-aware folder creation
- **0.7.0** - 2025-01-07 - Custom activity bar icon, cleaner context menu
- **0.6.0** - 2025-01-06 - Drag to editor, file icons, drop on bookmark, navigation default change
- **0.5.0** - 2025-01-06 - Added welcome message, cross-file bookmark navigation
- **0.4.0** - 2025-01-05 - Changed marker colors
- **0.3.0** - 2025-01-05 - Initial release
