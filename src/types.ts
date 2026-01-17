/**
 * Union type representing either a folder or bookmark node in the tree structure.
 */
export type TreeNode = FolderNode | BookmarkNode;

/**
 * Represents a folder that can contain bookmarks and other folders.
 */
export interface FolderNode {
  /** Discriminator for type narrowing */
  type: 'folder';
  /** Unique identifier (UUID) */
  id: string;
  /** Display name of the folder */
  name: string;
  /** Child nodes (folders and bookmarks) */
  children: TreeNode[];
  /** Whether the folder is expanded in the tree view */
  expanded?: boolean;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last modification */
  updatedAt: string;
}

/**
 * Represents a bookmark pointing to a file with numbered line markers.
 */
export interface BookmarkNode {
  /** Discriminator for type narrowing */
  type: 'bookmark';
  /** Unique identifier (UUID) */
  id: string;
  /** Optional custom label for the bookmark */
  label?: string;
  /** Workspace-relative path to the bookmarked file */
  filePath: string;
  /** Map of bookmark number (0-9) to line number (0-based) */
  numbers: Record<number, number>;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last modification */
  updatedAt: string;
}

/**
 * Root state object persisted to storage.
 */
export interface FilemarkState {
  /** Schema version for migration support */
  version: string;
  /** Top-level tree nodes (folders and bookmarks) */
  items: TreeNode[];
}

/**
 * Type guard to check if a node is a FolderNode.
 * @param node - The tree node to check
 * @returns True if the node is a FolderNode
 */
export function isFolderNode(node: TreeNode): node is FolderNode {
  return node.type === 'folder';
}

/**
 * Type guard to check if a node is a BookmarkNode.
 * @param node - The tree node to check
 * @returns True if the node is a BookmarkNode
 */
export function isBookmarkNode(node: TreeNode): node is BookmarkNode {
  return node.type === 'bookmark';
}
