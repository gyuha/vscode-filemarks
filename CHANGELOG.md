# Change Log

All notable changes to the "filemarks" extension will be documented in this file.

## [Unreleased]

### Added

- Initial release of Filemarks
- Numbered bookmarks (0-9) with keyboard shortcuts
- Folder organization for bookmarks
- TreeView with drag and drop support
- Bookmark labeling and renaming
- List commands for current file and all bookmarks
- Sticky bookmarks (auto-adjust line numbers)
- File deletion/rename tracking
- Clear current file and clear all commands
- Internationalization support (English and Korean)
- Configurable storage location (project vs global)
- Configurable cursor reveal location (top/center)
- Configurable warning messages
- Gutter icon customization
- Output channel for logging
- Corrupted data recovery with backup

### Configuration Options

- `filemarks.saveBookmarksInProject`: Choose storage location
- `filemarks.navigateThroughAllFiles`: Navigation scope
- `filemarks.showBookmarkNotDefinedWarning`: Toggle warning messages
- `filemarks.revealLocation`: Cursor position when jumping
- `filemarks.gutterIconFillColor`: Customize icon background
- `filemarks.gutterIconNumberColor`: Customize icon number color

### Keyboard Shortcuts

- `Ctrl+Shift+[0-9]` / `Cmd+Shift+[0-9]`: Toggle bookmark
- `Ctrl+[0-9]` / `Cmd+[0-9]`: Jump to bookmark

### Commands

- Toggle Bookmark 0-9
- Jump to Bookmark 0-9
- List Bookmarks in Current File
- List All Bookmarks
- Create Folder
- Delete Folder
- Rename Folder
- Move to Folder
- Rename Bookmark
- Delete Bookmark
- Clear Bookmarks in Current File
- Clear All Bookmarks
- Go to Bookmark (from TreeView)

### Features

- TreeView in Activity Bar
- Context menu operations
- Drag and drop support
- Folder hierarchy
- Auto-cleanup on file operations
- Data corruption recovery
- Multi-language support

## [0.1.0] - Initial Development

### Development Phases

- **Phase 1 (MVP)**: Core bookmark functionality with numbered shortcuts
- **Phase 2**: TreeView, navigation, and folder management
- **Phase 3**: Advanced features (drag-drop, sticky bookmarks, move to folder)
- **Phase 4**: Polish (configuration, error handling, i18n, documentation)

### Technical Implementation

- TypeScript with strict typing
- Event-driven architecture
- Debounced file operations
- LSP integration for diagnostics
- ESBuild for bundling
- VSCode Extension API integration

---

## Version History

- **0.1.0** - Initial release (in development)
